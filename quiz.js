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
    'whey_protein':    { d: pp + ' (Ziel: ' + pb + ' g)', z: 'Nach dem Training',
      bsp: '🥤 Direkt nach dem Training: 1 Messlöffel mit 250–300 ml Wasser oder Milch shaken. Dein Körper nimmt Protein in den ersten 30–60 Min nach dem Training besonders effektiv auf. An trainingsfreien Tagen kannst du es als Zwischenmahlzeit oder zum Frühstück nehmen.' },
    'iso_clear':       { d: pp + ' (Ziel: ' + pb + ' g)', z: 'Nach dem Training',
      bsp: '🥤 Nach dem Training mit 300–400 ml Wasser mischen – Iso Clear löst sich besonders klar auf, fast wie ein Fruchtsaft. Ideal wenn dir klassische Shakes zu schwer im Magen liegen.' },
    'pflanzenprotein': { d: pp + ' (Ziel: ' + pb + ' g)', z: 'Nach dem Training',
      bsp: '🌱 1 Messlöffel mit 300 ml Pflanzenmilch (Hafer, Mandel oder Soja) shaken. Tipp: Etwas Banane oder Erdnussbutter dazu macht den Geschmack deutlich runder und verbessert das Aminosäureprofil zusätzlich.' },
    'kreatin':         { d: kd + ' täglich',               z: 'Täglich – egal wann',
      bsp: '⚡ Einfach ' + kd + ' in deinen Post-Workout-Shake oder ein Glas Wasser einrühren. Kreatin hat keine Wirkung durch das Timing – wichtig ist nur die tägliche Einnahme, auch an trainingsfreien Tagen. Nach 4–6 Wochen sind die Speicher voll.' },
    'magnesium':       { d: md,                             z: 'Abends vor dem Schlafen',
      bsp: '🌙 ' + md + ' Magnesiumbisglycinat ca. 30 Min vor dem Schlafen mit einem Glas Wasser einnehmen. Bisglycinat ist die schonendste Form – kein Abführeffekt wie bei billigem Magnesiumoxid. Du wirst schneller einschlafen und tiefer schlafen.' },
    'omega3':          { d: od,                             z: 'Zu einer Mahlzeit',
      bsp: '🐟 ' + od + ' zu einer fetthaltigen Mahlzeit einnehmen – z.B. zum Mittagessen. Das Fett im Essen verbessert die Aufnahme der Omega-3-Fettsäuren erheblich. Kapseln einfach mit dem Essen schlucken, nie auf nüchternen Magen.' },
    'omega3_vegan':    { d: od,                             z: 'Zu einer Mahlzeit',
      bsp: '🌿 ' + od + ' aus Algenöl zu einer Hauptmahlzeit einnehmen. Algenöl enthält direkt EPA und DHA – keine Umwandlung nötig wie bei Leinsamenöl. Gleiche Wirkung wie Fischöl, ohne Fischgeschmack und nachhaltiger.' },
    'vitamin_d3':      { d: vd + ' D3 + 100µg K2',         z: 'Morgens zum Frühstück',
      bsp: '☀️ Morgens zum Frühstück mit einer fetthaltigen Mahlzeit einnehmen – Vitamin D ist fettlöslich, ein Ei oder etwas Butter reicht. K2 sorgt dafür, dass das aufgenommene Calcium in die Knochen geht und nicht in die Gefäße. Niemals Vitamin D ohne K2 hochdosieren.' },
    'vitamin_b12':     { d: '500µg Methylcobalamin',        z: 'Morgens nüchtern',
      bsp: '🧬 500µg B12 als Methylcobalamin morgens nüchtern – am besten unter die Zunge legen (sublingual) für bessere Aufnahme. Kein Kaffee davor. B12 wird im Körper gespeichert, aber die Speicher leeren sich bei veganer Ernährung innerhalb weniger Jahre.' },
    'eisen':           { d: (w ? '18' : '10') + ' mg Bisglycinat', z: 'Morgens nüchtern',
      bsp: '🩸 ' + (w ? '18' : '10') + ' mg Eisen morgens nüchtern, mind. 30 Min vor dem Frühstück. Dazu ein Glas Orangensaft – Vitamin C verdoppelt die Aufnahmerate. Niemals zusammen mit Kaffee, Tee oder Milch einnehmen, das blockiert die Aufnahme vollständig.' },
    'ashwagandha':     { d: '300–600 mg',                   z: 'Abends vor dem Schlafen',
      bsp: '🌿 300–600 mg KSM-66 Extrakt ca. 1 Stunde vor dem Schlafen. Ashwagandha baut den Stressbotenstoff Cortisol ab – du wirst ruhiger einschlafen. Wirkung setzt meist nach 2–4 Wochen ein. Nicht morgens nehmen, kann müde machen.' },
    'l_carnitin':      { d: '1.500–2.000 mg',               z: 'Vor dem Training',
      bsp: '🔥 1.500–2.000 mg L-Carnitin ca. 30–45 Min vor dem Training einnehmen. Am besten als flüssige Form oder zusammen mit Kohlenhydraten – das erhöht die Aufnahme deutlich. Wirkung ist am stärksten beim Ausdauertraining mit moderater Intensität.' },
    'beta_alanin':     { d: '3.200 mg',                     z: 'Vor dem Training',
      bsp: '🏃 3.200 mg Beta-Alanin ca. 30 Min vor dem Training. Hinweis: Du wirst vermutlich ein Kribbeln auf der Haut spüren – das ist normal und harmlos (Parästhesie). Wirkung zeigt sich nach 2–4 Wochen kontinuierlicher Einnahme durch weniger Muskelermüdung.' },
    'elektrolyte':     { d: '1 Portion',                    z: 'Während dem Training',
      bsp: '💧 1 Portion in 500–750 ml Wasser auflösen und während dem Training trinken. Bei Einheiten unter 60 Min reicht normales Wasser. Ab 60 Min oder bei starkem Schwitzen sind Elektrolyte entscheidend – verhindert Krämpfe und Leistungsabfall.' },
    'vitamin_c':       { d: '500–1.000 mg',                 z: 'Morgens zum Frühstück',
      bsp: '🍊 500–1.000 mg Vitamin C morgens zum Frühstück. Verteile die Dosis lieber auf 2× täglich (morgens + mittags) – der Körper kann pro Mahlzeit nur ca. 500 mg gut aufnehmen. Gepuffertes Vitamin C (Calciumascorbat) ist magenfreundlicher als reine Ascorbinsäure.' },
    'zink':            { d: '15 mg',                        z: 'Abends',
      bsp: '🛡️ 15 mg Zink abends – mindestens 2 Stunden nach dem letzten Essen. Zink konkurriert mit anderen Mineralstoffen um die Aufnahme. Niemals auf nüchternen Magen, das kann Übelkeit auslösen. Als Zinkbisglycinat oder -picolinat hat die beste Bioverfügbarkeit.' },
    'kollagen':        { d: '10 g',                         z: 'Morgens nüchtern',
      bsp: '✨ 10 g Kollagenpeptide morgens nüchtern in einem Glas Wasser, Kaffee oder Saft auflösen. Dazu 250 mg Vitamin C – das ist zwingend nötig für die Kollagensynthese im Körper. Wirkung auf Haut und Gelenke nach 8–12 Wochen regelmäßiger Einnahme.' },
    'eaas':            { d: '10–15 g',                      z: 'Während dem Training',
      bsp: '🔬 10–15 g EAAs in 500 ml Wasser auflösen und während dem Training sip by sip trinken. Besonders wertvoll bei nüchternem Training oder wenn du keine vollständige Proteinmahlzeit vor dem Training gegessen hast.' },
    'l_glutamin':      { d: '5 g',                          z: 'Nach dem Training',
      bsp: '🛡️ 5 g L-Glutamin direkt nach dem Training in deinen Shake oder Wasser einrühren. Glutamin unterstützt die Darmbarriere und das Immunsystem – besonders sinnvoll in intensiven Trainingsphasen oder bei Stress.' },
    'multivitamin':    { d: '1 Kapsel',                     z: 'Morgens zum Frühstück',
      bsp: '🌈 1 Kapsel morgens zum Frühstück – nie auf nüchternen Magen. Die fettlöslichen Vitamine A, D, E, K brauchen etwas Fett zur Aufnahme. Trenne die Einnahme von Kaffee um mind. 30 Min, da Gerbstoffe die Mineralstoffaufnahme hemmen.' },
    'zma':             { d: '1 Portion',                    z: 'Abends vor dem Schlafen',
      bsp: '💤 1 Portion ZMA (Zink, Magnesium, B6) ca. 30–60 Min vor dem Schlafen, auf nüchternen Magen. Nicht zusammen mit Kalzium einnehmen (z.B. Milch) – das blockiert die Zink- und Magnesiumaufnahme. Unterstützt Schlafqualität und Testosteron-Spiegel.' },
    'pre_workout':     { d: '1 Portion vor Training',       z: 'Vor dem Training',
      bsp: '🚀 1 Portion in 200–250 ml Wasser auflösen, 20–30 Min vor dem Training trinken. Starte mit einer halben Portion um deine Verträglichkeit zu testen. Nicht nach 16:00 Uhr nehmen wenn du Einschlafprobleme hast. An Ruhetagen nicht einnehmen.' },
    'curcumin':        { d: '500 mg Curcuminoide',          z: 'Zu einer Mahlzeit',
      bsp: '🌱 500 mg Curcuminoide zu einer fetthaltigen Hauptmahlzeit. Curcumin ist kaum bioverfügbar – achte auf Produkte mit Piperin (schwarzer Pfeffer) oder liposomaler Form, diese erhöhen die Aufnahme um das 20-fache. Wirkt entzündungshemmend nach 4–8 Wochen.' },
    'probiotika':      { d: '≥10 Mrd. CFU',                 z: 'Morgens nüchtern',
      bsp: '🦠 ≥10 Mrd. CFU morgens nüchtern mit einem Glas Wasser, ca. 20–30 Min vor dem Frühstück. Magensäure ist nüchtern weniger aggressiv – so überleben mehr Bakterien den Weg in den Darm. Kühl lagern oder auf Raumtemperatur-stabile Stämme achten.' },
    'melatonin':       { d: '0,5–1 mg',                     z: 'Abends vor dem Schlafen',
      bsp: '🌙 0,5–1 mg Melatonin ca. 30 Min vor dem Schlafen. Weniger ist mehr – 0,5 mg wirkt genauso gut wie 5 mg, ohne am nächsten Morgen träge zu sein. Dimme nach der Einnahme das Licht und meide Bildschirme. Nicht für dauerhaften Gebrauch gedacht.' },
    'hmb':             { d: '3.000 mg (3× täglich)',         z: 'Über den Tag verteilt',
      bsp: '💎 3× täglich 1.000 mg HMB, verteilt auf Morgen, Mittag und Abend – am besten zu den Mahlzeiten. HMB hemmt den Muskelabbau, deshalb ist die gleichmäßige Verteilung über den Tag entscheidend. Wirkung zeigt sich vor allem in intensiven Trainingsphasen.' },
  };

  return M[id] || { d: 'Laut Produktangabe', z: 'Täglich' };
}
