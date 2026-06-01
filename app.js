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
      console.warn('Stelle sicher dass produkte.json im selben Ordner wie index.html liegt.');
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
  h += '<div class="pw-popup-einnahme pw-einnahme-klickbar" id="pw-einnahme-toggle" title="Tippe für konkretes Beispiel">';
  h += '<div class="pw-einnahme-block"><div class="pw-einnahme-lbl">⏱ EINNAHME</div><div class="pw-einnahme-val">' + d.z + '</div></div>';
  h += '<div class="pw-einnahme-divider"></div>';
  h += '<div class="pw-einnahme-block"><div class="pw-einnahme-lbl">💊 DOSIERUNG</div><div class="pw-einnahme-val" style="color:#34D399;">' + d.d + '</div></div>';
  h += '<div class="pw-einnahme-hint">💡 Tippe für Beispiel</div>';
  h += '</div>';
  // Beispiel-Panel (initial versteckt)
  h += '<div class="pw-bsp-panel" id="pw-bsp-panel">';
  h += '<div class="pw-bsp-titel">📋 Konkretes Beispiel</div>';
  h += '<div class="pw-bsp-text">' + (d.bsp || 'Laut Produktangabe einnehmen.') + '</div>';
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

  // Einnahme-Block: Beispiel-Panel aufklappen/zuklappen
  var einnahmeToggle = document.getElementById('pw-einnahme-toggle');
  var bspPanel       = document.getElementById('pw-bsp-panel');
  if (einnahmeToggle && bspPanel) {
    einnahmeToggle.addEventListener('click', function () {
      var offen = bspPanel.classList.contains('pw-bsp-offen');
      bspPanel.classList.toggle('pw-bsp-offen', !offen);
      einnahmeToggle.classList.toggle('pw-einnahme-aktiv', !offen);
    });
  }

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

// ── BANNER KARUSSELL ──
function initBanner() {
  var slides = document.querySelectorAll('.banner-slide');
  var dots   = document.querySelectorAll('.banner-dot');
  if (!slides.length) return;

  var aktuell = 0;
  var interval;

  function zeigSlide(idx) {
    slides[aktuell].classList.remove('aktiv');
    dots[aktuell].classList.remove('aktiv-dot');
    aktuell = (idx + slides.length) % slides.length;
    slides[aktuell].classList.add('aktiv');
    dots[aktuell].classList.add('aktiv-dot');
  }

  function startAuto() {
    interval = setInterval(function () { zeigSlide(aktuell + 1); }, 4000);
  }

  // Dot-Klick
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      clearInterval(interval);
      zeigSlide(parseInt(dot.getAttribute('data-dot')));
      startAuto();
    });
  });

  // Touch Swipe
  var startX = 0;
  var karussell = document.getElementById('banner-karussell');
  if (karussell) {
    karussell.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    karussell.addEventListener('touchend', function (e) {
      var diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        clearInterval(interval);
        zeigSlide(diff > 0 ? aktuell + 1 : aktuell - 1);
        startAuto();
      }
    }, { passive: true });
  }

  startAuto();
}


// ── SUPPLEMENT GUIDE ──
var GUIDE_DATEN = {
  "magnesium": {
    "name": "Magnesium",
    "emoji": "🟢",
    "tagline": "Muskelkontraktion, Nerven & Schlaf",
    "beschreibung": "Magnesium ist an über 300 Enzymreaktionen beteiligt – darunter Muskelkontraktion, Nervenfunktion und Energieproduktion. Sportler verlieren durch Schweiß erhöhte Mengen. Ein Mangel äußert sich durch Krämpfe, Schlafprobleme und Erschöpfung.\n\n💊 Einnahme:\n300–400 mg Magnesium Bisglycinat täglich, abends mit einem großen Glas Wasser direkt vor dem Schlafen. Nicht zusammen mit Kalzium einnehmen – beide Mineralien konkurrieren um dieselben Transportwege.\n\n📌 Beispiel:\nWenn du regelmäßig Wadenkrämpfe bekommst, schlecht schläfst oder dich trotz ausreichend Schlaf erschöpft fühlst – besonders nach intensivem Sport – könnte ein Magnesiummangel die Ursache sein.",
    "kategorie": "gesundheit",
    "prioritaet": "essential"
  },
  "vitamin_d3_k2": {
    "name": "Vitamin D3 + K2",
    "emoji": "☀️",
    "tagline": "Knochen, Immunsystem & Testosteron",
    "beschreibung": "Vitamin D3 ist kein Vitamin sondern ein Hormon-Vorläufer. Reguliert Kalziumaufnahme, Immunsystem und Testosteronproduktion. K2 (MK-7) stellt sicher, dass Kalzium in die Knochen geht und nicht in die Gefäße eingelagert wird. In Mitteleuropa haben 70–80% der Bevölkerung im Winter einen Mangel.\n\n💊 Einnahme:\n2.000–5.000 IU D3 + 100–200 mcg K2 täglich, morgens zum Frühstück mit einer fetthaltigen Mahlzeit – zum Beispiel mit Eiern, Avocado oder einem Löffel Olivenöl. D3 ist fettlöslich und wird ohne Fett kaum aufgenommen.\n\n📌 Beispiel:\nWenn du viel Zeit in Innenräumen verbringst, dich oft müde und antriebslos fühlst oder häufig krank wirst – vor allem im Winter – lohnt sich ein Bluttest. Ein D3-Wert unter 30 ng/ml erklärt viele dieser Symptome.",
    "kategorie": "gesundheit",
    "prioritaet": "essential"
  },
  "omega_3": {
    "name": "Omega-3",
    "emoji": "🐟",
    "tagline": "Entzündung, Herz, Gehirn & Recovery",
    "beschreibung": "EPA und DHA sind essenzielle Omega-3-Fettsäuren mit stark entzündungshemmender Wirkung. Unterstützen Herzgesundheit, Gehirnfunktion, Gelenke und beschleunigen die Regeneration nach dem Training.\n\n💊 Einnahme:\n2–3 g EPA+DHA täglich, zu einer Hauptmahlzeit mit Fett – zum Beispiel zum Mittagessen mit einem Salat mit Olivenöl. Fischöl immer im Kühlschrank lagern nach dem Öffnen. Auf nüchternen Magen kann Fischöl Übelkeit verursachen.\n\n📌 Beispiel:\nWenn deine Gelenke nach dem Training schmerzen, du dich langsam erholst oder häufig Entzündungszeichen hast – dann ist dein Omega-6/Omega-3-Verhältnis wahrscheinlich zu ungünstig und Omega-3 kann spürbar helfen.",
    "kategorie": "gesundheit",
    "prioritaet": "essential"
  },
  "zink": {
    "name": "Zink",
    "emoji": "🔷",
    "tagline": "Testosteron, Immunsystem & Enzyme",
    "beschreibung": "Zink ist essenziell für über 300 Enzymreaktionen, Testosteronproduktion, Immunabwehr und Wundheilung. Intensives Training erhöht den Zinkverlust über Schweiß erheblich.\n\n💊 Einnahme:\n15–25 mg Zink täglich, abends auf nüchternen Magen oder 1–2 Stunden nach dem Abendessen mit einem Glas Wasser. Nicht gleichzeitig mit Eisen, Kalzium oder Milchprodukten – diese blockieren die Zinkaufnahme.\n\n📌 Beispiel:\nWenn du intensiv trainierst, dich dauerhaft müde und anfällig für Erkältungen fühlst oder deine Regeneration sich verlangsamt hat – könnte dein Zinkspiegel trainingsbedingt zu niedrig sein.",
    "kategorie": "gesundheit",
    "prioritaet": "essential"
  },
  "vitamin_c": {
    "name": "Vitamin C",
    "emoji": "🍊",
    "tagline": "Kollagensynthese, Antioxidans & Immunsystem",
    "beschreibung": "Vitamin C ist ein wasserlösliches Antioxidans und Cofaktor der Kollagensynthese. Schützt Zellen vor freien Radikalen, unterstützt das Immunsystem und verbessert die Eisenaufnahme.\n\n💊 Einnahme:\n500–1.000 mg täglich, zu einer Mahlzeit mit einem großen Glas Wasser. Bei Kollagen-Einnahme immer gleichzeitig nehmen – am besten 30 Minuten vor dem Training mit etwas Obst oder Saft. Bei empfindlichem Magen gepuffertes Vitamin C (Calciumascorbat) wählen.\n\n📌 Beispiel:\nWenn du Kollagen-Peptide nimmst aber keine Wirkung spürst – fehlt dir wahrscheinlich Vitamin C als Cofaktor. Ohne Vitamin C kann dein Körper das aufgenommene Kollagen nicht in körpereigenes Gewebe umbauen.",
    "kategorie": "gesundheit",
    "prioritaet": "empfohlen"
  },
  "probiotika": {
    "name": "Probiotika",
    "emoji": "🦠",
    "tagline": "Darmflora, Nährstoffaufnahme & Immunsystem",
    "beschreibung": "Das Mikrobiom besteht aus ca. 100 Billionen Bakterien die Verdauung, Immunsystem und sogar Stimmung beeinflussen. Probiotika stärken die Darmbarriere, verbessern die Nährstoffaufnahme und reduzieren systemische Entzündungen.\n\n💊 Einnahme:\nMindestens 10 Milliarden KBE täglich, morgens nüchtern mit einem Glas lauwarmem Wasser – kein heißes Wasser, das tötet die Bakterien ab. Danach 15–30 Minuten warten bevor du frühstückst. Mit ballaststoffreichen Lebensmitteln kombinieren.\n\n📌 Beispiel:\nWenn du nach einer Antibiotika-Kur Verdauungsprobleme hast, dich oft aufgebläht fühlst oder dein Immunsystem geschwächt wirkt – ist deine Darmflora wahrscheinlich aus dem Gleichgewicht geraten.",
    "kategorie": "verdauung",
    "prioritaet": "empfohlen"
  },
  "verdauungsenzyme": {
    "name": "Verdauungsenzyme",
    "emoji": "🧫",
    "tagline": "Proteinverwertung, Blähungen & Laktoseintoleranz",
    "beschreibung": "Verdauungsenzyme verbessern die Aufspaltung von Proteinen, Fetten und Kohlenhydraten. Besonders hilfreich bei hoher Proteinzufuhr, Laktoseintoleranz oder schwer verdaulichen Mahlzeiten.\n\n💊 Einnahme:\nDirekt vor dem ersten Bissen oder zu Beginn der Mahlzeit, mit einem Glas Wasser. Nicht auf nüchternen Magen einnehmen – die Enzyme brauchen Nahrung zum Arbeiten. Bei großen Mahlzeiten kann auch eine zweite Kapsel zur Mitte der Mahlzeit helfen.\n\n📌 Beispiel:\nWenn du täglich viel Protein isst und nach Shakes oder proteinreichen Mahlzeiten Blähungen bekommst – fehlen dir wahrscheinlich die Enzyme um die hohe Proteinmenge vollständig aufzuspalten.",
    "kategorie": "verdauung",
    "prioritaet": "empfohlen"
  },
  "whey_protein": {
    "name": "Whey Protein",
    "emoji": "🥛",
    "tagline": "Muskelaufbau, Sättigung & Recovery",
    "beschreibung": "Whey ist das am schnellsten absorbierbare Protein mit hohem Leucin-Gehalt (ca. 11%). Leucin ist der Hauptauslöser der Muskelproteinsynthese. Ideal für das Zeitfenster direkt nach dem Training.\n\n💊 Einnahme:\n25–40 g in 250–300 ml Wasser, innerhalb von 30–60 Minuten nach dem Training. Mit Wasser mischen für schnellste Absorption – Milch verlangsamt die Aufnahme. Shaker gut schütteln und sofort trinken.\n\n📌 Beispiel:\nWenn du nach dem Training kein vollständiges Essen zu dir nehmen kannst oder willst – ist ein Whey-Shake die schnellste und effektivste Möglichkeit um die Muskelproteinsynthese anzukurbeln.",
    "kategorie": "muskelaufbau",
    "prioritaet": "essential"
  },
  "iso_clear": {
    "name": "Iso Clear",
    "emoji": "🧬",
    "tagline": "Whey Isolat, fettarm & leichte Textur",
    "beschreibung": "Iso Clear ist ein Whey-Isolat als klares, fruchtiges Getränk. Kaum Laktose und Fett, für Laktoseintolerante geeignet und mit sehr niedrigem Kaloriengehalt.\n\n💊 Einnahme:\n25 g in 400–500 ml kaltem Wasser auflösen, gut schütteln und sofort trinken. Nicht mit heißem Wasser mischen – das Protein flockt aus. Ideal als Snack zwischen den Mahlzeiten oder nach dem Training statt eines klassischen Shakes.\n\n📌 Beispiel:\nWenn du klassische cremige Proteinshakes nicht verträgst, Laktose schlecht verdaust oder einfach etwas Erfrischendes nach dem Sport willst – ist Iso Clear eine leichte Alternative ohne Magenbeschwerden.",
    "kategorie": "muskelaufbau",
    "prioritaet": "empfohlen"
  },
  "kreatin": {
    "name": "Kreatin",
    "emoji": "🔵",
    "tagline": "Kraft, Schnellkraft & Muskelmasse",
    "beschreibung": "Kreatin Monohydrat ist das am besten erforschte Supplement der Welt mit über 1.000 Studien. Erhöht die Phosphokreatin-Speicher im Muskel für mehr Kraft, mehr Wiederholungen und schnellere Regeneration.\n\n💊 Einnahme:\n3–5 g täglich, nach dem Training mit einem großen Glas Wasser oder in deinem Post-Workout-Shake. An trainingsfreien Tagen morgens zum Frühstück. Kein Laden nötig. Ausreichend Wasser trinken – Kreatin zieht Wasser in die Muskelzellen.\n\n📌 Beispiel:\nWenn du seit Monaten keine Kraftfortschritte machst oder bei schweren Sätzen frühzeitig versagst – kann Kreatin die fehlende ATP-Reserve sein die dich die letzten 1–2 Wiederholungen kostet.",
    "kategorie": "muskelaufbau",
    "prioritaet": "essential"
  },
  "eaa_bcaa": {
    "name": "EAA & BCAA",
    "emoji": "💪",
    "tagline": "Muskelproteinsynthese & Anti-Katabolismus",
    "beschreibung": "EAAs liefern alle 9 essentiellen Aminosäuren die dein Körper nicht selbst herstellen kann. Im nüchternen Training oder bei Diäten besonders wertvoll um Muskelabbau zu verhindern.\n\n💊 Einnahme:\n10–15 g in 500 ml Wasser aufgelöst, 15–20 Minuten vor dem nüchternen Training trinken oder während des Trainings sipped. Bei ausreichender Proteinzufuhr über den Tag sind EAAs nicht zwingend nötig.\n\n📌 Beispiel:\nWenn du morgens nüchtern trainierst um Fett zu verbrennen aber Angst hast dabei Muskeln abzubauen – sind EAAs vor dem Training dein Schutzschild ohne die Fettverbrennung zu stoppen.",
    "kategorie": "muskelaufbau",
    "prioritaet": "empfohlen"
  },
  "pre_workout": {
    "name": "Pre-Workout",
    "emoji": "⚡",
    "tagline": "Energie, Fokus, Pump & Ausdauer",
    "beschreibung": "Pre-Workout Booster kombinieren Koffein, L-Citrullin und Beta-Alanin für maximale Performance. Steigern Fokus, Kraft und den Pump während des Trainings.\n\n💊 Einnahme:\n20–30 Minuten vor dem Training mit 400–500 ml Wasser auf nüchternen oder leichten Magen. Nicht nach 16 Uhr einnehmen wegen des Koffeingehalts und möglicher Schlafstörungen. Maximal 3–4x pro Woche – sonst baut sich eine Toleranz auf.\n\n📌 Beispiel:\nWenn du nach der Arbeit erschöpft ins Gym gehst und die Trainingsqualität leidet – kann Pre-Workout an gezielten Tagen den Unterschied machen. Nicht täglich nutzen damit die Wirkung erhalten bleibt.",
    "kategorie": "muskelaufbau",
    "prioritaet": "optional"
  },
  "l_carnitin": {
    "name": "L-Carnitin",
    "emoji": "🔥",
    "tagline": "Fettverbrennung, Energie & Recovery",
    "beschreibung": "L-Carnitin transportiert Fettsäuren in die Mitochondrien zur Energiegewinnung. Besonders effektiv bei Ausdauersport und in Diätphasen.\n\n💊 Einnahme:\n1–2 g, 30–45 Minuten vor dem Ausdauertraining mit einem kohlenhydratreichen Snack oder Saft – Insulin verbessert die Aufnahme ins Muskelgewebe erheblich. Flüssiges L-Carnitin L-Tartrat wird am schnellsten aufgenommen.\n\n📌 Beispiel:\nWenn du Ausdauertraining machst, in einer Diätphase bist und mehr Energie beim Cardio willst ohne dabei Muskeln zu verlieren – kann L-Carnitin deinen Fettstoffwechsel gezielt unterstützen.",
    "kategorie": "muskelaufbau",
    "prioritaet": "empfohlen"
  },
  "beta_alanin": {
    "name": "Beta-Alanin",
    "emoji": "⚡",
    "tagline": "Laktat-Puffer, Ausdauer & Muskelermüdung",
    "beschreibung": "Beta-Alanin erhöht den Carnosin-Spiegel im Muskel und puffert Laktat. Verzögert das Muskelversagen bei hochintensivem Training. Das Kribbeln (Parästhesie) ist harmlos.\n\n💊 Einnahme:\n3,2 g täglich – aufgeteilt in 2x 1,6 g um das Kribbeln zu reduzieren. Einmal morgens zum Frühstück mit Wasser, einmal 30 Minuten vor dem Training. Muss täglich eingenommen werden – der Carnosin-Aufbau dauert 4–6 Wochen.\n\n📌 Beispiel:\nWenn du bei intensiven Intervallen oder langen Sätzen früh abbrichst weil der Muskel brennt und versagt – ist das Laktat-Akkumulation die Beta-Alanin direkt bekämpft.",
    "kategorie": "muskelaufbau",
    "prioritaet": "empfohlen"
  },
  "l_glutamin": {
    "name": "L-Glutamin",
    "emoji": "🟡",
    "tagline": "Darmgesundheit, Immunsystem & Recovery",
    "beschreibung": "L-Glutamin ist die häufigste Aminosäure im Körper. Schützt die Darmschleimhaut, fördert die Immunfunktion und unterstützt die Regeneration nach intensivem Training.\n\n💊 Einnahme:\n5–10 g täglich – nach dem Training in deinem Shake oder abends vor dem Schlafen mit einem Glas Wasser. Bei Darmproblemen morgens nüchtern auf leeren Magen mit lauwarmem Wasser für maximale Darmwirkung.\n\n📌 Beispiel:\nWenn du täglich oder sehr intensiv trainierst und im Winter häufig krank wirst – ist dein Glutamin-Spiegel möglicherweise chronisch erschöpft und dein Immunsystem leidet darunter.",
    "kategorie": "muskelaufbau",
    "prioritaet": "optional"
  },
  "hmb": {
    "name": "HMB",
    "emoji": "🛡️",
    "tagline": "Anti-Katabolismus, Muskelerhalt & Kraft",
    "beschreibung": "HMB hemmt den Muskelabbau und beschleunigt die Reparatur von Muskelfasern. Besonders wirksam bei Trainingsanfängern, in der Diätphase und für ältere Sportler.\n\n💊 Einnahme:\n3 g täglich aufgeteilt in 3x 1 g – jeweils zu den drei Hauptmahlzeiten mit einem Glas Wasser. Wirkung tritt nach 2–4 Wochen ein. Am effektivsten wenn die Gesamtkalorienzufuhr eingeschränkt ist.\n\n📌 Beispiel:\nWenn du gerade mit Krafttraining anfängst, über 40 bist oder in einer Diät Muskeln schützen willst – unterstützt HMB deinen Körper dabei das neu aufgebaute Gewebe zu erhalten.",
    "kategorie": "muskelaufbau",
    "prioritaet": "optional"
  },
  "ashwagandha": {
    "name": "Ashwagandha",
    "emoji": "🌿",
    "tagline": "Stressreduktion, Cortisol & Schlafqualität",
    "beschreibung": "Ashwagandha KSM-66 ist der am besten erforschte Extrakt. Senkt Cortisol, verbessert Schlafqualität, reduziert Stress und kann Testosteron leicht erhöhen.\n\n💊 Einnahme:\n300–600 mg KSM-66, abends zum Abendessen mit einem Glas Wasser oder Milch – Milch verbessert die Aufnahme der fettlöslichen Withanolide. Wirkung tritt nach 4–8 Wochen regelmäßiger Einnahme ein.\n\n📌 Beispiel:\nWenn du unter chronischem Stress leidest, abends nicht abschalten kannst, schlecht schläfst oder dich ausgelaugt fühlst – kann Ashwagandha deinen Cortisolspiegel messbar senken.",
    "kategorie": "regeneration",
    "prioritaet": "empfohlen"
  },
  "melatonin": {
    "name": "Melatonin",
    "emoji": "🌙",
    "tagline": "Einschlafen, Schlafrhythmus & Regeneration",
    "beschreibung": "Melatonin ist das körpereigene Schlafhormon. Niedrige Dosen sind effektiver als hohe. Ideal für Schichtarbeiter, Vielflieger und Menschen mit verzögertem Schlafrhythmus.\n\n💊 Einnahme:\n0,5–1 mg, 30–60 Minuten vor dem Schlafen, in einem dunklen Raum einnehmen und danach kein helles Licht oder Bildschirme mehr. Mit einem kleinen Glas Wasser. Nicht dauerhaft täglich verwenden – bei Bedarf oder kurweise einsetzen.\n\n📌 Beispiel:\nWenn du nach einer Zeitzonenreise nicht in den Schlaf findest oder abends zu spät müde wirst und morgens nicht aufwachen kannst – hilft Melatonin deiner inneren Uhr beim Zurücksetzen.",
    "kategorie": "regeneration",
    "prioritaet": "empfohlen"
  },
  "zma": {
    "name": "ZMA",
    "emoji": "💎",
    "tagline": "Schlafqualität, Testosteron & Recovery",
    "beschreibung": "ZMA kombiniert Zink, Magnesium und Vitamin B6 für optimale Schlafqualität und hormonelle Balance. Besonders für Sportler die beide Mineralien durch intensives Training verlieren.\n\n💊 Einnahme:\n1 Portion (meist 3 Kapseln) auf nüchternen Magen, 30–60 Minuten vor dem Schlafen mit einem großen Glas Wasser. Nicht mit Milch oder Kalzium einnehmen – hemmt die Aufnahme beider Mineralien deutlich.\n\n📌 Beispiel:\nWenn du intensiv trainierst, morgens nicht erholt aufwachst und dich nach dem Schlafen trotzdem müde fühlst – könnte ein trainingsbedingt abgesunkener Zink- und Magnesiumspiegel deinen Tiefschlaf stören.",
    "kategorie": "regeneration",
    "prioritaet": "empfohlen"
  },
  "kollagen": {
    "name": "Kollagen",
    "emoji": "🦴",
    "tagline": "Gelenke, Haut, Sehnen & Knorpel",
    "beschreibung": "Kollagen macht 30% aller Körperproteine aus und ist Hauptbestandteil von Knorpel, Sehnen, Bändern und Haut. Hydrolysiertes Kollagen wird am besten aufgenommen.\n\n💊 Einnahme:\n10–15 g hydrolysiertes Kollagen, 30–60 Minuten vor dem Training in 300 ml warmem Wasser oder Saft auflösen – immer zusammen mit 200–500 mg Vitamin C. Das Timing ist wichtig: Vitamin C ist notwendig für die Kollagensynthese im Gewebe.\n\n📌 Beispiel:\nWenn du unter Sehnenschmerzen, Gelenkproblemen oder schlechter Hautelastizität leidest – und du kein Vitamin C dazu nimmst – dann fehlt die entscheidende Zutat damit dein Körper das Kollagen überhaupt verarbeiten kann.",
    "kategorie": "gelenke",
    "prioritaet": "empfohlen"
  },
  "curcumin": {
    "name": "Curcumin",
    "emoji": "🌱",
    "tagline": "Entzündungshemmung & Gelenk-Recovery",
    "beschreibung": "Curcumin hemmt Entzündungsprozesse und unterstützt die Gelenk-Recovery. BCM-95 oder Phytosom-Formen haben eine bis zu 29-fach bessere Absorption als normales Curcumin.\n\n💊 Einnahme:\n500–1.000 mg BCM-95 oder Phytosom täglich, zu einer fetthaltigen Hauptmahlzeit – zum Beispiel zum Mittagessen mit einem Salat mit Olivenöl oder mit Nüssen. Curcumin ist fettlöslich und wird ohne Fett kaum aufgenommen.\n\n📌 Beispiel:\nWenn du nach schwerem Training oder Wettkämpfen starke Muskelkater und Gelenkschmerzen hast und dich langsam erholst – kann Curcumin die Entzündungsreaktion gezielt dämpfen.",
    "kategorie": "gelenke",
    "prioritaet": "empfohlen"
  },
  "glucosamin_chond": {
    "name": "Glucosamin + Chondroitin",
    "emoji": "🦵",
    "tagline": "Knorpelaufbau, Gelenkschutz & Schmerz",
    "beschreibung": "Glucosamin und Chondroitin sind Bausteine des Gelenkknorpels. Glucosamin fördert die Knorpelsynthese, Chondroitin hemmt den Knorpelabbau.\n\n💊 Einnahme:\n1.500 mg Glucosamin + 1.200 mg Chondroitin täglich, zu einer Hauptmahlzeit mit einem großen Glas Wasser. Am besten morgens zum Frühstück als Teil deiner täglichen Routine. Wirkung tritt erst nach 4–8 Wochen ein – mindestens 3 Monate durchhalten.\n\n📌 Beispiel:\nWenn du beim Laufen, Kniebeugen oder Treppensteigen Knieschmerzen hast und über 35 bist – lohnt sich ein Langzeit-Test mit Glucosamin und Chondroitin über mindestens 12 Wochen.",
    "kategorie": "gelenke",
    "prioritaet": "empfohlen"
  },
  "msm": {
    "name": "MSM",
    "emoji": "🌊",
    "tagline": "Entzündungshemmung, Gelenke & Schwefel",
    "beschreibung": "MSM liefert organischen Schwefel für Kollagensynthese, Gelenke und Entgiftung. Synergist zu Glucosamin, Chondroitin und Kollagen.\n\n💊 Einnahme:\n1.000–3.000 mg täglich, aufgeteilt auf 2 Dosen zu den Mahlzeiten mit einem Glas Wasser. Langsam einschleichen – beginne mit 1.000 mg und steigere wöchentlich um 500 mg um mögliche Verdauungsbeschwerden zu vermeiden.\n\n📌 Beispiel:\nWenn du bereits Kollagen und Glucosamin nimmst aber noch keine optimale Wirkung spürst – ergänzt MSM den Gelenkschutz-Stack als dritte Säule und kann die Gesamtwirkung deutlich verbessern.",
    "kategorie": "gelenke",
    "prioritaet": "optional"
  },
  "grüner_tee_egcg": {
    "name": "Grüner Tee (EGCG)",
    "emoji": "🍵",
    "tagline": "Fettverbrennung, Thermogenese & Antioxidans",
    "beschreibung": "EGCG ist das wirksamste Polyphenol aus grünem Tee. Erhöht die Thermogenese, aktiviert den Fettstoffwechsel und wirkt antioxidativ. Am effektivsten in Kombination mit Koffein.\n\n💊 Einnahme:\n400–800 mg EGCG täglich, morgens nüchtern oder 30 Minuten vor dem Training mit einem Glas Wasser. Nicht zusammen mit Milch trinken – Kasein bindet Polyphenole und blockiert die Wirkung. Entkoffeinierte Variante für die Einnahme nach 15 Uhr.\n\n📌 Beispiel:\nWenn du in einer Diätphase bist, deine Fettverbrennung ankurbeln willst und nach einem natürlichen Booster ohne starkes Koffein suchst – ist EGCG eine evidenzbasierte und gut verträgliche Option.",
    "kategorie": "gewicht",
    "prioritaet": "empfohlen"
  },
  "cla": {
    "name": "CLA",
    "emoji": "🔶",
    "tagline": "Körperfettanteil, Muskelmasse & Body-Recomp",
    "beschreibung": "CLA beeinflusst die Körperzusammensetzung positiv – reduziert Körperfett und unterstützt Muskelerhalt. Wirkung ist moderat aber kontinuierlich.\n\n💊 Einnahme:\n3–6 g täglich, aufgeteilt auf 3 Mahlzeiten – jeweils 1–2 g zum Frühstück, Mittagessen und Abendessen mit einem Glas Wasser. CLA ist fettlöslich und wird mit einer Mahlzeit besser aufgenommen. Mindestens 12 Wochen kontinuierlich einnehmen.\n\n📌 Beispiel:\nWenn du auf einer Diät bist, deine Muskelmasse erhalten willst und zusätzlichen Fettabbau ohne starke Stimulanzien suchst – ergänzt CLA deine Diät als sanfter aber dauerhafter Helfer.",
    "kategorie": "gewicht",
    "prioritaet": "optional"
  }
};

function guideOeffnen() {
  // Menü schliessen
  var ov = document.getElementById('hdr-menu-overlay');
  if (ov) ov.classList.remove('offen');
  // Guide Screen anzeigen
  zeige('s-guide');
}

function guideZurueck() {
  zeige('s-start');
}

function guideOeffneDetail(id) {
  var w = GUIDE_DATEN[id];
  if (!w) return;

  document.getElementById('guide-detail-emoji').textContent       = w.emoji;
  document.getElementById('guide-detail-name').textContent        = w.name;
  document.getElementById('guide-detail-tagline').textContent     = w.tagline;
  document.getElementById('guide-detail-beschreibung').textContent = w.beschreibung;

  var prioText  = { essential: 'Essentiell', empfohlen: 'Empfohlen', optional: 'Optional' };
  var prioFarbe = { essential: '#FF6B00', empfohlen: '#10B981', optional: '#6B7280' };
  var prioEl = document.getElementById('guide-detail-prio');
  prioEl.textContent   = prioText[w.prioritaet] || w.prioritaet;
  prioEl.style.color   = prioFarbe[w.prioritaet] || '#6B7280';
  prioEl.style.background = (w.prioritaet === 'essential') ? 'rgba(255,107,0,0.15)' :
                             (w.prioritaet === 'empfohlen') ? 'rgba(16,185,129,0.15)' :
                             'rgba(107,114,128,0.15)';
  prioEl.style.borderColor = prioFarbe[w.prioritaet] || '#6B7280';

  document.getElementById('guide-detail').classList.add('sichtbar');
}

function guideDetailZurueck() {
  document.getElementById('guide-detail').classList.remove('sichtbar');
}


// ── HAMBURGER MENÜ ──
function initHamburger() {
  var overlay  = document.getElementById('hdr-menu-overlay');
  var btnMenu  = document.getElementById('btn-menu');
  var btnClose = document.getElementById('hdr-menu-close');
  var btnReset = document.getElementById('btn-reset-menu');

  if (!overlay) return;

  // Menü öffnen
  if (btnMenu) {
    btnMenu.addEventListener('click', function () {
      overlay.classList.add('offen');
    });
  }

  // Menü schliessen über X
  if (btnClose) {
    btnClose.addEventListener('click', function () {
      overlay.classList.remove('offen');
    });
  }

  // Menü schliessen per Klick auf Overlay-Hintergrund
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('offen');
  });

  // App zurücksetzen
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      overlay.classList.remove('offen');
      resetApp();
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initQueue();
  initBanner();
  initHamburger();

  // Produktdaten aus JSON laden (ersetzt inline DB)
  ladeProdukte();

  // Start-Button → Modal per JS erzeugen (nie im DOM bevor Klick)
  var btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.addEventListener('click', function () { oeffneStartModal(); });

function oeffneStartModal() {
  // Overlay
  var ov = document.createElement('div');
  ov.style.cssText = [
    'position:fixed','inset:0','background:rgba(0,0,0,0.78)',
    'z-index:9999','display:flex','align-items:center','justify-content:center',
    'padding:20px','backdrop-filter:blur(5px)','-webkit-backdrop-filter:blur(5px)',
    'animation:smFade 0.2s ease'
  ].join(';');

  // Fade-Animation einmalig einfügen
  if (!document.getElementById('sm-style')) {
    var st = document.createElement('style');
    st.id = 'sm-style';
    st.textContent = '@keyframes smFade{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(st);
  }

  // Modal-Box
  var box = document.createElement('div');
  box.style.cssText = [
    'background:#1C1C1C','border:1px solid rgba(255,255,255,0.09)',
    'border-radius:24px','padding:28px 22px','width:100%','max-width:440px',
    'display:flex','flex-direction:column','gap:14px',
    'box-shadow:0 24px 64px rgba(0,0,0,0.65)','position:relative'
  ].join(';');

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;';
  var titel = document.createElement('div');
  titel.style.cssText = "font-family:'Barlow Condensed',Impact,sans-serif;font-size:20px;font-weight:800;font-style:italic;text-transform:uppercase;letter-spacing:1px;color:#fff;";
  titel.textContent = 'Wie möchtest du starten?';
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:rgba(255,255,255,0.07);border:none;color:rgba(255,255,255,0.5);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  closeBtn.addEventListener('click', function() { document.body.removeChild(ov); });
  hdr.appendChild(titel);
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);

  // Hilfsfunktion: Option-Karte bauen
  function baueOption(icon, titleText, desc, ctaText, featured) {
    var card = document.createElement('div');
    card.style.cssText = [
      'position:relative','border-radius:16px','padding:20px 18px',
      'display:flex','gap:14px','cursor:pointer',
      'border:1px solid ' + (featured ? 'rgba(255,107,0,0.35)' : 'rgba(255,255,255,0.08)'),
      'background:' + (featured ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.03)'),
      'transition:border-color 0.18s,background 0.18s,transform 0.15s'
    ].join(';');
    card.addEventListener('mouseenter', function() {
      card.style.borderColor = featured ? 'rgba(255,107,0,0.65)' : 'rgba(255,255,255,0.18)';
      card.style.background  = featured ? 'rgba(255,107,0,0.11)' : 'rgba(255,255,255,0.07)';
      card.style.transform   = 'translateY(-1px)';
    });
    card.addEventListener('mouseleave', function() {
      card.style.borderColor = featured ? 'rgba(255,107,0,0.35)' : 'rgba(255,255,255,0.08)';
      card.style.background  = featured ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.03)';
      card.style.transform   = 'translateY(0)';
    });

    if (featured) {
      var badge = document.createElement('div');
      badge.textContent = 'Empfohlen';
      badge.style.cssText = 'position:absolute;top:-10px;left:18px;background:#FF6B00;color:#fff;font-family:\'Barlow Condensed\',Impact,sans-serif;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:2px 10px;border-radius:20px;';
      card.appendChild(badge);
    }

    var iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size:28px;line-height:1;flex-shrink:0;padding-top:2px;';
    iconEl.textContent = icon;
    card.appendChild(iconEl);

    var content = document.createElement('div');
    content.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    var t = document.createElement('div');
    t.style.cssText = "font-family:'Barlow Condensed',Impact,sans-serif;font-size:17px;font-weight:800;font-style:italic;text-transform:uppercase;letter-spacing:0.5px;color:#fff;";
    t.textContent = titleText;

    var d = document.createElement('div');
    d.style.cssText = 'font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55);';
    d.textContent = desc;

    var cta = document.createElement('div');
    cta.style.cssText = 'font-size:13px;font-weight:600;color:#FF6B00;margin-top:2px;';
    cta.textContent = ctaText;

    content.appendChild(t);
    content.appendChild(d);
    content.appendChild(cta);
    card.appendChild(content);
    return card;
  }

  // Option 1: Persönlicher Stack
  var optQuiz = baueOption(
    '🎯',
    'Persönlicher Stack',
    'Beantworte 10 kurze Fragen zu Ziel, Ernährung und Körper — wir stellen dir exakt die Supplements zusammen, die für dich wirken. Mit Dosierungen, Timing und personalisierten Alternativen.',
    'Quiz starten →',
    true
  );
  optQuiz.addEventListener('click', function() {
    document.body.removeChild(ov);
    zeigeQuiz();
  });

  // Option 2: Alle Produkte
  var optShop = baueOption(
    '🛒',
    'Alle Produkte',
    'Direkt zum vollständigen Sortiment. Ohne Empfehlung, ohne Filter — du entscheidest selbst was in deinen Stack kommt.',
    'Produkte ansehen →',
    false
  );
  optShop.addEventListener('click', function() {
    document.body.removeChild(ov);
    zeigeShop();
  });

  box.appendChild(optQuiz);
  box.appendChild(optShop);
  ov.appendChild(box);

  // Klick auf Hintergrund schließt Modal
  ov.addEventListener('click', function(ev) {
    if (ev.target === ov) document.body.removeChild(ov);
  });

  document.body.appendChild(ov);
}

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


/* ============================================================
   KI-CHAT – Floating Button & Overlay
   Verbindet sich mit dem Cloudflare Worker (sicherer Proxy)
   Kennt: Wirkstoffe, Produkte, Quiz-Antworten, User-Stack
============================================================ */

// ── Konfiguration ──
var KI_PROXY_URL = 'https://stronger-proxy.stronger-supplements.workers.dev';

// ── State ──
var kiOffen      = false;
var kiLaedt      = false;
var kiVerlauf    = [];   // Array von { role: 'user'|'assistant', content: '...' }
var kiBegruesst  = false;

// ── Komprimierter Wirkstoff-Index (für System-Prompt) ──
var KI_WIRKSTOFFE = {
  "magnesium":        { name: "Magnesium",         kat: "gesundheit",    prio: "essential",   tagline: "Muskelkontraktion, Nerven & Schlaf",          timing: "Abends", brands: ["ESN","Myprotein","Thorne","NOW Foods"] },
  "vitamin_d3_k2":    { name: "Vitamin D3+K2",     kat: "gesundheit",    prio: "essential",   tagline: "Knochen, Immunsystem & Testosteron",           timing: "Morgens zu Fett", brands: ["ESN","Myprotein","Thorne"] },
  "omega_3":          { name: "Omega-3",            kat: "gesundheit",    prio: "essential",   tagline: "Entzündung, Herz, Gehirn & Recovery",          timing: "Zu Mahlzeiten", brands: ["Norsan","Nordic Naturals","ESN"] },
  "zink":             { name: "Zink",               kat: "gesundheit",    prio: "essential",   tagline: "Testosteron, Immunsystem & Enzyme",             timing: "Morgens nüchtern", brands: ["ESN","Thorne","NOW Foods"] },
  "vitamin_c":        { name: "Vitamin C",          kat: "gesundheit",    prio: "empfohlen",   tagline: "Kollagensynthese & Antioxidans",                timing: "Morgens/mittags", brands: ["ESN","Myprotein","NOW Foods"] },
  "probiotika":       { name: "Probiotika",         kat: "verdauung",     prio: "empfohlen",   tagline: "Darmflora & Nährstoffaufnahme",                 timing: "Nüchtern morgens", brands: ["ESN","Thorne","NOW Foods"] },
  "verdauungsenzyme": { name: "Verdauungsenzyme",   kat: "verdauung",     prio: "empfohlen",   tagline: "Proteinverwertung & Blähungen",                 timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","Thorne"] },
  "whey_protein":     { name: "Whey Protein",       kat: "muskelaufbau",  prio: "essential",   tagline: "Muskelaufbau, Sättigung & Recovery",            timing: "Post-Workout", brands: ["ESN","Myprotein","Optimum Nutrition"] },
  "iso_clear":        { name: "Iso Clear",          kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Whey Isolat, fettarm & leichte Textur",         timing: "Post-Workout", brands: ["ESN","Myprotein","BioTechUSA"] },
  "kreatin":          { name: "Kreatin Monohydrat", kat: "muskelaufbau",  prio: "essential",   tagline: "Kraft, Schnellkraft & Muskelmasse",             timing: "Täglich konsistent", brands: ["ESN","Myprotein","Optimum Nutrition"] },
  "eaa_bcaa":         { name: "EAA & BCAA",         kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Muskelproteinsynthese & Anti-Katabolismus",     timing: "Intra-Workout", brands: ["ESN","Myprotein","BioTechUSA"] },
  "pre_workout":      { name: "Pre-Workout",        kat: "muskelaufbau",  prio: "optional",    tagline: "Energie, Fokus & Pump",                         timing: "20-30 Min. vor Training", brands: ["ESN","Myprotein","BioTechUSA"] },
  "l_carnitin":       { name: "L-Carnitin",         kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Fettverbrennung & Energie",                     timing: "Vor Training/Mahlzeit", brands: ["ESN","Myprotein","NOW Foods"] },
  "beta_alanin":      { name: "Beta-Alanin",        kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Ausdauer & Muskelpuffer",                       timing: "Pre-Workout", brands: ["ESN","Myprotein","NOW Foods"] },
  "ashwagandha":      { name: "Ashwagandha",        kat: "regeneration",  prio: "empfohlen",   tagline: "Cortisol senken, Schlaf & Stressresistenz",     timing: "Abends", brands: ["ESN","Myprotein","Thorne"] },
  "melatonin":        { name: "Melatonin",          kat: "regeneration",  prio: "optional",    tagline: "Einschlafhilfe & Schlafqualität",               timing: "30 Min. vor Schlaf", brands: ["ESN","Myprotein","NOW Foods"] },
  "zma":              { name: "ZMA",                kat: "regeneration",  prio: "optional",    tagline: "Zink + Magnesium + B6 für Schlaf & Testosteron", timing: "Abends nüchtern", brands: ["ESN","Myprotein","NOW Foods"] },
  "kollagen":         { name: "Kollagen Peptide",   kat: "gelenke",       prio: "empfohlen",   tagline: "Gelenke, Haut & Bindegewebe",                   timing: "Mit Vitamin C", brands: ["Norsan","ESN","Myprotein"] },
  "glucosamin_chond": { name: "Glucosamin+Chondroitin", kat: "gelenke",  prio: "optional",    tagline: "Knorpelschutz & Gelenkschmierung",              timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","Thorne"] },
  "curcumin":         { name: "Curcumin",           kat: "gelenke",       prio: "empfohlen",   tagline: "Entzündungshemmend & Antioxidans",              timing: "Zu Fett", brands: ["ESN","Thorne","NOW Foods"] },
  "l_glutamin":       { name: "L-Glutamin",         kat: "muskelaufbau",  prio: "optional",    tagline: "Darmgesundheit & Muskelregeneration",           timing: "Post-Workout/Abends", brands: ["ESN","Myprotein","NOW Foods"] },
  "hmb":              { name: "HMB",                kat: "muskelaufbau",  prio: "optional",    tagline: "Muskelschutz beim Abnehmen",                    timing: "Mit Mahlzeiten", brands: ["ESN","Myprotein","Thorne"] },
  "msm":              { name: "MSM",                kat: "gelenke",       prio: "optional",    tagline: "Schwefel für Gelenke & Haut",                   timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","NOW Foods"] },
  "grüner_tee_egcg":  { name: "Grüner Tee (EGCG)", kat: "fettabbau",     prio: "optional",    tagline: "Fettverbrennung & Antioxidans",                 timing: "Vor Training/morgens", brands: ["ESN","Myprotein","NOW Foods"] },
  "cla":              { name: "CLA",                kat: "fettabbau",     prio: "optional",    tagline: "Körperfettreduktion & Muskeldefinition",        timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","NOW Foods"] }
};

// ── System-Prompt aufbauen ──
// Wird bei jeder Anfrage neu gebaut damit User-Kontext aktuell ist
function kiSystemPrompt() {
  // Wirkstoff-Index als kompakter Text
  var wIndex = Object.entries(KI_WIRKSTOFFE).map(function(entry) {
    var w = entry[1];
    return w.name + ' [' + w.kat + ', ' + w.prio + ']: ' + w.tagline + ' · Timing: ' + w.timing + ' · Marken: ' + w.brands.join(', ');
  }).join('\n');

  // Quiz-Antworten des Users
  var quizInfo = 'Noch kein Quiz ausgefüllt.';
  if (AW && Object.keys(AW).length > 0) {
    var zeilen = [];
    if (AW.intro)       zeilen.push('Jahrgang: ' + AW.intro);
    if (AW.geschlecht)  zeilen.push('Geschlecht: ' + ({ A:'Männlich', B:'Weiblich', C:'k.A.' }[AW.geschlecht] || AW.geschlecht));
    if (AW.groesse)     zeilen.push('Größe: ' + AW.groesse + ' cm');
    if (AW.gewicht)     zeilen.push('Gewicht: ' + AW.gewicht + ' kg');
    if (AW.ziel)        zeilen.push('Ziel: ' + AW.ziel);
    if (AW.training)    zeilen.push('Training: ' + AW.training + 'x/Woche');
    if (AW.ernaehrung)  zeilen.push('Ernährung: ' + AW.ernaehrung);
    if (AW.schlaf)      zeilen.push('Schlaf: ' + AW.schlaf);
    if (AW.stress)      zeilen.push('Stress: ' + AW.stress);
    if (AW.allergien)   zeilen.push('Allergien: ' + AW.allergien);
    if (AW.medis)       zeilen.push('Medikamente: ' + AW.medis);
    quizInfo = zeilen.join('\n');
  }

  // Aktueller Stack des Users
  var stackInfo = 'Kein Stack ausgewählt.';
  if (meinStack && Object.keys(meinStack).length > 0) {
    stackInfo = Object.values(meinStack).map(function(s) {
      return '- ' + s.prod.name + ' (' + (s.preis || '?') + ' €/Monat)';
    }).join('\n');
  }

  // User-Name
  var userName = (NP && NP.name && NP.name !== 'Nutzer') ? NP.name : null;

  return [
    'Du bist der KI-Supplement-Assistent von SupplAI – einer App die Supplement-Stacks personalisiert empfiehlt.',
    'Du bist präzise, wissenschaftlich fundiert und sprichst den User direkt und freundlich an (Du-Form).',
    'Antworte kompakt (max. 3-4 Sätze) außer der User fragt nach einer detaillierten Erklärung.',
    'Verwende Emojis sparsam aber sinnvoll.',
    'Empfehle immer konkrete Produkte aus unserem Sortiment wenn möglich.',
    'Weise auf Wechselwirkungen, Überdosierungsrisiken und Timing-Regeln hin.',
    '',
    '── VERFÜGBARE WIRKSTOFFE & PRODUKTE ──',
    wIndex,
    '',
    '── USER-PROFIL (aus Quiz) ──',
    quizInfo,
    '',
    '── AKTUELLER STACK DES USERS ──',
    stackInfo,
    '',
    userName ? ('── USER-NAME: ' + userName) : '',
    '',
    'Halte dich an diese Daten. Erfinde keine Produkte oder Wirkstoffe die nicht im Index stehen.',
    'Du bist kein Arzt – weise bei medizinischen Fragen auf einen Arzt hin.'
  ].join('\n');
}

// ── Chat öffnen/schließen ──
function kiChatToggle() {
  kiOffen = !kiOffen;
  var overlay = document.getElementById('ki-overlay');
  var fab     = document.getElementById('ki-fab');
  var icon    = document.getElementById('ki-fab-icon');

  if (kiOffen) {
    overlay.classList.add('sichtbar');
    fab.classList.add('offen');
    icon.textContent = '✕';
    // Begrüßung beim ersten Öffnen
    if (!kiBegruesst) {
      kiBegruesst = true;
      setTimeout(function() { kiBegruessen(); }, 300);
    }
    // Fokus auf Eingabefeld
    setTimeout(function() {
      var inp = document.getElementById('ki-input');
      if (inp) inp.focus();
    }, 350);
  } else {
    overlay.classList.remove('sichtbar');
    fab.classList.remove('offen');
    icon.textContent = '💬';
  }
}

// ── Begrüßungsnachricht ──
function kiBegruessen() {
  var name = (NP && NP.name && NP.name !== 'Nutzer') ? ', ' + NP.name : '';
  var quizGemacht = AW && Object.keys(AW).length > 5;
  var stackVorhanden = meinStack && Object.keys(meinStack).length > 0;

  var text;
  if (quizGemacht && stackVorhanden) {
    text = 'Hey' + name + '! 👋 Ich kenne deinen Stack und dein Profil. Frag mich alles – Timing, Dosierung, Wechselwirkungen oder neue Empfehlungen.';
  } else if (quizGemacht) {
    text = 'Hey' + name + '! 👋 Ich hab dein Quiz-Profil geladen. Stell mir eine Frage zu deinen Supplements oder deinem Stack.';
  } else {
    text = 'Hey' + name + '! 👋 Ich bin dein persönlicher Supplement-Assistent. Frag mich alles – von Kreatin bis Vitamin D. Tipp: Füll das Quiz aus für personalisierte Empfehlungen.';
  }

  kiNachrichtHinzufuegen('ki', text);
}

// ── Nachricht zum Chat hinzufügen ──
function kiNachrichtHinzufuegen(rolle, text) {
  var container = document.getElementById('ki-messages');
  if (!container) return;

  var div = document.createElement('div');
  div.className = 'ki-msg ki-msg-' + rolle;

  var bubble = document.createElement('div');
  bubble.className = 'ki-msg-bubble';
  // Zeilenumbrüche respektieren
  bubble.innerHTML = text.replace(/\n/g, '<br>');

  div.appendChild(bubble);
  container.appendChild(div);

  // Scroll nach unten
  container.scrollTop = container.scrollHeight;
}

// ── Tipp-Indikator anzeigen/verstecken ──
function kiTippAnzeigen(an) {
  var container = document.getElementById('ki-messages');
  var status    = document.getElementById('ki-status');
  if (!container) return;

  var bestehend = document.getElementById('ki-typing-indicator');

  if (an && !bestehend) {
    var div = document.createElement('div');
    div.id = 'ki-typing-indicator';
    div.className = 'ki-msg ki-msg-ki';
    div.innerHTML = '<div class="ki-msg-bubble"><div class="ki-typing"><span></span><span></span><span></span></div></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (status) { status.textContent = 'schreibt…'; status.classList.add('tippt'); }
  } else if (!an && bestehend) {
    bestehend.remove();
    if (status) { status.textContent = 'Online · Dein Supplement-Experte'; status.classList.remove('tippt'); }
  }
}

// ── Nachricht senden ──
function kiSenden() {
  if (kiLaedt) return;

  var input = document.getElementById('ki-input');
  var text  = input ? input.value.trim() : '';
  if (!text) return;

  // Eingabefeld leeren
  input.value = '';
  kiAutoResize(input);

  // User-Nachricht anzeigen
  kiNachrichtHinzufuegen('user', text);

  // Verlauf aktualisieren
  kiVerlauf.push({ role: 'user', content: text });

  // Verlauf auf max. 10 Nachrichten begrenzen (Kosten sparen)
  if (kiVerlauf.length > 10) {
    kiVerlauf = kiVerlauf.slice(kiVerlauf.length - 10);
  }

  // KI anfragen
  kiAnfragen();
}

// ── API-Anfrage an Cloudflare Worker ──
function kiAnfragen() {
  kiLaedt = true;
  kiTippAnzeigen(true);

  var sendBtn = document.getElementById('ki-send');
  if (sendBtn) sendBtn.disabled = true;

  fetch(KI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: kiSystemPrompt(),
      messages:     kiVerlauf
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(daten) {
    kiLaedt = false;
    kiTippAnzeigen(false);
    if (sendBtn) sendBtn.disabled = false;

    // Antwort extrahieren
    var antwort = '';
    if (daten.content && daten.content[0] && daten.content[0].text) {
      antwort = daten.content[0].text;
    } else if (daten.error) {
      antwort = '⚠️ Fehler: ' + daten.error;
    } else {
      antwort = '⚠️ Unbekannter Fehler. Bitte versuche es nochmal.';
    }

    // Antwort zum Verlauf hinzufügen und anzeigen
    kiVerlauf.push({ role: 'assistant', content: antwort });
    kiNachrichtHinzufuegen('ki', antwort);
  })
  .catch(function(err) {
    kiLaedt = false;
    kiTippAnzeigen(false);
    if (sendBtn) sendBtn.disabled = false;
    kiNachrichtHinzufuegen('ki', '⚠️ Verbindungsfehler. Prüfe deine Internetverbindung.');
    console.error('KI-Fehler:', err);
  });
}

// ── Enter-Taste senden (Shift+Enter = neue Zeile) ──
function kiKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    kiSenden();
  }
}

// ── Textarea Höhe automatisch anpassen ──
function kiAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

