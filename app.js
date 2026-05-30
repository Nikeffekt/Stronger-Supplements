/* ============================================================
   app.js – SupplAI App-Logik
   Enthält: Navigation, Login, Profil, Empfehlungs-Engine,
            Wirkstoff-Popup, Toast, Reset, Init,
            Produkte-Adapter (lädt produkte.json)
   Benötigt: quiz.js (muss vorher geladen sein)
============================================================ */

// ── PRODUKT-DATENBANK ──
// Wird beim Start aus data/produkte.json geladen (siehe ladeProdukte())
// Struktur nach Laden: { 'kreatin': { hauptprodukt: {...}, alternativen: [...] }, ... }
var DB = {};

// ── GLOBALER STATE ──
var abgewaehlt    = {};  // { suppId: true } – abgewählte Produkte
var aufgeklappteAlts = {};
var gewaehlteAlts = {};  // { suppId: altIndex }
var aktivTab      = 'essential';
var meinStack     = {};  // { suppId: { prod, preis } } – gewählter Stack


// ── JSON → DB ADAPTER ──
// Wandelt die produkte.json Struktur (10 gleichwertige Anbieter)
// in die App-Struktur um (1 Hauptprodukt + Alternativen + alle)
//
// Mapping: JSON-Keys → App-Keys (falls abweichend)
var JSON_KEY_MAP = {
  'omega_3':         'omega3',
  'vitamin_d3_k2':   'vitamin_d3',
  'eaa_bcaa':        'eaas',
  'grüner_tee_egcg': 'gruener_tee',
};

// Mapping: marktposition → segment (für getPersonalisierteAlts)
var SEGMENT_MAP = {
  'DACH #1 Premium':              'dach_premium',
  'Studio-Distribution DACH':     'dach_premium',
  'Global Masse / Preis-Leistung':'preis_leistung',
  'Budget Global':                'preis_leistung',
  'Wachstum CEE / Preisjäger':    'budget_cee',
  'Functional EU / CEE Leader':   'functional',
  'Globaler Bestseller':          'reviews_global',
  'Review-König EU':              'eu_reviews',
  'Premium / Medical Grade':      'premium_medical',
  'Medical Grade / Biohacker':    'medical_grade',
  'Tradition & Qualität EU':      'tradition',
  'Trend / Functional':           'trend',
};

// Allergen-Filter je Wirkstoff (gilt für alle Anbieter dieses Wirkstoffs)
var WIRKSTOFF_FILTER = {
  'whey_protein':   ['laktose'],
  'omega3':         ['fisch'],
  'kollagen':       ['tierisch'],
  'eaas':           [],
  'omega3_vegan':   [],
  'pflanzenprotein':[],
  'iso_clear':      [],   // laktosefrei per Definition
};

function preisBereinigen(preisStr) {
  if (!preisStr) return '0,00';
  var m = preisStr.match(/(\d+[,\.]\d+)/);
  if (m) return m[1].replace('.', ',');
  var m2 = preisStr.match(/(\d+)/);
  return m2 ? m2[1] + ',00' : '0,00';
}

function ratingBereinigen(ratingStr) {
  if (!ratingStr) return '4.5 ★';
  return ratingStr.replace(',', '.');
}

function tagsAusAnbieter(anbieter) {
  var tags = [];
  if (anbieter.trigger) {
    anbieter.trigger.split(',').forEach(function (t) {
      t = t.trim();
      if (t && tags.length < 2) tags.push(t);
    });
  }
  if (tags.length < 2 && anbieter.zertifikat) tags.push(anbieter.zertifikat);
  if (tags.length < 3 && anbieter.empfehlung)  tags.push(anbieter.empfehlung.split(' – ')[0]);
  return tags.slice(0, 3);
}

function segmentAusAnbieter(anbieter) {
  var mp = anbieter.marktposition || '';
  // Exakter Match
  if (SEGMENT_MAP[mp]) return SEGMENT_MAP[mp];
  // Fuzzy Match
  var keys = Object.keys(SEGMENT_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (mp.indexOf(keys[i]) >= 0) return SEGMENT_MAP[keys[i]];
  }
  return 'other';
}

function anbieterZuProdukt(anbieter, appKey) {
  return {
    marke:   anbieter.name    || '–',
    name:    anbieter.produkt || '–',
    preis:   preisBereinigen(anbieter.preis_paket || anbieter.preis || ''),
    rating:  ratingBereinigen(anbieter.bewertung  || ''),
    tags:    tagsAusAnbieter(anbieter),
    segment: segmentAusAnbieter(anbieter),
    filter:  WIRKSTOFF_FILTER[appKey] || [],
  };
}

function bauDB(jsonDaten) {
  var wirkstoffe = jsonDaten && jsonDaten.wirkstoffe;
  if (!wirkstoffe) {
    console.warn('produkte.json: Keine Wirkstoffe gefunden.');
    return;
  }

  Object.keys(wirkstoffe).forEach(function (jsonKey) {
    var wirkstoff = wirkstoffe[jsonKey];
    if (!wirkstoff.anbieter || !wirkstoff.anbieter.length) return;

    var appKey = JSON_KEY_MAP[jsonKey] || jsonKey;
    var alleProdukte = wirkstoff.anbieter.map(function (a) {
      return anbieterZuProdukt(a, appKey);
    });

    DB[appKey] = {
      hauptprodukt: alleProdukte[0],
      alternativen: alleProdukte.slice(1),
      alle:         alleProdukte,   // für getPersonalisierteAlts
    };
  });

  console.log('✅ DB geladen: ' + Object.keys(DB).length + ' Wirkstoffe');
}


// ── PERSONALISIERTE ALTERNATIVEN ──
// Wählt bis zu 5 kompatible Produkte – gefiltert und nach Profil priorisiert
function getPersonalisierteAlts(suppId, a) {
  var db = DB[suppId];
  if (!db || !db.alle) return [];

  var unvert      = a.unvertraeglichkeiten || ['A'];
  var ernaehrung  = a.ernaehrung || 'A';
  var vegan       = ernaehrung === 'D';
  var vegetarisch = ernaehrung === 'C' || ernaehrung === 'D';
  var hatLaktose  = unvert.indexOf('B') >= 0;
  var hatFisch    = unvert.indexOf('C') >= 0;
  var hatGluten   = unvert.indexOf('D') >= 0;
  var hatSoja     = unvert.indexOf('E') >= 0;
  var alter       = a.intro || 'C';
  var ziele       = a.ziele || [];
  var erfahrung   = a.erfahrung || 'einsteiger';
  var fett        = ziele.indexOf('B') >= 0;
  var mu          = ziele.indexOf('A') >= 0;
  var health      = ziele.indexOf('F') >= 0;

  // Strenger Allergen-Filter
  function istKompatibel(p) {
    var f = p.filter || [];
    if (hatLaktose && f.indexOf('laktose')   >= 0) return false;
    if (hatFisch   && f.indexOf('fisch')     >= 0) return false;
    if (hatGluten  && f.indexOf('gluten')    >= 0) return false;
    if (hatSoja    && f.indexOf('soja')      >= 0) return false;
    if (vegan      && f.indexOf('tierisch')  >= 0) return false;
    if (vegetarisch && f.indexOf('gelatine') >= 0) return false;
    if (vegetarisch && f.indexOf('fisch')    >= 0) return false;
    return true;
  }

  var alle = db.alle.filter(istKompatibel);
  if (alle.length === 0) return [];

  function findSeg(seg) {
    for (var i = 0; i < alle.length; i++) {
      if (alle[i].segment === seg) return alle[i];
    }
    return null;
  }

  // Slot 1: Bestes Produkt nach Profil
  var best = null;
  if (vegan)                                              best = findSeg('trend') || findSeg('premium_medical');
  else if ((erfahrung === 'profi' || erfahrung === 'fortgeschritten') && mu) best = findSeg('premium_medical') || findSeg('medical_grade');
  else if (fett)                                          best = findSeg('functional') || findSeg('premium_medical');
  else if (health && (alter === 'D' || alter === 'E'))    best = findSeg('medical_grade') || findSeg('premium_medical');
  else if (erfahrung === 'einsteiger')                    best = findSeg('preis_leistung');
  if (!best) best = findSeg('dach_premium') || alle[0];

  // Slot 2: Trend passend zur Altersklasse
  var trend = null;
  if (alter === 'A' || alter === 'B')      trend = findSeg('budget_cee') || findSeg('trend');
  else if (alter === 'C')                  trend = findSeg('trend') || findSeg('functional');
  else if (alter === 'D' || alter === 'E') trend = findSeg('medical_grade') || findSeg('tradition');
  if (!trend) trend = findSeg('trend') || alle[Math.min(3, alle.length - 1)];

  // Slot 3–5: DACH Premium / Preis-Leistung / Reviews
  var dach    = findSeg('dach_premium')   || alle[0];
  var preis   = findSeg('preis_leistung') || alle[1];
  var reviews = findSeg('reviews_global') || findSeg('eu_reviews') || alle[2];

  // Deduplizieren und auf max. 5 begrenzen
  var result = [], seen = [];
  function addIfNew(p) {
    if (!p) return;
    var key = p.marke + '|' + p.name;
    if (seen.indexOf(key) < 0) { seen.push(key); result.push(p); }
  }
  addIfNew(best);
  addIfNew(trend);
  addIfNew(dach);
  addIfNew(preis);
  addIfNew(reviews);
  for (var i = 0; i < alle.length && result.length < 5; i++) addIfNew(alle[i]);

  return result;
}

function ladeProdukte() {
  // Lädt produkte.json und befüllt die DB
  // Fallback: DB bleibt leer → Popup zeigt Hinweis
  fetch('produkte.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (daten) {
      bauDB(daten);
    })
    .catch(function (err) {
      console.warn('produkte.json konnte nicht geladen werden:', err);
      console.warn('Stelle sicher dass die Datei unter data/produkte.json liegt.');
    });
}

// ── LABEL MAPS ──
var ALT  = { A: '<18', B: '18–25', C: '26–35', D: '36–45', E: '>45' };
var TRG  = { A: 'Kraft 4+/Wo', B: 'Kraft 2–3/Wo', C: 'Cardio', D: 'Mix', E: 'Wenig Sport' };
var ERN  = { A: 'Omnivor', B: 'Flexitarisch', C: 'Vegetarisch', D: 'Vegan' };
var GES  = { A: 'Männlich', B: 'Weiblich', C: 'Keine Angabe' };
var ZIEL = { A: '💪 Muskelaufbau', B: '🔥 Fettabbau', C: '⚡ Energie', D: '🏃 Ausdauer', E: '😴 Regeneration', F: '❤️ Gesundheit' };


// ── NAVIGATION ──
// Blendet alle Screens aus und zeigt den gewünschten Screen
function zeige(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('on');
  });
  var el = document.getElementById(id);
  if (el) { el.classList.add('on'); window.scrollTo(0, 0); }
}


// ── WIRKSTOFF-ERKLÄRUNGEN ──
// Kurze, verständliche Beschreibungen für das Popup
var ERKLAERUNG = {
  'vitamin_d3':    'Vitamin D ist entscheidend für Immunsystem, Hormonsynthese und Knochengesundheit. Über 60% der Menschen in Mitteleuropa sind mangelhaft versorgt – besonders im Winter.',
  'omega3':        'Omega-3 Fettsäuren (EPA/DHA) reduzieren Entzündungen, verbessern Herzgesundheit und beschleunigen die Muskelregeneration nach dem Training.',
  'omega3_vegan':  'Algenöl liefert die gleichen EPA/DHA-Fettsäuren wie Fischöl – rein pflanzlich, nachhaltig und ohne Fischgeschmack. Ideal für Veganer und bei Fischallergie.',
  'magnesium':     'Magnesium ist an über 300 Enzymprozessen beteiligt. Sportler verlieren mehr durch Schwitzen – Bisglycinat ist die bioverfügbarste Form und fördert Tiefschlaf.',
  'whey_protein':  'Protein ist der wichtigste Baustein für Muskeln. Ohne ausreichend Protein (ca. 1,6–2g/kg) können Muskeln nicht aufgebaut werden – egal wie intensiv das Training ist.',
  'iso_clear':     'Whey Isolat ist nahezu laktosefrei und enthält über 86% Protein. Als klarer Drink besonders beliebt in der Definitionsphase oder bei Laktoseintoleranz.',
  'pflanzenprotein':'Pflanzenprotein aus Erbse und Reis liefert alle essentiellen Aminosäuren. Ideal für Veganer und schützt Muskelmasse genauso effektiv wie Whey.',
  'kreatin':       'Kreatin ist das am besten erforschte Supplement überhaupt – über 500 Studien belegen 5–15% Kraftsteigerung. Sicher, günstig und wirkt bei jedem zuverlässig.',
  'vitamin_b12':   'B12 kommt natürlich nur in tierischen Produkten vor. Bei veganer Ernährung ist eine Supplementierung medizinisch notwendig – schützt Nervensystem und Blutbildung.',
  'eisen':         'Eisenmangel ist der häufigste Nährstoffmangel weltweit und betrifft besonders Frauen. Eisen ist entscheidend für Sauerstofftransport und Energiestoffwechsel.',
  'ashwagandha':   'Ashwagandha KSM-66 senkt Cortisol nachweislich um 20–30% und verbessert Schlafqualität sowie Stressresistenz. Klinisch belegt und gut verträglich.',
  'l_carnitin':    'L-Carnitin transportiert Fettsäuren in die Mitochondrien zur Energiegewinnung. Besonders wirksam bei aerobem Training und unterstützt den Fettabbau.',
  'beta_alanin':   'Beta-Alanin erhöht den Carnosin-Spiegel in Muskeln und puffert Laktat. Das verzögert Muskelermüdung bei hochintensiver Belastung um bis zu 25%.',
  'elektrolyte':   'Elektrolyte ersetzen Natrium, Kalium und Magnesium die beim Schwitzen verloren gehen. Schützt vor Krämpfen, Leistungsabfall und hält die Hydration aufrecht.',
  'vitamin_c':     'Vitamin C ist ein starkes Antioxidans, stärkt das Immunsystem und verbessert die Eisenaufnahme erheblich. Besonders wichtig in Diätphasen und bei intensivem Training.',
  'zink':          'Zink ist essentiell für Immunfunktion, Wundheilung und Hormonsynthese inklusive Testosteron. Sportler verlieren mehr Zink durch Schwitzen als Nichtsportler.',
  'kollagen':      'Kollagen Typ I+III stärkt Gelenke, Sehnen, Haut und Haare. Ab 30 Jahren sinkt die körpereigene Produktion – Supplementierung wirkt präventiv und regenerativ.',
  'eaas':          'Essentielle Aminosäuren (EAAs) können vom Körper nicht selbst hergestellt werden. Sie stimulieren die Muskelproteinsynthese optimal – ideal während dem Training.',
  'l_glutamin':    'L-Glutamin ist die häufigste Aminosäure im Körper und wird bei intensivem Training stark verbraucht. Unterstützt Darmgesundheit und Immunsystem.',
  'multivitamin':  'Ein Multivitamin schließt alltägliche Mikronährstofflücken in der Ernährung. Als Basisschutz besonders sinnvoll bei einseitiger Ernährung oder hohem Stresslevel.',
  'zma':           'ZMA – die Kombination aus Zink, Magnesium und Vitamin B6 – verbessert Schlaftiefe und unterstützt die hormonelle Regeneration nach intensivem Training.',
  'pre_workout':   'Pre-Workout Booster mit Koffein, Citrullin und Beta-Alanin steigern Fokus, Kraft und Ausdauer spürbar. Für intensives Krafttraining bei Fortgeschrittenen.',
  'curcumin':      'Curcumin BCM-95 ist ein starkes Antioxidans und reduziert Entzündungen – besonders wirksam für Gelenk-Recovery und als Anti-Aging-Supplement.',
  'probiotika':    'Probiotika verbessern die Nährstoffaufnahme und stärken das Immunsystem. Besonders wichtig bei intensivem Training und veganer Ernährung.',
  'melatonin':     'Melatonin unterstützt Einschlafen und Schlafrhythmus. Niedrig dosiert (0,5–1mg) ist effektiver als hohe Dosierungen – EU-Empfehlung: max. 1mg.',
  'hmb':           'HMB schützt Muskelmasse in der Diätphase und ist besonders wirksam für Fortgeschrittene und Sportler ab 40. Anti-kataboler Effekt gut belegt.',
};


// ── INGREDIENT OVERLAP MAP ──
// Verhindert Doppelempfehlungen (z.B. ZMA wenn Mg + Zink schon drin)
var INHALT = {
  'whey_protein':   ['protein'],
  'iso_clear':      ['protein'],
  'pflanzenprotein':['protein'],
  'kreatin':        ['kreatin'],
  'magnesium':      ['magnesium'],
  'omega3':         ['omega3'],
  'omega3_vegan':   ['omega3'],
  'vitamin_d3':     ['vitamin_d3', 'vitamin_k2'],
  'vitamin_b12':    ['vitamin_b12'],
  'eisen':          ['eisen'],
  'ashwagandha':    ['ashwagandha'],
  'l_carnitin':     ['l_carnitin'],
  'beta_alanin':    ['beta_alanin'],
  'elektrolyte':    ['elektrolyte', 'magnesium_trace'],
  'vitamin_c':      ['vitamin_c'],
  'zink':           ['zink'],
  'kollagen':       ['kollagen'],
  'eaas':           ['eaas'],
  'l_glutamin':     ['l_glutamin'],
  'multivitamin':   ['vitamin_c', 'zink', 'vitamin_d3', 'vitamin_b12', 'eisen', 'magnesium_trace', 'multivitamin'],
  'zma':            ['zink', 'magnesium', 'vitamin_b6'],
  'pre_workout':    ['koffein', 'beta_alanin', 'citrullin'],
  'curcumin':       ['curcumin'],
  'probiotika':     ['probiotika'],
  'melatonin':      ['melatonin'],
  'hmb':            ['hmb'],
};


// ── OVERLAP-AUFLÖSUNG ──
// Entfernt redundante Supplements wenn Wirkstoffe bereits anderweitig abgedeckt
function loesOverlaps(emps) {
  var del = {};

  // ZMA: wenn Mg + Zink einzeln schon da → ZMA raus
  if (emps.some(function (e) { return e.id === 'zma'; }) &&
      emps.some(function (e) { return e.id === 'magnesium'; }) &&
      emps.some(function (e) { return e.id === 'zink'; })) {
    del['zma'] = 'Zink + Magnesium bereits separat empfohlen';
  }

  // Beta-Alanin + Pre-Workout → Beta-Alanin raus (im Pre-Workout enthalten)
  if (emps.some(function (e) { return e.id === 'beta_alanin'; }) &&
      emps.some(function (e) { return e.id === 'pre_workout'; })) {
    del['beta_alanin'] = 'Im Pre-Workout bereits enthalten';
  }

  // Melatonin + Ashwagandha → Melatonin optional behalten
  if (emps.some(function (e) { return e.id === 'melatonin'; }) &&
      emps.some(function (e) { return e.id === 'ashwagandha'; })) {
    del['melatonin'] = 'Ashwagandha verbessert Schlaf ebenfalls – kombiniert nach Bedarf';
  }

  // Allgemeine Wirkstoff-Überschneidungen prüfen
  var prio = { essential: 0, empfohlen: 1, optional: 2 };
  var skip = ['multivitamin', 'elektrolyte', 'magnesium_trace'];

  for (var i = 0; i < emps.length; i++) {
    if (del[emps[i].id]) continue;
    for (var j = i + 1; j < emps.length; j++) {
      if (del[emps[j].id]) continue;
      var s1 = INHALT[emps[i].id] || [];
      var s2 = INHALT[emps[j].id] || [];
      for (var a = 0; a < s1.length; a++) {
        if (skip.indexOf(s1[a]) >= 0) continue;
        for (var b = 0; b < s2.length; b++) {
          if (skip.indexOf(s2[b]) >= 0) continue;
          if (s1[a] === s2[b]) {
            if (prio[emps[i].prioritaet] <= prio[emps[j].prioritaet]) {
              del[emps[j].id] = 'Wirkstoff bereits in ' + emps[i].name + ' enthalten';
            } else {
              del[emps[i].id] = 'Wirkstoff bereits in ' + emps[j].name + ' enthalten';
            }
          }
        }
      }
    }
  }

  return {
    empfehlungen: emps.filter(function (e) { return !del[e.id]; }),
    entfernt: emps.filter(function (e) { return del[e.id]; }).map(function (e) {
      return { id: e.id, name: e.name, grund: del[e.id] };
    })
  };
}


// ── EMPFEHLUNGS-ENGINE ──
// Kernlogik: berechnet personalisierten Supplement-Stack anhand der Quiz-Antworten
function berechneEmpfehlungen(a) {
  var z        = a.ziele || [];
  var vegan    = a.ernaehrung === 'D';
  var w        = a.geschlecht === 'B';
  var alter    = a.intro;
  var erfahrung = a.erfahrung || 'einsteiger';
  var kraft    = a.training === 'A' || a.training === 'B';
  var cardio   = a.training === 'C';
  var mix      = a.training === 'D';
  var wenig    = a.training === 'E';
  var vorh     = a.vorhanden || ['A'];
  var unvert   = a.unvertraeglichkeiten || ['A'];
  var meds     = a.medikamente || ['A'];
  var situation = a.situation || 'A';

  // Ziele
  var mu     = z.indexOf('A') >= 0;
  var fett   = z.indexOf('B') >= 0;
  var energie = z.indexOf('C') >= 0;
  var ausd   = z.indexOf('D') >= 0;
  var regen  = z.indexOf('E') >= 0;
  var health = z.indexOf('F') >= 0;

  // Unverträglichkeiten & Medikamente
  var hatLaktose  = unvert.indexOf('B') >= 0;
  var hatFisch    = unvert.indexOf('C') >= 0;
  var hatBlutverd = meds.indexOf('B') >= 0;
  var hatSchildd  = meds.indexOf('C') >= 0;
  var hatBlutdr   = meds.indexOf('D') >= 0;
  var hatNiere    = meds.indexOf('E') >= 0;
  var hatDiab     = meds.indexOf('F') >= 0;
  var hatAntiD    = meds.indexOf('G') >= 0;

  // Besondere Situationen
  var istSchwanger = situation === 'B';
  var istMeno      = situation === 'C';
  var istSchlaf    = situation === 'D';

  // Bereits vorhandene Supplements
  var hatProt  = vorh.indexOf('B') >= 0;
  var hatKreat = vorh.indexOf('C') >= 0;
  var hatVitD  = vorh.indexOf('D') >= 0;
  var hatO3    = vorh.indexOf('E') >= 0;
  var hatMg    = vorh.indexOf('F') >= 0;
  var hatB12   = vorh.indexOf('G') >= 0;

  var E = [];

  // ── SCHWANGERSCHAFT: spezielle Empfehlung ──
  if (istSchwanger) {
    return [
      { id: 'vitamin_d3',   prioritaet: 'essential', kategorie: 'gesundheit', name: 'Vitamin D3',    ikon: '☀️', fit_grund: 'Essentiell für Knochenentwicklung des Kindes' },
      { id: 'omega3_vegan', prioritaet: 'essential', kategorie: 'gesundheit', name: 'Omega-3 DHA',   ikon: '🐟', fit_grund: 'DHA für Gehirnentwicklung – Algenöl ist sicherste Quelle' },
      { id: 'magnesium',    prioritaet: 'empfohlen', kategorie: 'gesundheit', name: 'Magnesium',     ikon: '🌙', fit_grund: 'Gegen Wadenkrämpfe in der Schwangerschaft' },
      { id: 'vitamin_b12',  prioritaet: vegan ? 'essential' : 'empfohlen', kategorie: 'gesundheit', name: 'Vitamin B12', ikon: '🧪', fit_grund: 'Nervensystem-Entwicklung des Kindes' },
    ];
  }

  // ── ESSENTIALS ──

  // Vitamin D3 (fast immer empfohlen)
  if (!hatVitD) {
    E.push({
      id: 'vitamin_d3',
      prioritaet: 'essential',
      kategorie: 'gesundheit',
      name: 'Vitamin D3' + (hatBlutverd ? ' (nur D3!)' : '+K2'),
      ikon: '☀️',
      fit_grund: hatBlutverd
        ? 'NUR D3 ohne K2 wegen Blutverdünner – bitte Arzt konsultieren'
        : 'Über 60% der Bevölkerung mangelhaft versorgt'
    });
  }

  // Omega-3 (Vegan → Algenöl, Fischallergie → Algenöl)
  if (!hatO3) {
    var o3Id = (vegan || hatFisch) ? 'omega3_vegan' : 'omega3';
    E.push({
      id: o3Id,
      prioritaet: 'essential',
      kategorie: 'gesundheit',
      name: (vegan || hatFisch) ? 'Omega-3 Algenöl' : 'Omega-3',
      ikon: '🐟',
      fit_grund: hatFisch
        ? 'Algenöl wegen Fischallergie – identische EPA/DHA Wirkung'
        : 'Entzündungsreduktion + Herzgesundheit + Regeneration'
    });
  }

  // Magnesium (nicht bei Wenig-Sport)
  if (!hatMg && !wenig) {
    E.push({
      id: 'magnesium',
      prioritaet: 'essential',
      kategorie: 'gesundheit',
      name: 'Magnesium Bisglycinat',
      ikon: '🌙',
      fit_grund: kraft
        ? 'Intensives Training erhöht Mg-Verlust – Bisglycinat für beste Aufnahme'
        : 'Muskelentspannung, Schlaf und Nervensystem'
    });
  }

  // B12 (Veganer: medizinisch notwendig)
  if (vegan && !hatB12) {
    E.push({
      id: 'vitamin_b12',
      prioritaet: 'essential',
      kategorie: 'gesundheit',
      name: 'Vitamin B12',
      ikon: '🧪',
      fit_grund: 'Als Veganer medizinisch notwendig – nur in tierischen Produkten enthalten'
    });
  }

  // Protein (wenn nicht schon vorhanden und Sport aktiv)
  if (!hatProt && !wenig) {
    var pId = vegan ? 'pflanzenprotein' : (hatLaktose || erfahrung === 'profi' ? 'iso_clear' : 'whey_protein');
    var kg  = parseFloat(a.gewicht) || 75;
    var pb  = Math.round(kg * (mu && kraft ? 2 : mu ? 1.8 : 1.6));
    E.push({
      id: pId,
      prioritaet: 'essential',
      kategorie: 'performance',
      name: vegan ? 'Pflanzenprotein' : (hatLaktose ? 'ISO Clear (laktosefrei)' : 'Whey Protein'),
      ikon: '💪',
      fit_grund: 'Protein-Tagesziel: ' + pb + ' g – ohne Supplement kaum erreichbar'
    });
  }

  // Kreatin (Muskelaufbau + kein Nierenproblem)
  if (!hatKreat && (mu || kraft || (mix && mu)) && !hatNiere) {
    E.push({
      id: 'kreatin',
      prioritaet: 'essential',
      kategorie: 'performance',
      name: 'Kreatin Monohydrat',
      ikon: '⚡',
      fit_grund: '#1 evidenzbasiertes Supplement – 500+ Studien, 5–15% Kraftsteigerung'
    });
  }

  // ── EMPFOHLEN ──

  // Eisen (Frauen mit Ausdauer/Gesundheit, nicht unter 18)
  if (w && (ausd || health) && alter !== 'A') {
    E.push({
      id: 'eisen',
      prioritaet: 'empfohlen',
      kategorie: 'gesundheit',
      name: 'Eisen Bisglycinat',
      ikon: '🩸',
      fit_grund: 'Häufigster Mangel bei Frauen – Bisglycinat für beste Magenverträglichkeit'
    });
  }

  // Ashwagandha (Regeneration, Stress, Energie – nicht bei Schilddrüse/Antidepressiva)
  if ((regen || (mu && a.training === 'A') || energie || istSchlaf) && !hatSchildd && !hatAntiD) {
    E.push({
      id: 'ashwagandha',
      prioritaet: 'empfohlen',
      kategorie: 'wellbeing',
      name: 'Ashwagandha KSM-66',
      ikon: '🌿',
      fit_grund: 'Senkt Cortisol um 20–30%, verbessert Schlaf und Stressresistenz klinisch belegt'
    });
  }

  // L-Carnitin (Fettabbau)
  if (fett && !wenig) {
    E.push({
      id: 'l_carnitin',
      prioritaet: 'empfohlen',
      kategorie: 'performance',
      name: 'L-Carnitin',
      ikon: '🔥',
      fit_grund: 'Fettsäurentransport in Mitochondrien – optimiert Fettverbrennung beim Training'
    });
  }

  // Beta-Alanin + Elektrolyte (Ausdauer/Cardio)
  if ((ausd || cardio) && !wenig) {
    E.push({
      id: 'beta_alanin',
      prioritaet: 'empfohlen',
      kategorie: 'performance',
      name: 'Beta-Alanin',
      ikon: '🏃',
      fit_grund: 'Puffert Laktat – verzögert Muskelermüdung bei Ausdauerbelastung um 15–25%'
    });
    E.push({
      id: 'elektrolyte',
      prioritaet: 'empfohlen',
      kategorie: 'performance',
      name: 'Elektrolyte',
      ikon: '💧',
      fit_grund: 'Ersetzt Na+K+Mg bei Schwitzen – schützt vor Krämpfen und Leistungseinbruch'
    });
  }

  // ── OPTIONAL ──

  // Vitamin C
  if ((fett || health || w) && erfahrung !== 'einsteiger') {
    E.push({
      id: 'vitamin_c',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Vitamin C',
      ikon: '🍊',
      fit_grund: w
        ? 'Verbessert Eisenaufnahme erheblich'
        : 'Immunschutz + Antioxidans bei hohem Trainingsvolumen'
    });
  }

  // Zink
  if ((health || regen || (mu && !w)) && erfahrung !== 'einsteiger') {
    E.push({
      id: 'zink',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Zink',
      ikon: '🔷',
      fit_grund: !w
        ? 'Essentiell für Testosteron-Produktion – Sportler verlieren mehr durch Schwitzen'
        : 'Immunfunktion und Wundheilung'
    });
  }

  // EAAs (Profis, Muskelaufbau, Kraft)
  if (mu && kraft && erfahrung === 'profi' && !vegan) {
    E.push({
      id: 'eaas',
      prioritaet: 'optional',
      kategorie: 'performance',
      name: 'EAAs',
      ikon: '🔬',
      fit_grund: 'Alle 9 essentiellen Aminosäuren – optimiert Proteinsynthese während dem Training'
    });
  }

  // L-Glutamin (Ausdauer/Profi oder Kraft/Profi)
  if ((ausd || (kraft && erfahrung === 'profi')) && !wenig) {
    E.push({
      id: 'l_glutamin',
      prioritaet: 'optional',
      kategorie: 'performance',
      name: 'L-Glutamin',
      ikon: '🛡️',
      fit_grund: 'Darmgesundheit und Immunsystem bei hohem Trainingsvolumen'
    });
  }

  // Kollagen (Frauen 36+, Regen-Fokus)
  if (w && (alter === 'D' || alter === 'E' || regen)) {
    E.push({
      id: 'kollagen',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Kollagen Peptide',
      ikon: '✨',
      fit_grund: alter === 'D' || alter === 'E'
        ? 'Ab 36: Kollagenproduktion sinkt – Gelenke, Sehnen und Haut'
        : 'Gelenk-Support bei hohem Trainingsvolumen'
    });
  }

  // Pre-Workout (Kraft, Fortgeschritten – nicht bei Bluthochdruck/Diabetes)
  if (kraft && erfahrung !== 'einsteiger' && !wenig && !hatBlutdr && !hatDiab) {
    E.push({
      id: 'pre_workout',
      prioritaet: 'optional',
      kategorie: 'performance',
      name: 'Pre-Workout Booster',
      ikon: '🚀',
      fit_grund: 'Koffein + Citrullin + Beta-Alanin – maximale Performance bei schweren Einheiten'
    });
  }

  // Wechseljahre: Kollagen extra empfohlen
  if (istMeno) {
    E.push({
      id: 'kollagen',
      prioritaet: 'empfohlen',
      kategorie: 'gesundheit',
      name: 'Kollagen Peptide (Wechseljahre)',
      ikon: '✨',
      fit_grund: 'Haut verliert bis 30% Kollagen in den Wechseljahren'
    });
  }

  // Multivitamin (Gesundheitsfokus, Fortgeschrittene)
  if (health && erfahrung !== 'einsteiger') {
    E.push({
      id: 'multivitamin',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Multivitamin',
      ikon: '🌈',
      fit_grund: 'Allgemeine Mikronährstoff-Absicherung als Basis-Schutz'
    });
  }

  // ── NEUE WIRKSTOFFE ──

  // Curcumin (Gelenke/Entzündung, 35+)
  if ((health || regen || alter === 'D' || alter === 'E') && erfahrung !== 'einsteiger') {
    E.push({
      id: 'curcumin',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Curcumin BCM-95',
      ikon: '🌱',
      fit_grund: 'Starkes Antioxidans – reduziert Entzündungen und verbessert Gelenk-Recovery klinisch belegt'
    });
  }

  // Probiotika (Gesundheitsfokus, Ausdauer-Profis, Veganer)
  if ((health || (ausd && erfahrung === 'profi') || vegan) && !wenig) {
    E.push({
      id: 'probiotika',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Probiotika',
      ikon: '🦠',
      fit_grund: 'Verbessert Nährstoffaufnahme und Immunsystem – besonders bei intensivem Training und veganer Ernährung'
    });
  }

  // Melatonin (nur bei starken Schlafproblemen, nicht bei Antidepressiva)
  if (istSchlaf && !hatAntiD) {
    E.push({
      id: 'melatonin',
      prioritaet: 'optional',
      kategorie: 'wellbeing',
      name: 'Melatonin',
      ikon: '🌙',
      fit_grund: 'Unterstützt Einschlafen und Schlafrhythmus bei anhaltenden Schlafproblemen – niedrig dosiert starten'
    });
  }

  // HMB (Diät + Muskel oder 45+ + Muskel oder Profi + Fett)
  if ((fett && mu) || (alter === 'E' && mu) || (erfahrung === 'profi' && fett)) {
    E.push({
      id: 'hmb',
      prioritaet: 'optional',
      kategorie: 'performance',
      name: 'HMB',
      ikon: '💎',
      fit_grund: 'Schützt Muskelmasse in der Diätphase – besonders effektiv bei fortgeschrittenen Sportlern ab 40'
    });
  }

  // Overlaps auflösen
  var res = loesOverlaps(E);
  var empfehlungen = res.empfehlungen;

  // ── INTELLIGENTE SORTIERUNG NACH PROFIL ──
  function getPrio(e) {
    var id = e.id;
    var score = 0;

    // Basis nach Prioritätsstufe
    if (e.prioritaet === 'essential')      score += 1000;
    else if (e.prioritaet === 'empfohlen') score += 500;
    else                                   score += 100;

    // Muskelaufbau + Kraft
    if (mu && kraft) {
      if (id === 'whey_protein' || id === 'iso_clear' || id === 'pflanzenprotein') score += 400;
      if (id === 'kreatin')    score += 380;
      if (id === 'eaas')       score += 200;
      if (id === 'pre_workout')score += 150;
      if (id === 'beta_alanin')score += 120;
      if (id === 'zink')       score += 100;
      if (id === 'kollagen')   score += 80;
      if (id === 'hmb')        score += 60;
    }

    // Fettabbau
    if (fett) {
      if (id === 'l_carnitin') score += 350;
      if (id === 'whey_protein' || id === 'iso_clear' || id === 'pflanzenprotein') score += 300;
      if (id === 'elektrolyte')score += 200;
      if (id === 'hmb')        score += 180;
      if (id === 'vitamin_c')  score += 150;
      if (id === 'probiotika') score += 100;
    }

    // Ausdauer / Cardio
    if (ausd || cardio) {
      if (id === 'elektrolyte')  score += 350;
      if (id === 'beta_alanin')  score += 300;
      if (id === 'l_glutamin')   score += 200;
      if (id === 'l_carnitin')   score += 150;
      if (id === 'vitamin_c')    score += 120;
      if (id === 'eaas')         score += 100;
    }

    // Regeneration
    if (regen) {
      if (id === 'ashwagandha')  score += 350;
      if (id === 'magnesium')    score += 300;
      if (id === 'zma')          score += 250;
      if (id === 'kollagen')     score += 200;
      if (id === 'l_glutamin')   score += 150;
      if (id === 'curcumin')     score += 120;
    }

    // Energie
    if (energie) {
      if (id === 'vitamin_b12')  score += 350;
      if (id === 'eisen')        score += 300;
      if (id === 'vitamin_c')    score += 250;
      if (id === 'magnesium')    score += 200;
      if (id === 'ashwagandha')  score += 150;
    }

    // Gesundheit
    if (health) {
      if (id === 'vitamin_d3')                          score += 350;
      if (id === 'omega3' || id === 'omega3_vegan')     score += 300;
      if (id === 'multivitamin')                        score += 250;
      if (id === 'zink')                                score += 200;
      if (id === 'curcumin')                            score += 180;
      if (id === 'probiotika')                          score += 150;
    }

    // Schlafprobleme
    if (istSchlaf) {
      if (id === 'melatonin')    score += 400;
      if (id === 'ashwagandha')  score += 300;
      if (id === 'magnesium')    score += 250;
      if (id === 'zma')          score += 200;
    }

    // Vegan
    if (vegan) {
      if (id === 'pflanzenprotein')                     score += 300;
      if (id === 'omega3_vegan')                        score += 300;
      if (id === 'vitamin_b12')                         score += 350;
    }

    // Frauen
    if (w) {
      if (id === 'eisen')                               score += 200;
      if (id === 'kollagen')                            score += 150;
      if (id === 'omega3' || id === 'omega3_vegan')     score += 100;
    }

    // Alter 36+
    if (alter === 'D' || alter === 'E') {
      if (id === 'kollagen')                            score += 150;
      if (id === 'curcumin')                            score += 150;
      if (id === 'vitamin_d3')                          score += 100;
      if (id === 'omega3' || id === 'omega3_vegan')     score += 100;
    }

    // Einsteiger: einfache Stacks nach vorne, komplexe nach hinten
    if (erfahrung === 'einsteiger') {
      if (id === 'whey_protein' || id === 'iso_clear' || id === 'pflanzenprotein') score += 200;
      if (id === 'kreatin')      score += 180;
      if (id === 'vitamin_d3')   score += 160;
      if (id === 'multivitamin') score += 140;
      if (id === 'pre_workout')  score -= 100;
      if (id === 'eaas')         score -= 100;
    }

    return score;
  }

  empfehlungen.sort(function (a, b) { return getPrio(b) - getPrio(a); });

  return empfehlungen;
}


// ── PROFIL ANZEIGEN ──
function zeigeProfil() {
  var a   = AW;
  var kg  = parseFloat(a.gewicht) || 75;
  var cm  = parseFloat(a.groesse) || 175;
  var bmi = (kg / ((cm / 100) * (cm / 100))).toFixed(1);

  var bmiKat = parseFloat(bmi) < 18.5 ? { l: 'Untergewicht',  c: '#3B82F6' }
             : parseFloat(bmi) < 25   ? { l: 'Normalgewicht', c: '#059669' }
             : parseFloat(bmi) < 30   ? { l: 'Übergewicht',   c: '#F59E0B' }
             :                          { l: 'Adipositas',     c: '#EF4444' };

  var bmiPct = Math.min(100, Math.max(0, ((parseFloat(bmi) - 15) / 25) * 100));
  var avatar = getAvatar(a);
  var emps   = berechneEmpfehlungen(a);
  var prio   = { essential: 0, empfohlen: 1, optional: 2 };
  emps.sort(function (x, y) { return prio[x.prioritaet] - prio[y.prioritaet]; });

  var h = '';

  // ── PROFIL HEADER ──
  h += '<div class="profil-card">';
  h += '<div class="profil-header">';
  h += '<div class="avatar-wrap">';
  h += '<div class="avatar">' + avatar + '</div>';
  h += '<div class="avatar-info">';
  h += '<div class="avatar-name">' + (NP.name || 'Mein Profil') + '</div>';
  h += '<div class="avatar-sub">' + (ALT[a.intro] || '') + '  ·  ' + (GES[a.geschlecht] || '') + '  ·  ' + (ERN[a.ernaehrung] || '') + '</div>';
  h += '</div></div>';

  // Stack-Fortschritt
  var stackAnzahl = Object.keys(meinStack).length;
  var gesamtAnzahl = emps.length;
  var stackPct  = gesamtAnzahl > 0 ? Math.round((stackAnzahl / gesamtAnzahl) * 100) : 0;
  var stackPreis = 0;
  Object.keys(meinStack).forEach(function (k) { stackPreis += meinStack[k].preis || 0; });

  h += '<div class="profil-progress-wrap">';
  h += '<div class="profil-progress-top">';
  h += '<span class="profil-progress-label">Mein Stack</span>';
  h += '<span class="profil-progress-count">' + stackAnzahl + ' / ' + gesamtAnzahl + ' Supplements</span>';
  h += '</div>';
  h += '<div class="profil-progress-bar">';
  h += '<div class="profil-progress-fill" style="width:' + stackPct + '%"></div>';
  h += '</div>';
  if (stackAnzahl > 0) {
    h += '<div class="profil-progress-preis">~' + stackPreis.toFixed(0) + ' € / Monat ausgewählt</div>';
  } else {
    h += '<div class="profil-progress-hint">Tippe auf einen Wirkstoff um Produkte hinzuzufügen</div>';
  }
  h += '</div>';

  // Stats
  h += '<div class="profil-stats">';
  h += '<div class="stat-pill"><div class="stat-pill-label">Gewicht</div><div class="stat-pill-val">' + kg + ' kg</div><div class="stat-pill-sub">' + cm + ' cm</div></div>';
  h += '<div class="stat-pill"><div class="stat-pill-label">BMI</div><div class="stat-pill-val" style="color:' + bmiKat.c + '">' + bmi + '</div><div class="stat-pill-sub">' + bmiKat.l + '</div><div class="bmi-bar-wrap"><div class="bmi-bar-fill" style="width:' + bmiPct + '%;background:' + bmiKat.c + '"></div></div></div>';
  h += '<div class="stat-pill"><div class="stat-pill-label">Training</div><div class="stat-pill-val" style="font-size:12px;">' + (TRG[a.training] || '–') + '</div></div>';
  h += '<div class="stat-pill"><div class="stat-pill-label">Ziele</div><div class="stat-pill-val" style="font-size:11px;">' + (a.ziele || ['F']).map(function (z) { return ZIEL[z] || z; }).join(', ') + '</div></div>';
  h += '</div></div>';

  // ── WIRKSTOFF BODY ──
  h += '<div class="profil-body">';
  h += '<div class="profil-section-label">Deine Wirkstoffe – tippe für Details & Produkte</div>';

  var gruppen = [
    { prio: 'essential', label: 'Essentiell', color: '#FF6B00', bg: 'rgba(255,107,0,0.08)',    border: 'rgba(255,107,0,0.25)' },
    { prio: 'empfohlen', label: 'Empfohlen',  color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.25)' },
    { prio: 'optional',  label: 'Optional',   color: '#10B981', bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.25)' },
  ];

  gruppen.forEach(function (g) {
    var gruppe = emps.filter(function (e) { return e.prioritaet === g.prio; });
    if (!gruppe.length) return;

    h += '<div class="pw-gruppe-label" style="color:' + g.color + ';">';
    h += '<span class="pw-gruppe-dot" style="background:' + g.color + ';"></span>' + g.label;
    h += '</div>';

    gruppe.forEach(function (e) {
      var d      = dosis(e.id, a);
      var imStack = meinStack[e.id];
      h += '<div class="pw-zeile tipp' + (imStack ? ' pw-zeile-gewaehlt' : '') + '" data-eid="' + e.id + '" data-prio="' + e.prioritaet + '" style="border-color:' + (imStack ? g.color : g.border) + ';">';
      h += '<div class="pw-zeile-left">';
      h += '<div class="pw-zeile-ikon" style="background:' + g.bg + ';">' + e.ikon + '</div>';
      h += '<div class="pw-zeile-info">';
      h += '<div class="pw-zeile-name">' + e.name + '</div>';
      if (imStack) {
        h += '<div class="pw-zeile-stack-prod">';
        h += '<span class="pw-stack-check" style="color:' + g.color + ';">✓</span>';
        h += '<span class="pw-stack-prodname">' + imStack.prod.name + '</span>';
        h += '</div>';
      } else {
        h += '<div class="pw-zeile-meta">' + d.z + ' · ' + d.d + '</div>';
      }
      h += '</div>';
      h += '</div>';
      h += '<div class="pw-zeile-rechts">';
      if (imStack) h += '<div class="pw-zeile-preis" style="color:' + g.color + ';">' + imStack.prod.preis + ' €</div>';
      h += '<div class="pw-zeile-pfeil" style="color:' + g.color + ';">›</div>';
      h += '</div>';
      h += '</div>';
    });
  });

  h += '</div></div>'; // /profil-body /profil-card

  // ── SHOP BUTTON (Platzhalter – wird später implementiert) ──
  if (Object.keys(meinStack).length > 0) {
    var totalPreis = 0;
    Object.keys(meinStack).forEach(function (k) { totalPreis += meinStack[k].preis || 0; });
    h += '<div class="pw-stack-kauf-box">';
    h += '<div class="pw-stack-kauf-info">';
    h += '<div class="pw-stack-kauf-label">' + Object.keys(meinStack).length + ' Supplements im Stack</div>';
    h += '<div class="pw-stack-kauf-preis">~' + totalPreis.toFixed(0) + ' € / Monat</div>';
    h += '</div>';
    h += '<button class="pw-stack-kauf-btn btn-primary tipp" id="btn-stack-kaufen">Stack kaufen ↗</button>';
    h += '</div>';
  }

  h += '<div style="text-align:center;margin-top:12px;"><button class="btn-ghost" id="btn-reset-p">↺ Neu starten</button></div>';

  // ── POPUP CONTAINER ──
  h += '<div class="pw-overlay" id="pw-overlay" style="display:none;">';
  h += '<div class="pw-popup" id="pw-popup">';
  h += '<div class="pw-popup-inner" id="pw-popup-inner"></div>';
  h += '</div></div>';

  document.getElementById('s-profil').innerHTML = h;
  zeige('s-profil');

  // Events
  document.getElementById('btn-reset-p').addEventListener('click', function () { resetApp(); });
  var stackKaufBtn = document.getElementById('btn-stack-kaufen');
  if (stackKaufBtn) {
    stackKaufBtn.addEventListener('click', function () {
      toast('🛒 Shop-Integration folgt – Stack gespeichert');
    });
  }

  // Wirkstoff-Zeile → Popup
  document.querySelectorAll('.pw-zeile').forEach(function (row) {
    row.addEventListener('click', function () {
      oeffneWirkstoffPopup(row.getAttribute('data-eid'), row.getAttribute('data-prio'), a);
    });
  });

  // Overlay schließen bei Klick außen
  document.getElementById('pw-overlay').addEventListener('click', function (ev) {
    if (ev.target === this) schliessePopup();
  });
}


// ── WIRKSTOFF POPUP ──
function oeffneWirkstoffPopup(eid, prio, a) {
  if (!DB || !DB[eid]) return;
  var db         = DB[eid];
  var erkl       = ERKLAERUNG[eid] || 'Wichtiger Wirkstoff für dein Profil.';
  var d          = dosis(eid, a);
  var prioColor  = prio === 'essential' ? '#FF6B00' : prio === 'empfohlen' ? '#3B82F6' : '#10B981';
  var prioLabel  = prio === 'essential' ? 'Essentiell' : prio === 'empfohlen' ? 'Empfohlen' : 'Optional';
  var produkte   = getPersonalisierteAlts(eid, a);
  if (!produkte || !produkte.length) produkte = [db.hauptprodukt].concat(db.alternativen || []);

  var h = '';
  h += '<div class="pw-popup-header" style="border-color:' + prioColor + '20;">';
  h += '<div class="pw-popup-title-row">';
  h += '<div class="pw-popup-ikon">' + getEmpIcon(eid) + '</div>';
  h += '<div>';
  h += '<div class="pw-popup-name">' + getEmpName(eid) + '</div>';
  h += '<div class="pw-popup-prio" style="color:' + prioColor + ';background:' + prioColor + '15;">● ' + prioLabel + '</div>';
  h += '</div>';
  h += '<button class="pw-popup-close tipp" id="pw-close">✕</button>';
  h += '</div>';
  h += '<p class="pw-popup-erkl">' + erkl + '</p>';
  h += '<div class="pw-popup-einnahme">';
  h += '<div class="pw-einnahme-block"><div class="pw-einnahme-lbl">⏱ EINNAHME</div><div class="pw-einnahme-val">' + d.z + '</div></div>';
  h += '<div class="pw-einnahme-divider"></div>';
  h += '<div class="pw-einnahme-block"><div class="pw-einnahme-lbl">💊 DOSIERUNG</div><div class="pw-einnahme-val" style="color:#34D399;">' + d.d + '</div></div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="pw-popup-produkte-titel">Verfügbare Produkte</div>';
  h += '<div class="pw-popup-produkte">';

  produkte.forEach(function (prod, idx) {
    var isFirst = idx === 0;
    h += '<div class="pw-prod-card' + (isFirst ? ' pw-prod-best' : '') + '">';
    if (isFirst) h += '<div class="pw-prod-best-badge">★ Empfohlen</div>';
    h += '<div class="pw-prod-header">';
    h += '<div>';
    h += '<div class="pw-prod-marke">' + prod.marke + '</div>';
    h += '<div class="pw-prod-name">' + prod.name + '</div>';
    h += '<div class="pw-prod-rating">' + prod.rating + '</div>';
    h += '</div>';
    h += '<div class="pw-prod-preis">' + prod.preis + ' <span style="font-size:11px;opacity:0.6;">€</span></div>';
    h += '</div>';
    h += '<div class="pw-prod-tags">';
    prod.tags.forEach(function (t) { h += '<span class="pw-prod-tag">' + t + '</span>'; });
    h += '</div>';
    var imStack = meinStack[eid] && meinStack[eid].prod.name === prod.name;
    h += '<button class="pw-prod-kaufen' + (imStack ? ' pw-prod-im-stack' : '') + ' tipp" data-eid="' + eid + '" data-pidx="' + (idx === 0 ? -1 : idx - 1) + '">';
    h += imStack ? '<span>✓ Im Stack</span>' : '<span>Zum Stack hinzufügen</span><span>+</span>';
    h += '</button>';
    h += '</div>';
  });

  h += '</div>';

  document.getElementById('pw-popup-inner').innerHTML = h;
  document.getElementById('pw-overlay').style.display = 'flex';
  setTimeout(function () { document.getElementById('pw-popup').classList.add('pw-popup-open'); }, 10);

  document.getElementById('pw-close').addEventListener('click', schliessePopup);

  document.querySelectorAll('.pw-prod-kaufen').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var eid  = btn.getAttribute('data-eid');
      var pidx = parseInt(btn.getAttribute('data-pidx'));
      var db   = DB[eid];
      if (!db) return;
      var prod = pidx === -1 ? db.hauptprodukt : db.alternativen[pidx];
      if (!prod) return;
      meinStack[eid] = { prod: prod, preis: parseFloat(prod.preis.replace(',', '.')) };
      schliessePopup();
      setTimeout(function () {
        zeigeProfil();
        toast('✓ ' + prod.name + ' zum Stack hinzugefügt');
      }, 300);
    });
  });
}

function schliessePopup() {
  var popup = document.getElementById('pw-popup');
  if (popup) popup.classList.remove('pw-popup-open');
  setTimeout(function () {
    var overlay = document.getElementById('pw-overlay');
    if (overlay) overlay.style.display = 'none';
  }, 260);
}

// Hilfsfunktionen: Icon und Name aus den Empfehlungen holen
function getEmpIcon(eid) {
  var emps = berechneEmpfehlungen(AW);
  for (var i = 0; i < emps.length; i++) if (emps[i].id === eid) return emps[i].ikon;
  return '💊';
}

function getEmpName(eid) {
  var emps = berechneEmpfehlungen(AW);
  for (var i = 0; i < emps.length; i++) if (emps[i].id === eid) return emps[i].name;
  return eid;
}

// ── SHOP PLATZHALTER ──
// Wird später durch vollständige shop.js ersetzt
function zeigeShop() {
  toast('🛒 Shop wird in einer späteren Version implementiert.');
}


// ── TOAST ──
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(function () { t.classList.remove('on'); }, 2800);
}


// ── RESET ──
function resetApp() {
  AW = {}; NP = { name: '', email: '' };
  abgewaehlt = {}; aufgeklappteAlts = {}; gewaehlteAlts = {};
  meinStack = {}; qIdx = 0; multiSel = [];
  initQueue();
  zeige('s-start');
  toast('↺ App zurückgesetzt.');
}


// ── INIT ──
// Wird ausgeführt sobald das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', function () {
  initQueue();

  // Produktdaten aus JSON laden (ersetzt inline DB)
  ladeProdukte();

  // Start-Button
  var btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.addEventListener('click', function () { zeigeQuiz(); });

  // Reset-Buttons (Header)
  var btnReset  = document.getElementById('btn-reset');
  var btnReset2 = document.getElementById('btn-reset2');
  if (btnReset)  btnReset.addEventListener('click',  function () { resetApp(); });
  if (btnReset2) btnReset2.addEventListener('click', function () { resetApp(); });

  // Login
  var btnLogin = document.getElementById('btn-login');
  if (btnLogin) btnLogin.addEventListener('click', function () {
    NP.name  = (document.getElementById('inp-name')  && document.getElementById('inp-name').value.trim())  || 'Nutzer';
    NP.email = (document.getElementById('inp-email') && document.getElementById('inp-email').value.trim()) || '';
    zeigeProfil();
  });

  // Login überspringen
  var btnSkip = document.getElementById('btn-skip');
  if (btnSkip) btnSkip.addEventListener('click', function () {
    NP.name = 'Nutzer';
    zeigeProfil();
  });
});
