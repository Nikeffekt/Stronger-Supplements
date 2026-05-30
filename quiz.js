/* ============================================================
   quiz.js – SupplAI Quiz-Engine
   Enthält: Fragen, Antwort-Logik, Dosierungs-Engine
   Wird geladen von: index.html vor app.js
============================================================ */

// ── GLOBALER STATE ──
var AW = {};                          // Antworten des Nutzers
var NP = { name: '', email: '' };     // Nutzerprofil
var qIdx = 0;                         // Aktueller Fragen-Index
var multiSel = [];                    // Mehrfachauswahl Buffer
var fQueue = [];                      // Fragen-Queue

// ── AVATAR ENGINE ──
// Wählt passendes Emoji je nach Geschlecht und Alter
function getAvatar(a) {
  var w = a.geschlecht === 'B';
  var alter = a.intro;
  if (w) {
    if (alter === 'A') return '👧';
    if (alter === 'B' || alter === 'C') return '👩';
    if (alter === 'D') return '👩‍🦱';
    return '👩‍🦳';
  } else {
    if (alter === 'A') return '👦';
    if (alter === 'B' || alter === 'C') return '👨';
    if (alter === 'D') return '👨‍🦱';
    return '👨‍🦳';
  }
}

// ── FRAGEN-QUEUE ──
// Definiert alle Quiz-Fragen in der richtigen Reihenfolge
function initQueue() {
  fQueue = [
    {
      id: 'intro', typ: 'rad', tag: 'Schritt 1',
      frage: 'Wann bist du geboren?',
      hint: 'Beeinflusst Vitamin-D, Kollagen und Dosierungen.',
      min: 1940, max: 2010, std: 1990, absteigend: true
    },
    {
      id: 'geschlecht', typ: 'choice', tag: 'Schritt 2',
      frage: 'Biologisches Geschlecht?',
      hint: 'Relevant für Eisen, Magnesium und Dosierungen.',
      opts: [
        { k: 'A', l: 'Männlich' },
        { k: 'B', l: 'Weiblich' },
        { k: 'C', l: 'Keine Angabe' }
      ]
    },
    {
      id: 'groesse', typ: 'rad', tag: 'Schritt 3',
      frage: 'Wie groß bist du?',
      hint: 'Basis für BMI-Berechnung.',
      einheit: 'cm', min: 140, max: 220, std: 175
    },
    {
      id: 'gewicht', typ: 'rad', tag: 'Schritt 4',
      frage: 'Wie viel wiegst du?',
      hint: 'Grundlage für exakte Proteindosierung.',
      einheit: 'kg', min: 40, max: 200, std: 75
    },
    {
      id: 'training', typ: 'choice', tag: 'Schritt 5',
      frage: 'Deine Trainingsform?',
      hint: 'Bestimmt deinen Supplement-Bedarf.',
      opts: [
        { k: 'A', l: 'Kraft 4+×/Woche' },
        { k: 'B', l: 'Kraft 2–3×/Woche' },
        { k: 'C', l: 'Hauptsächlich Cardio' },
        { k: 'D', l: 'Mix' },
        { k: 'E', l: 'Wenig Sport' }
      ]
    },
    {
      id: 'erfahrung', typ: 'choice', tag: 'Schritt 6',
      frage: 'Deine Erfahrung?',
      hint: 'Einsteiger brauchen einfachere Stacks.',
      opts: [
        { k: 'einsteiger',     l: 'Einsteiger (< 1 Jahr)' },
        { k: 'fortgeschritten',l: 'Fortgeschritten (1–3 J.)' },
        { k: 'profi',          l: 'Profi (> 3 Jahre)' }
      ]
    },
    {
      id: 'ziele', typ: 'multi', tag: 'Schritt 7',
      frage: 'Deine Ziele?',
      hint: 'Mehrfachauswahl möglich.',
      opts: [
        { k: 'A', l: '💪 Muskelaufbau' },
        { k: 'B', l: '🔥 Fettabbau' },
        { k: 'C', l: '⚡ Mehr Energie' },
        { k: 'D', l: '🏃 Ausdauer' },
        { k: 'E', l: '😴 Regeneration' },
        { k: 'F', l: '❤️ Gesundheit' }
      ]
    },
    {
      id: 'ernaehrung', typ: 'choice', tag: 'Schritt 8',
      frage: 'Deine Ernährungsweise?',
      hint: 'Veganer brauchen andere Produkte.',
      opts: [
        { k: 'A', l: 'Alles' },
        { k: 'B', l: 'Flexitarisch' },
        { k: 'C', l: 'Vegetarisch' },
        { k: 'D', l: 'Vegan' }
      ]
    },
    {
      id: 'unvertraeglichkeiten', typ: 'multi', tag: 'Schritt 9',
      frage: 'Unverträglichkeiten oder Allergien?',
      hint: 'Beeinflusst direkt welche Produkte wir empfehlen.',
      exkl: 'A',
      opts: [
        { k: 'A', l: 'Keine' },
        { k: 'B', l: '🥛 Laktoseintoleranz' },
        { k: 'C', l: '🐟 Fischallergie' },
        { k: 'D', l: '🌾 Glutenunverträglichkeit' },
        { k: 'E', l: '🌱 Sojaallergie' }
      ]
    },
    {
      id: 'medikamente', typ: 'multi', tag: 'Schritt 10',
      frage: 'Medikamente oder Erkrankungen?',
      hint: 'Wichtig für deine Sicherheit – beeinflusst die Auswahl.',
      exkl: 'A',
      opts: [
        { k: 'A', l: 'Keine' },
        { k: 'B', l: 'Blutverdünner' },
        { k: 'C', l: 'Schilddrüsenerkrankung' },
        { k: 'D', l: 'Bluthochdruck' },
        { k: 'E', l: 'Nierenerkrankung' },
        { k: 'F', l: 'Diabetes' },
        { k: 'G', l: 'Antidepressiva' }
      ]
    },
    // Situationsfrage wird dynamisch via injectSituation() angehängt
  ];
}

// ── SITUATIONSFRAGE DYNAMISCH EINBAUEN ──
// Wird nach Geschlecht- und Medikamente-Frage aufgerufen
function injectSituation() {
  var geschlecht = AW['geschlecht'];
  var alter      = AW['intro'];
  var w          = geschlecht === 'B';
  var aelteresFrau = w && (alter === 'C' || alter === 'D' || alter === 'E');
  var jungesFrau   = w && (alter === 'A' || alter === 'B' || alter === 'C');

  // Vorherige Situationsfrage entfernen
  fQueue = fQueue.filter(function (f) { return f.id !== 'situation'; });

  var opts = [{ k: 'A', l: 'Keine besondere Situation' }];

  if (w) {
    if (jungesFrau || alter === 'C') {
      opts.push({ k: 'B', l: '🤰 Schwanger oder stillend' });
    }
    if (aelteresFrau) {
      opts.push({ k: 'C', l: '🌸 Wechseljahre' });
    }
  }
  opts.push({ k: 'D', l: '😴 Starke Schlafprobleme' });

  if (opts.length > 2) {
    fQueue.push({
      id: 'situation', typ: 'choice',
      tag: 'Schritt ' + (fQueue.length + 1),
      frage: 'Gibt es etwas Besonderes das wir berücksichtigen sollen?',
      hint: 'Beeinflusst deine Supplement-Empfehlung.',
      opts: opts
    });
  } else {
    fQueue.push({
      id: 'situation', typ: 'choice',
      tag: 'Schritt ' + (fQueue.length + 1),
      frage: 'Hast du Schlafprobleme?',
      hint: 'Bestimmte Supplements können gezielt helfen.',
      opts: [
        { k: 'A', l: 'Nein, ich schlafe gut' },
        { k: 'D', l: '😴 Ja, ich habe Schlafprobleme' }
      ]
    });
  }
}

// ── QUIZ STARTEN ──
function zeigeQuiz() {
  qIdx = 0;
  multiSel = [];
  initQueue();
  zeige('s-quiz');
  renderFrage();
}

// ── FRAGE RENDERN ──
// Baut die aktuelle Frage als HTML auf und injiziert sie ins DOM
function renderFrage() {
  var f = fQueue[qIdx];
  var tot = fQueue.length;

  // Fortschrittsbalken aktualisieren
  document.getElementById('prog').style.width = Math.round((qIdx / tot) * 100) + '%';
  document.getElementById('prog-txt').textContent = qIdx + ' / ' + tot;
  multiSel = [];

  var h = '<div class="quiz-tag">' + f.tag + '</div>';
  h += '<div class="quiz-q">' + f.frage + '</div>';
  h += '<div class="quiz-hint">' + (f.hint || '') + '</div>';

  // Einfachauswahl
  if (f.typ === 'choice') {
    var cls = f.opts.length <= 3 ? 'aw-list' : 'aw-list grid2';
    h += '<div class="' + cls + '" id="aw-c">';
    for (var i = 0; i < f.opts.length; i++) {
      var o = f.opts[i];
      var sel = AW[f.id] === o.k ? ' sel' : '';
      h += '<button class="aw-btn tipp' + sel + '" data-t="choice" data-k="' + o.k + '">';
      h += '<span class="aw-key">' + (i + 1) + '</span>';
      h += '<span>' + o.l + '</span>';
      h += '<span class="aw-check">✓</span>';
      h += '</button>';
    }
    h += '</div>';
    h += '<div class="quiz-nav"><button class="btn-ghost" id="btn-z">← Zurück</button></div>';
  }

  // Mehrfachauswahl
  if (f.typ === 'multi') {
    h += '<div class="aw-list" id="aw-c">';
    for (var i = 0; i < f.opts.length; i++) {
      var o = f.opts[i];
      h += '<button class="aw-btn tipp" data-t="multi" data-k="' + o.k + '" data-ex="' + (f.exkl || '') + '">';
      h += '<span class="aw-key">' + (i + 1) + '</span>';
      h += '<span>' + o.l + '</span>';
      h += '<span class="aw-check">✓</span>';
      h += '</button>';
    }
    h += '</div>';
    h += '<div class="quiz-nav">';
    h += '<button class="btn-ghost" id="btn-z">← Zurück</button>';
    h += '<button class="btn-primary" id="btn-w" style="width:auto;padding:12px 24px;font-size:14px;">Weiter →</button>';
    h += '</div>';
  }

  // Wert-Rad (Geburtsjahr, Gewicht, …)
  if (f.typ === 'rad') {
    var radKey    = f.id === 'intro' ? 'geburtsjahr' : f.id;
    var aktWert   = AW[radKey] || f.std;
    var einheit   = f.einheit ? ' ' + f.einheit : '';
    // Werte-Array aufbauen
    var radWerte = [];
    if (f.absteigend) {
      for (var rv = f.max; rv >= f.min; rv--) radWerte.push(rv);
    } else {
      for (var rv = f.min; rv <= f.max; rv++) radWerte.push(rv);
    }
    var radLabel = f.id === 'intro' ? 'Geburtsjahr' : (f.einheit ? 'Gewicht in ' + f.einheit : 'Wert');
    h += '<div class="yw-outer">';
    h += '<div class="yw-label">' + radLabel + '</div>';
    h += '<div class="yw-container">';
    h += '<div class="yw-scroll" id="yw-scroll">';
    for (var ri = 0; ri < radWerte.length; ri++) {
      h += '<div class="yw-item" data-val="' + radWerte[ri] + '">' + radWerte[ri] + einheit + '</div>';
    }
    h += '</div>';
    h += '<div class="yw-line top"></div>';
    h += '<div class="yw-line bot"></div>';
    h += '</div>';
    h += '<div class="yw-selected-display" id="yw-display">' + aktWert + einheit + '</div>';
    h += '</div>';
    h += '<div class="quiz-nav">';
    h += '<button class="btn-ghost" id="btn-z">← Zurück</button>';
    h += '<button class="btn-primary" id="btn-w" style="width:auto;padding:12px 24px;font-size:14px;">Weiter →</button>';
    h += '</div>';
  }

  // Numerische Eingabe
  if (f.typ === 'nummer') {
    h += '<div class="num-wrap">';
    h += '<input type="number" class="num-inp" id="num-inp" min="' + f.min + '" max="' + f.max + '" value="' + f.std + '" inputmode="numeric">';
    h += '<span class="num-unit">' + f.einheit + '</span>';
    h += '</div>';
    h += '<div class="quiz-nav">';
    h += '<button class="btn-ghost" id="btn-z">← Zurück</button>';
    h += '<button class="btn-primary" id="btn-w" style="width:auto;padding:12px 24px;font-size:14px;">Weiter →</button>';
    h += '</div>';
  }

  document.getElementById('quiz-box').innerHTML = h;
  bindQuiz(f);
}

// ── EVENT BINDING ──
// Verbindet alle Buttons der aktuellen Frage mit ihren Aktionen
function bindQuiz(f) {
  // Zurück-Button
  var bz = document.getElementById('btn-z');
  if (bz) bz.addEventListener('click', function () {
    if (qIdx > 0) { qIdx--; renderFrage(); }
    else zeige('s-start');
  });

  // Wert-Rad initialisieren
  if (f.typ === 'rad') {
    var ywScroll  = document.getElementById('yw-scroll');
    var ywDisplay = document.getElementById('yw-display');
    var ywItems   = ywScroll ? ywScroll.querySelectorAll('.yw-item') : [];
    var radKeyB   = f.id === 'intro' ? 'geburtsjahr' : f.id;
    var aktWertB  = AW[radKeyB] || f.std;
    var einheitB  = f.einheit ? ' ' + f.einheit : '';
    var itemH     = 52;

    // Werte-Array spiegeln wie beim Rendern
    var radWerteB = [];
    if (f.absteigend) {
      for (var rv = f.max; rv >= f.min; rv--) radWerteB.push(rv);
    } else {
      for (var rv = f.min; rv <= f.max; rv++) radWerteB.push(rv);
    }

    // Startposition auf gespeicherten/Standard-Wert setzen
    var startIdxB = radWerteB.indexOf(aktWertB);
    if (startIdxB < 0) startIdxB = radWerteB.indexOf(f.std);
    if (startIdxB < 0) startIdxB = 0;
    if (ywScroll) ywScroll.scrollTop = startIdxB * itemH;

    // Highlight: Mittel-Item orange+groß, Nachbarn abgestuft
    function ywHighlight() {
      if (!ywScroll) return;
      var idx = Math.round(ywScroll.scrollTop / itemH);
      idx = Math.max(0, Math.min(idx, ywItems.length - 1));
      var wert = radWerteB[idx];
      if (ywDisplay) ywDisplay.textContent = wert + einheitB;
      for (var i = 0; i < ywItems.length; i++) {
        var dist = Math.abs(i - idx);
        if (dist === 0) {
          ywItems[i].style.color      = '#FF6B00';
          ywItems[i].style.fontSize   = '28px';
          ywItems[i].style.fontWeight = '900';
        } else if (dist === 1) {
          ywItems[i].style.color      = 'rgba(255,255,255,0.55)';
          ywItems[i].style.fontSize   = '22px';
          ywItems[i].style.fontWeight = '700';
        } else if (dist === 2) {
          ywItems[i].style.color      = 'rgba(255,255,255,0.25)';
          ywItems[i].style.fontSize   = '18px';
          ywItems[i].style.fontWeight = '600';
        } else {
          ywItems[i].style.color      = 'rgba(255,255,255,0.1)';
          ywItems[i].style.fontSize   = '15px';
          ywItems[i].style.fontWeight = '500';
        }
      }
    }

    // Klick auf Item scrollt direkt hin
    for (var i = 0; i < ywItems.length; i++) {
      (function(item, idx) {
        item.addEventListener('click', function() {
          ywScroll.scrollTo({ top: idx * itemH, behavior: 'smooth' });
        });
      })(ywItems[i], i);
    }

    ywHighlight();
    if (ywScroll) ywScroll.addEventListener('scroll', ywHighlight);
  }

  // Weiter-Button (Multi, Nummer & Rad)
  var bw = document.getElementById('btn-w');
  if (bw) bw.addEventListener('click', function () {
    if (f.typ === 'multi') {
      if (!multiSel.length) { toast('Bitte wähle mindestens eine Option.'); return; }
      AW[f.id] = multiSel.slice();
    } else if (f.typ === 'nummer') {
      var v = document.getElementById('num-inp').value;
      if (!v || parseFloat(v) < f.min || parseFloat(v) > f.max) {
        toast('Bitte ' + f.min + '–' + f.max + ' eingeben.');
        return;
      }
      AW[f.id] = v;
    } else if (f.typ === 'rad') {
      // Aktuellen Wert aus Scroll-Position ablesen
      var yw = document.getElementById('yw-scroll');
      var ridx = yw ? Math.round(yw.scrollTop / 52) : 0;
      var radWerteW = [];
      if (f.absteigend) {
        for (var rv = f.max; rv >= f.min; rv--) radWerteW.push(rv);
      } else {
        for (var rv = f.min; rv <= f.max; rv++) radWerteW.push(rv);
      }
      ridx = Math.max(0, Math.min(ridx, radWerteW.length - 1));
      var gewaehlterWert = radWerteW[ridx];

      if (f.id === 'intro') {
        // Geburtsjahr → Alterskategorie A–E
        AW['geburtsjahr'] = gewaehlterWert;
        var alter = new Date().getFullYear() - gewaehlterWert;
        AW[f.id] = alter < 18 ? 'A' : alter <= 25 ? 'B' : alter <= 35 ? 'C' : alter <= 45 ? 'D' : 'E';
      } else {
        // Numerischer Wert direkt speichern (z.B. Gewicht in kg)
        AW[f.id] = String(gewaehlterWert);
      }
    }
    naechste();
  });

  // Antwort-Buttons
  var ac = document.getElementById('aw-c');
  if (!ac) return;
  var btns = ac.querySelectorAll('.aw-btn');

  for (var i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var t  = btn.getAttribute('data-t');
        var k  = btn.getAttribute('data-k');
        var ex = btn.getAttribute('data-ex');

        if (t === 'choice') {
          // Einfachauswahl: alle deselektieren, diesen selektieren, sofort weiter
          for (var j = 0; j < btns.length; j++) btns[j].classList.remove('sel');
          btn.classList.add('sel');
          AW[f.id] = k;
          setTimeout(naechste, 260);

        } else {
          // Mehrfachauswahl mit Exklusiv-Option (z.B. "Keine")
          if (ex && k === ex) {
            for (var j = 0; j < btns.length; j++) btns[j].classList.remove('sel');
            multiSel = [k];
            btn.classList.add('sel');
          } else {
            // Exklusiv-Option deselektieren falls aktiv
            if (ex) {
              for (var j = 0; j < btns.length; j++) {
                if (btns[j].getAttribute('data-k') === ex) btns[j].classList.remove('sel');
              }
              multiSel = multiSel.filter(function (x) { return x !== ex; });
            }
            // Toggle dieser Option
            if (btn.classList.contains('sel')) {
              btn.classList.remove('sel');
              multiSel = multiSel.filter(function (x) { return x !== k; });
            } else {
              btn.classList.add('sel');
              multiSel.push(k);
            }
          }
        }
      });
    })(btns[i]);
  }
}

// ── NÄCHSTE FRAGE ──
function naechste() {
  var aktFrage = fQueue[qIdx];
  // Nach Geschlecht oder Medikamente → Situationsfrage dynamisch einbauen
  if (aktFrage && (aktFrage.id === 'geschlecht' || aktFrage.id === 'medikamente')) {
    injectSituation();
  }
  qIdx++;
  if (qIdx >= fQueue.length) zeige('s-login');
  else renderFrage();
}

// ── DOSIERUNGS-ENGINE ──
// Gibt personalisierte Dosierung und Einnahmezeitpunkt zurück
function dosis(id, a) {
  var kg  = parseFloat(a.gewicht) || 75;
  var w   = a.geschlecht === 'B';
  var ki  = a.training === 'A';
  var tr  = a.training !== 'E';
  var mu  = (a.ziele || []).indexOf('A') >= 0;

  // Tägliches Protein-Ziel berechnen
  var pb = mu && ki ? Math.round(kg * 2) : mu ? Math.round(kg * 1.8) : tr ? Math.round(kg * 1.6) : Math.round(kg * 1.2);
  var pp = w ? '20–25 g' : '25–35 g';
  var kd = kg <= 70 ? '3 g' : '5 g';
  var md = w ? (ki ? '300 mg' : '250 mg') : (ki ? '400 mg' : '350 mg');
  var vd = (a.intro === 'D' || a.intro === 'E') ? '2.000–4.000 IE' : '1.000–2.000 IE';
  var od = tr ? '2–3 g EPA/DHA' : '1–2 g EPA/DHA';

  var M = {
    'whey_protein':    { d: pp + ' (Ziel: ' + pb + ' g)', z: 'Nach dem Training' },
    'iso_clear':       { d: pp + ' (Ziel: ' + pb + ' g)', z: 'Nach dem Training' },
    'pflanzenprotein': { d: pp + ' (Ziel: ' + pb + ' g)', z: 'Nach dem Training' },
    'kreatin':         { d: kd + ' täglich',               z: 'Täglich – egal wann' },
    'magnesium':       { d: md,                             z: 'Abends vor dem Schlafen' },
    'omega3':          { d: od,                             z: 'Zu einer Mahlzeit' },
    'omega3_vegan':    { d: od,                             z: 'Zu einer Mahlzeit' },
    'vitamin_d3':      { d: vd + ' D3 + 100µg K2',         z: 'Morgens zum Frühstück' },
    'vitamin_b12':     { d: '500µg Methylcobalamin',        z: 'Morgens nüchtern' },
    'eisen':           { d: (w ? '18' : '10') + ' mg Bisglycinat', z: 'Morgens nüchtern' },
    'ashwagandha':     { d: '300–600 mg',                   z: 'Abends vor dem Schlafen' },
    'l_carnitin':      { d: '1.500–2.000 mg',               z: 'Vor dem Training' },
    'beta_alanin':     { d: '3.200 mg',                     z: 'Vor dem Training' },
    'elektrolyte':     { d: '1 Portion',                    z: 'Während dem Training' },
    'vitamin_c':       { d: '500–1.000 mg',                 z: 'Morgens zum Frühstück' },
    'zink':            { d: '15 mg',                        z: 'Abends' },
    'kollagen':        { d: '10 g',                         z: 'Morgens nüchtern' },
    'eaas':            { d: '10–15 g',                      z: 'Während dem Training' },
    'l_glutamin':      { d: '5 g',                          z: 'Nach dem Training' },
    'multivitamin':    { d: '1 Kapsel',                     z: 'Morgens zum Frühstück' },
    'zma':             { d: '1 Portion',                    z: 'Abends vor dem Schlafen' },
    'pre_workout':     { d: '1 Portion vor Training',       z: 'Vor dem Training' },
    'curcumin':        { d: '500 mg Curcuminoide',          z: 'Zu einer Mahlzeit' },
    'probiotika':      { d: '≥10 Mrd. CFU',                 z: 'Morgens nüchtern' },
    'melatonin':       { d: '0,5–1 mg',                     z: 'Abends vor dem Schlafen' },
    'hmb':             { d: '3.000 mg (3× täglich)',         z: 'Über den Tag verteilt' },
  };

  return M[id] || { d: 'Laut Produktangabe', z: 'Täglich' };
}
