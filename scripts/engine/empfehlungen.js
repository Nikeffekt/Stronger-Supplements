/* ============================================================
   engine/empfehlungen.js
   Kernlogik: berechnet personalisierten Supplement-Stack
   anhand der Quiz-Antworten
   Ausgelagert aus app.js

   Abhängigkeiten:
   - loesOverlaps() (aus engine/overlaps.js)
   Genutzt von: app.js → zeigeProfil(), getEmpIcon(), getEmpName()

   Fixes:
   - Bug #2: ZMA wird aktiv empfohlen (war im Scoring vorhanden, aber nie gepusht)
   - L01:    Protein auch bei alter=E (45+) trotz wenig Sport (Sarkopenie)
   - L02:    Training 4+/Woche (kraft4) bekommt eigenen Protein-Faktor (2.2)
   - L03:    Vegan-Proteinbedarf erhöht (~15% mehr wegen geringerer Bioverfügbarkeit)
   - L04:    Stack-Maximum: max. 7 Essential+Empfohlen, max. 3 Optional
   - L06:    Menopause-Score für Vitamin D, Omega-3, Magnesium erhöht
   - L07:    Kollagen auch für Männer 50+ bei Kraft oder Regen
============================================================ */

function berechneEmpfehlungen(a) {
  var z         = a.ziele || [];
  var vegan     = a.ernaehrung === 'D';
  var w         = a.geschlecht === 'B';
  var alter     = a.intro;
  var erfahrung = a.erfahrung || 'einsteiger';
  var kraft4    = a.training === 'A';               // L02: 4+/Woche separat
  var kraft     = a.training === 'A' || a.training === 'B';
  var cardio    = a.training === 'C';
  var mix       = a.training === 'D';
  var wenig     = a.training === 'E';
  var vorh      = a.vorhanden || ['A'];
  var unvert    = a.unvertraeglichkeiten || ['A'];
  var meds      = a.medikamente || ['A'];
  var situation = a.situation || 'A';

  // Ziele
  var mu      = z.indexOf('A') >= 0;
  var fett    = z.indexOf('B') >= 0;
  var energie = z.indexOf('C') >= 0;
  var ausd    = z.indexOf('D') >= 0;
  var regen   = z.indexOf('E') >= 0;
  var health  = z.indexOf('F') >= 0;

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

  // Magnesium (nicht bei Wenig-Sport, außer 45+)
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

  // Protein
  // L01: auch bei 45+ (alter=E) trotz wenig Sport – Sarkopenie-Prävention
  // L02: Training 4+/Woche bekommt Faktor 2.2
  // L03: Vegan +15% wegen geringerer Bioverfügbarkeit pflanzlicher Proteine
  var brauchtProtein = !hatProt && (!wenig || alter === 'E');
  if (brauchtProtein) {
    var pId = vegan ? 'pflanzenprotein' : (hatLaktose || erfahrung === 'profi' ? 'iso_clear' : 'whey_protein');
    var kg = parseFloat(a.gewicht) || 75;
    var faktor;
    if (vegan) {
      // L03: Vegan-Faktor erhöht
      faktor = (mu && kraft4) ? 2.2 : (mu && kraft) ? 2.0 : mu ? 1.9 : 1.7;
    } else {
      // L02: kraft4 (4+/Woche) bekommt maximalen Faktor
      faktor = (mu && kraft4) ? 2.2 : (mu && kraft) ? 2.0 : mu ? 1.8 : 1.6;
    }
    var pb = Math.round(kg * faktor);
    var protGrund = wenig && alter === 'E'
      ? 'Ab 45: Muskelmasse schwindet ohne Protein (Sarkopenie) – auch bei wenig Sport wichtig'
      : 'Protein-Tagesziel: ' + pb + ' g – ohne Supplement kaum erreichbar';
    E.push({
      id: pId,
      prioritaet: 'essential',
      kategorie: 'performance',
      name: vegan ? 'Pflanzenprotein' : (hatLaktose ? 'ISO Clear (laktosefrei)' : 'Whey Protein'),
      ikon: '💪',
      fit_grund: protGrund
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

  // Kollagen
  // L07: auch für Männer 50+ bei Kraft oder Regen (nicht nur Frauen)
  var brauchtKollagen = (w && (alter === 'D' || alter === 'E' || regen)) ||
                        (!w && alter === 'E' && (kraft || regen));
  if (brauchtKollagen) {
    E.push({
      id: 'kollagen',
      prioritaet: 'optional',
      kategorie: 'gesundheit',
      name: 'Kollagen Peptide',
      ikon: '✨',
      fit_grund: !w
        ? 'Ab 45: Kollagenproduktion sinkt – Gelenke, Sehnen und Muskelqualität'
        : (alter === 'D' || alter === 'E')
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

  // Wechseljahre: Kollagen extra als empfohlen
  // (Bug #1 Fix in overlaps.js verhindert Duplikat mit dem optionalen Kollagen oben)
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

  // Bug #2 Fix: ZMA wird jetzt aktiv empfohlen
  // Hinweis: loesOverlaps() entfernt ZMA automatisch wenn Mg + Zink bereits einzeln empfohlen.
  // Bei Regen oder Schlaf + Kraft + nicht Einsteiger + kein Nierenproblem
  if ((regen || istSchlaf) && kraft && erfahrung !== 'einsteiger' && !hatNiere) {
    E.push({
      id: 'zma',
      prioritaet: 'optional',
      kategorie: 'regeneration',
      name: 'ZMA',
      ikon: '🌙',
      fit_grund: 'Zink + Magnesium + B6 – verbessert Schlaftiefe und hormonelle Regeneration nach intensivem Training'
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
      if (id === 'kreatin')     score += 380;
      if (id === 'eaas')        score += 200;
      if (id === 'pre_workout') score += 150;
      if (id === 'beta_alanin') score += 120;
      if (id === 'zink')        score += 100;
      if (id === 'kollagen')    score += 80;
      if (id === 'hmb')         score += 60;
    }

    // Fettabbau
    if (fett) {
      if (id === 'l_carnitin')  score += 350;
      if (id === 'whey_protein' || id === 'iso_clear' || id === 'pflanzenprotein') score += 300;
      if (id === 'elektrolyte') score += 200;
      if (id === 'hmb')         score += 180;
      if (id === 'vitamin_c')   score += 150;
      if (id === 'probiotika')  score += 100;
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
      if (id === 'vitamin_d3')                        score += 350;
      if (id === 'omega3' || id === 'omega3_vegan')   score += 300;
      if (id === 'multivitamin')                      score += 250;
      if (id === 'zink')                              score += 200;
      if (id === 'curcumin')                          score += 180;
      if (id === 'probiotika')                        score += 150;
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
      if (id === 'pflanzenprotein')                   score += 300;
      if (id === 'omega3_vegan')                      score += 300;
      if (id === 'vitamin_b12')                       score += 350;
    }

    // Frauen
    if (w) {
      if (id === 'eisen')                             score += 200;
      if (id === 'kollagen')                          score += 150;
      if (id === 'omega3' || id === 'omega3_vegan')   score += 100;
    }

    // Alter 36+
    if (alter === 'D' || alter === 'E') {
      if (id === 'kollagen')                          score += 150;
      if (id === 'curcumin')                          score += 150;
      if (id === 'vitamin_d3')                        score += 100;
      if (id === 'omega3' || id === 'omega3_vegan')   score += 100;
    }

    // L06: Wechseljahre – Basisbedarf nach vorne priorisieren
    if (istMeno) {
      if (id === 'kollagen')                          score += 350;
      if (id === 'vitamin_d3')                        score += 300;
      if (id === 'omega3' || id === 'omega3_vegan')   score += 250;
      if (id === 'magnesium')                         score += 200;
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

  // L04: Stack-Maximum – nach dem Sorting, damit die besten Supplements überleben
  // Essential + Empfohlen: max. 7 | Optional: max. 3
  var essEmp  = empfehlungen.filter(function (e) { return e.prioritaet !== 'optional'; });
  var optList = empfehlungen.filter(function (e) { return e.prioritaet === 'optional'; });
  if (essEmp.length  > 7) essEmp  = essEmp.slice(0, 7);
  if (optList.length > 3) optList = optList.slice(0, 3);
  empfehlungen = essEmp.concat(optList);

  return empfehlungen;
}
