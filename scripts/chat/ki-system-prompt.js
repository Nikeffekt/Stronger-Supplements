/* ============================================================
   ki-system-prompt.js – Stronger KI-Assistent System-Prompt

   Wird VOR ki-chat.js geladen, NACH ki-context-loader.js.

   Aufgabe: Basis-System-Prompt erzeugen (immer mit dabei).
   Smart-Loaded Wirkstoff-Details werden in ki-chat.js
   zusaetzlich angehaengt.

   Abhaengigkeiten:
   - state.js              (AW, NP, meinStack, WIRKSTOFFE_WISSEN, DB)
   - ki-context-loader.js  (kiLadeKontextFuerNachricht)
============================================================ */


/* ──────────────────────────────────────────────────────────
   WIRKSTOFF-UEBERSICHT (kompakt fuer Basis-Prompt)
   Aus WIRKSTOFFE_WISSEN nur die wichtigsten Felder
────────────────────────────────────────────────────────── */
function kiBaueWirkstoffUebersicht() {
  if (typeof WIRKSTOFFE_WISSEN === 'undefined' || !WIRKSTOFFE_WISSEN) {
    return '(Wissensbasis noch nicht geladen)';
  }

  var zeilen = [];
  Object.keys(WIRKSTOFFE_WISSEN).forEach(function (wid) {
    if (wid === '_meta') return;
    var w = WIRKSTOFFE_WISSEN[wid];
    if (!w || !w.name) return;

    // Kompakt: Name [Kategorie, Level-X] – Kurzbeschreibung
    var lvl = (w.evidenz && w.evidenz.level) ? w.evidenz.level : '?';
    var kat = w.kategorie || '?';
    var kb  = w.kurz_beschreibung || '';

    // Kurzbeschreibung auf max 100 Zeichen kuerzen
    if (kb.length > 100) kb = kb.substring(0, 97) + '...';

    zeilen.push('- ' + w.name + ' [' + kat + ', Level ' + lvl + ']: ' + kb);
  });

  return zeilen.join('\n');
}


/* ──────────────────────────────────────────────────────────
   USER-PROFIL FORMATIEREN
   Quiz-Antworten lesbar darstellen
────────────────────────────────────────────────────────── */
function kiBaueUserProfil() {
  if (!AW || Object.keys(AW).length === 0) {
    return 'Noch kein Quiz ausgefuellt.';
  }

  var z = [];

  // Demografie
  if (AW.alter)       z.push('Alter: ' + AW.alter + ' Jahre');
  else if (AW.intro)  z.push('Jahrgang: ' + AW.intro);

  if (AW.geschlecht) {
    var g = { A: 'Maennlich', B: 'Weiblich' }[AW.geschlecht] || AW.geschlecht;
    z.push('Geschlecht: ' + g);
  }

  if (AW.gewicht)    z.push('Gewicht: ' + AW.gewicht + ' kg');

  // Training
  if (AW.training) {
    var tMap = {
      A: 'Krafttraining 4+ x/Woche',
      B: 'Krafttraining 2-3 x/Woche',
      C: 'Hauptsaechlich Cardio',
      D: 'Mix: Kraft + Cardio',
      E: 'Wenig Sport (max 1x/Woche)'
    };
    z.push('Training: ' + (tMap[AW.training] || AW.training));
  }

  if (AW.erfahrung) {
    var eMap = {
      einsteiger:        'Anfaenger (max. 1 Jahr)',
      fortgeschritten:   'Erfahren (1-3 Jahre)',
      profi:             'Sehr erfahren (3+ Jahre)'
    };
    z.push('Erfahrung: ' + (eMap[AW.erfahrung] || AW.erfahrung));
  }

  // Ziele (Multi-Select)
  if (AW.ziele) {
    var zMap = {
      A: 'Muskelaufbau', B: 'Fettabbau', C: 'Mehr Energie',
      D: 'Ausdauer', E: 'Regeneration', F: 'Gesundheit',
      G: 'Stress reduzieren'
    };
    var ziele = (AW.ziele || '').split(',').map(function (c) {
      return zMap[c.trim()] || c.trim();
    });
    z.push('Ziele: ' + ziele.join(', '));
  }

  // Ernaehrung
  if (AW.ernaehrung) {
    var enMap = {
      A: 'Alles essen', B: 'Flexitarisch', C: 'Pescetarisch',
      D: 'Vegetarisch', E: 'Vegan'
    };
    z.push('Ernaehrung: ' + (enMap[AW.ernaehrung] || AW.ernaehrung));
  }

  // Allergien
  if (AW.allergien && AW.allergien !== 'A') {
    var aMap = {
      B: 'Laktoseintoleranz', C: 'Milcheiweiss-Allergie',
      D: 'Fischallergie', E: 'Glutenunvertraeglichkeit',
      F: 'Sojaallergie'
    };
    var allergien = (AW.allergien || '').split(',').map(function (c) {
      return aMap[c.trim()] || c.trim();
    });
    z.push('Allergien: ' + allergien.join(', '));
  } else if (AW.allergien === 'A') {
    z.push('Allergien: keine');
  }

  // Medikamente / Erkrankungen – SICHERHEITSRELEVANT
  if (AW.medikamente && AW.medikamente !== 'A') {
    var mMap = {
      B: 'Blutverduenner / Gerinnungshemmer',
      C: 'Schilddruesenerkrankung',
      D: 'Bluthochdruck / Herzerkrankung',
      E: 'Nierenerkrankung',
      F: 'Lebererkrankung',
      G: 'Diabetes',
      H: 'Antidepressiva / Psychopharmaka'
    };
    var medis = (AW.medikamente || '').split(',').map(function (c) {
      return mMap[c.trim()] || c.trim();
    });
    z.push('!!! MEDIKAMENTE/ERKRANKUNGEN: ' + medis.join(', '));
  } else if (AW.medikamente === 'A') {
    z.push('Medikamente/Erkrankungen: keine');
  }

  // Situation
  if (AW.situation && AW.situation !== 'A') {
    var sMap = {
      B: 'Schwangerschaft/Stillzeit',
      C: 'Wechseljahre',
      D: 'Schlafprobleme',
      E: 'Reha/nach Krankheit'
    };
    var sits = (AW.situation || '').split(',').map(function (c) {
      return sMap[c.trim()] || c.trim();
    });
    z.push('Situation: ' + sits.join(', '));
  }

  return z.join('\n');
}


/* ──────────────────────────────────────────────────────────
   AKTUELLER STACK
────────────────────────────────────────────────────────── */
function kiBaueStack() {
  if (!meinStack || Object.keys(meinStack).length === 0) {
    return 'Kein Stack ausgewaehlt.';
  }

  var z = [];
  Object.keys(meinStack).forEach(function (sid) {
    var s = meinStack[sid];
    if (!s || !s.prod) return;
    var line = '- ' + (s.prod.marke || '') + ' ' + (s.prod.name || sid);
    if (s.preis) line += ' (' + s.preis + ' EUR/Monat)';
    z.push(line);
  });
  return z.join('\n');
}


/* ──────────────────────────────────────────────────────────
   HAUPT-FUNKTION
   Wird von ki-chat.js bei JEDER Anfrage aufgerufen.
   Kontext-Erweiterung passiert durch ki-context-loader.js
   in ki-chat.js (NACH dieser Basis-Prompt).
────────────────────────────────────────────────────────── */
function kiSystemPrompt() {
  var userName = (NP && NP.name && NP.name !== 'Nutzer') ? NP.name : null;
  var hasQuiz  = AW && Object.keys(AW).length > 0;
  var hasStack = meinStack && Object.keys(meinStack).length > 0;

  return [

    /* ── ROLLE & TON ── */
    'Du bist der KI-Assistent von Stronger – einer App fuer ' +
    'evidenzbasierte Supplement-Empfehlungen.',
    '',
    'TON UND STIL:',
    '- Locker und freundlich, aber fachlich praezise.',
    '- Du-Form, direkt, ohne unnoetige Hoeflichkeitsfloskeln.',
    '- Kompakt: standardmaessig 2-4 Saetze.',
    '- Bei komplexen Themen: laenger, gut strukturiert.',
    '- Emojis nur sparsam (max. 1 pro Antwort, wenn ueberhaupt).',
    '- Keine Marketing-Sprache, keine Heilsversprechen.',
    '',

    /* ── KERN-VERHALTENSREGELN ── */
    'VERHALTEN:',
    '1. EHRLICHKEIT geht ueber Verkaufsinteresse. Wenn etwas',
    '   ueberbewertet ist, sag das offen.',
    '2. Bei medizinisch heiklen Themen (Medikamente, Erkrankungen,',
    '   Schwangerschaft, Niere, Leber, Herz): IMMER Quellen nennen',
    '   und auf aerztliche Beratung verweisen.',
    '3. Bei allen anderen Themen: Quellen nur wenn User explizit',
    '   danach fragt – sonst stoert es den Gespraechsfluss.',
    '4. Wenn du etwas nicht weisst: sag das ehrlich.',
    '5. Erfinde KEINE Produkte, Wirkstoffe oder Studien.',
    '   Halte dich strikt an die Wissensbasis.',
    '6. Bei Mythen (z.B. "Schadet Kreatin den Nieren?"): klar',
    '   aufklaeren mit Quelle.',
    '',

    /* ── SICHERHEITS-PROTOKOLL (immer aktiv) ── */
    'SICHERHEITS-REGELN:',
    '- Curcumin: HART ausschliessen bei Lebererkrankung (DILIN-Daten)',
    '  und bei Blutverduennern.',
    '- Ashwagandha: HART ausschliessen bei Schilddruesenerkrankung',
    '  und Antidepressiva.',
    '- Kreatin, ZMA, HMB: HART ausschliessen bei Nierenerkrankung.',
    '- Pre-Workout: HART ausschliessen bei Herz/Hypertonie/',
    '  Antidepressiva/Diabetes/Schilddruese.',
    '- Vitamin K2: HART ausschliessen bei Blutverduennern.',
    '- Melatonin: HART ausschliessen bei Antidepressiva.',
    '- Schwangerschaft: STARK eingeschraenkte Auswahl, viele',
    '  Wirkstoffe ausgeschlossen.',
    '- Notfall-Symptome (Atemnot, Brustschmerz, Ohnmacht, schwere',
    '  allergische Reaktion): sofort auf Notfallversorgung verweisen.',
    '',

    /* ── EMPFEHLUNGS-LOGIK ── */
    'EMPFEHLUNGEN:',
    'Du gibst aktuell KEINE eigenen Stack-Empfehlungen.',
    '- Wenn der User das Quiz gemacht hat: erklaere seinen',
    '  vorhandenen Stack oder beantworte Detail-Fragen dazu.',
    '- Wenn User nach NEUEN Empfehlungen fragt: erklaere',
    '  Hintergrund-Wissen zu passenden Wirkstoffen und verweise',
    '  freundlich aufs Quiz fuer eine personalisierte Auswertung.',
    '- Du kannst zu jedem einzelnen Wirkstoff alles erklaeren',
    '  (Wirkung, Dosis, Timing, Vorsicht).',
    '',

    /* ── WIRKSTOFF-UEBERSICHT (kompakt) ── */
    '── VERFUEGBARE WIRKSTOFFE IN DER WISSENSBASIS ──',
    '(Volldetails werden bei Bedarf zusaetzlich injected)',
    '',
    kiBaueWirkstoffUebersicht(),
    '',

    /* ── USER-KONTEXT ── */
    '── USER-PROFIL ──',
    userName ? ('Name: ' + userName) : 'Name: nicht angegeben',
    '',
    kiBaueUserProfil(),
    '',
    '── AKTUELLER STACK ──',
    kiBaueStack(),
    '',

    /* ── STATUS-FLAGS ── */
    'STATUS:',
    '- Quiz ausgefuellt: ' + (hasQuiz ? 'JA' : 'NEIN'),
    '- Stack vorhanden: ' + (hasStack ? 'JA' : 'NEIN'),
    '',

    'Bei jeder Antwort: respektiere das Profil, halte dich an',
    'die Sicherheitsregeln, und bleibe ehrlich.'

  ].join('\n');
}
