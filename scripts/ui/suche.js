/* ============================================================
   scripts/ui/suche.js
   Globale Suche – Lupe-Button im Header öffnet Dropdown

   Sucht in: Wirkstoffen (WIRKSTOFFE_WISSEN) und Produkten (DB)

   Smart-Routing bei Klick auf Wirkstoff:
   - Quiz gemacht (AW befüllt)  → Profil-Popup öffnen
   - Quiz nicht gemacht         → Guide-Detail öffnen

   Abhängigkeiten:
   - scripts/state.js              (AW, DB, WIRKSTOFFE_WISSEN)
   - scripts/navigation.js         (zeige)
   - scripts/ui/guide.js           (GUIDE_DATEN, guideOeffnen, guideOeffneDetail)
   - scripts/ui/profil.js          (oeffneWirkstoffPopup, zeigeProfil)
   - scripts/engine/empfehlungen.js (berechneEmpfehlungen – für Prio)
   Wird genutzt von: scripts/main.js → initSuche()
============================================================ */

// ── INITIALISIERUNG ──
function initSuche() {
  var btnLupe  = document.getElementById('btn-suche');
  var dropdown = document.getElementById('suche-dropdown');
  var input    = document.getElementById('suche-input');
  var clearBtn = document.getElementById('suche-clear');
  var treffer  = document.getElementById('suche-treffer');

  if (!btnLupe || !dropdown || !input) {
    console.warn('Suche: HTML-Elemente fehlen.');
    return;
  }

  // ── Dropdown öffnen ──
  btnLupe.addEventListener('click', function () {
    var offen = dropdown.classList.contains('offen');
    if (offen) {
      schliesseDropdown();
    } else {
      dropdown.classList.add('offen');
      // Kurz warten bis Animation läuft, dann Fokus setzen
      setTimeout(function () { input.focus(); }, 100);
      // Initial-Hint anzeigen
      if (!input.value.trim()) zeigeHint();
    }
  });

  // ── Schließen via Klick außerhalb ──
  document.addEventListener('click', function (e) {
    if (!dropdown.classList.contains('offen')) return;
    // Klick im Dropdown oder auf der Lupe → ignorieren
    if (dropdown.contains(e.target)) return;
    if (btnLupe.contains(e.target))  return;
    schliesseDropdown();
  });

  // ── ESC schließt ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dropdown.classList.contains('offen')) {
      schliesseDropdown();
    }
  });

  // ── Eingabe ──
  input.addEventListener('input', function () {
    var query = input.value.trim();
    clearBtn.classList.toggle('sichtbar', query.length > 0);

    if (query.length === 0)      { zeigeHint();     return; }
    if (query.length < 2)        { zeigeMinHint();  return; }

    sucheUndAnzeigen(query);
  });

  // ── Clear-Button ──
  clearBtn.addEventListener('click', function () {
    input.value = '';
    clearBtn.classList.remove('sichtbar');
    zeigeHint();
    input.focus();
  });

  // ── HILFSFUNKTIONEN (closure-scoped) ──

  function schliesseDropdown() {
    dropdown.classList.remove('offen');
    input.value = '';
    clearBtn.classList.remove('sichtbar');
    treffer.innerHTML = '';
  }

  function zeigeHint() {
    treffer.innerHTML =
      '<div class="suche-leer">' +
        'Suche nach Wirkstoffen, Produkten oder Themen' +
        '<div class="suche-leer-hint">z. B. „Schlaf", „Magnesium", „ESN"</div>' +
      '</div>';
  }

  function zeigeMinHint() {
    treffer.innerHTML =
      '<div class="suche-leer">Mindestens 2 Zeichen eingeben…</div>';
  }
}


// ── SUCHE AUSFÜHREN ──
// Lower-cased Match in Name, Tagline, Beschreibung, Kategorie, Marken, Produktnamen.
// Priorisierung: Exakter Name-Match → Anfangs-Match → Enthält
function sucheUndAnzeigen(query) {
  var q = query.toLowerCase();
  var ergebnisse = [];

  // ── 1. Wirkstoffe durchsuchen ──
  // Quelle: GUIDE_DATEN (Wirkstoff-Stammdaten)
  if (typeof GUIDE_DATEN !== 'undefined') {
    Object.keys(GUIDE_DATEN).forEach(function (id) {
      var w = GUIDE_DATEN[id];
      var score = matchScore(q, [w.name, w.tagline, w.kategorie, w.beschreibung]);
      if (score > 0) {
        ergebnisse.push({
          typ:   'wirkstoff',
          id:    id,
          score: score,
          name:  w.name,
          sub:   w.tagline,
          icon:  w.emoji,
        });
      }
    });
  }

  // ── 2. Produkte durchsuchen (DB) ──
  // Quelle: DB[wirkstoffId].alle
  if (typeof DB !== 'undefined' && DB) {
    Object.keys(DB).forEach(function (wirkstoffId) {
      var produkte = DB[wirkstoffId].alle || [];
      produkte.forEach(function (p) {
        var score = matchScore(q, [p.marke, p.name, (p.tags || []).join(' ')]);
        if (score > 0) {
          ergebnisse.push({
            typ:   'produkt',
            id:    wirkstoffId,    // beim Klick → Wirkstoff öffnen
            score: score - 0.1,    // Produkte leicht abwerten
            name:  p.marke + ' · ' + p.name,
            sub:   p.preis + ' € · ' + (p.tags || []).slice(0, 2).join(', '),
            icon:  '📦',
          });
        }
      });
    });
  }

  // ── Sortieren nach Score ──
  ergebnisse.sort(function (a, b) { return b.score - a.score; });

  // ── Duplikate raus (selber Typ + ID) ──
  var gesehen = {};
  ergebnisse = ergebnisse.filter(function (e) {
    var key = e.typ + '_' + e.id;
    if (gesehen[key]) return false;
    gesehen[key] = true;
    return true;
  });

  // ── Auf max. 8 begrenzen ──
  ergebnisse = ergebnisse.slice(0, 8);

  rendereTreffer(ergebnisse, query);
}


// ── MATCH-SCORE BERECHNEN ──
// Höherer Score = besserer Treffer.
// 3.0 = Name-exakt, 2.0 = Name-Anfang, 1.0 = Name-enthält,
// 0.5 = irgendwo enthalten
function matchScore(query, felder) {
  var max = 0;
  for (var i = 0; i < felder.length; i++) {
    var feld = (felder[i] || '').toLowerCase();
    if (!feld) continue;

    // Erstes Feld ist konventionell der Name → höher gewichten
    var nameBonus = (i === 0) ? 1 : 0;

    if (feld === query)              max = Math.max(max, 3.0 + nameBonus);
    else if (feld.indexOf(query) === 0)  max = Math.max(max, 2.0 + nameBonus);
    else if (feld.indexOf(query) > 0)    max = Math.max(max, 1.0 + nameBonus * 0.5);
  }
  return max;
}


// ── TREFFER RENDERN ──
function rendereTreffer(ergebnisse, query) {
  var container = document.getElementById('suche-treffer');
  if (!container) return;

  if (ergebnisse.length === 0) {
    container.innerHTML =
      '<div class="suche-leer">' +
        'Keine Treffer für „' + query + '"' +
        '<div class="suche-leer-hint">Probier eine andere Schreibweise oder ein Stichwort</div>' +
      '</div>';
    return;
  }

  var html = '';
  ergebnisse.forEach(function (e) {
    var tagLabel = e.typ === 'wirkstoff' ? 'Wirkstoff' :
                   e.typ === 'guide'     ? 'Guide'     : 'Produkt';

    html += '<div class="suche-treffer-item" data-typ="' + e.typ + '" data-id="' + e.id + '">';
    html +=   '<div class="suche-treffer-icon">' + (e.icon || '💊') + '</div>';
    html +=   '<div class="suche-treffer-info">';
    html +=     '<div class="suche-treffer-name">' + hervorheben(e.name, query) + '</div>';
    html +=     '<div class="suche-treffer-sub">'  + (e.sub || '') + '</div>';
    html +=   '</div>';
    html +=   '<div class="suche-treffer-tag tag-' + e.typ + '">' + tagLabel + '</div>';
    html += '</div>';
  });

  container.innerHTML = html;

  // ── Klick-Handler binden ──
  container.querySelectorAll('.suche-treffer-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var typ = item.getAttribute('data-typ');
      var id  = item.getAttribute('data-id');
      treffeAuswaehlen(typ, id);
    });
  });
}


// ── SUCH-BEGRIFF IM TEXT HERVORHEBEN ──
function hervorheben(text, query) {
  if (!text || !query) return text;
  var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}


// ── TREFFER AUSWÄHLEN – SMART ROUTING ──
function treffeAuswaehlen(typ, id) {
  // Dropdown schließen
  var dropdown = document.getElementById('suche-dropdown');
  if (dropdown) dropdown.classList.remove('offen');
  var input = document.getElementById('suche-input');
  if (input) input.value = '';
  var clearBtn = document.getElementById('suche-clear');
  if (clearBtn) clearBtn.classList.remove('sichtbar');

  // Quiz gemacht? (= AW hat mind. ein paar Antworten)
  var quizGemacht = typeof AW !== 'undefined' && AW && Object.keys(AW).length > 3;

  if (quizGemacht) {
    // ── Personalisierter Weg: Profil-Popup ──
    // Erst sicherstellen dass das Profil gerendert ist (Popup-Container muss existieren)
    var profilScreen = document.getElementById('s-profil');
    var hatPopupContainer = profilScreen && profilScreen.querySelector('#pw-overlay');

    if (!hatPopupContainer) zeigeProfil();

    // Prio bestimmen aus berechneEmpfehlungen
    var prio = 'empfohlen';
    if (typeof berechneEmpfehlungen === 'function') {
      var emps = berechneEmpfehlungen(AW);
      for (var i = 0; i < emps.length; i++) {
        if (emps[i].id === id) { prio = emps[i].prioritaet; break; }
      }
    }

    // Kurz warten falls Profil neu gerendert wurde
    setTimeout(function () {
      if (typeof oeffneWirkstoffPopup === 'function') {
        oeffneWirkstoffPopup(id, prio, AW);
      }
    }, hatPopupContainer ? 0 : 200);

  } else {
    // ── Wissens-Weg: Guide-Detail ──
    if (typeof guideOeffnen === 'function')      guideOeffnen();
    if (typeof guideOeffneDetail === 'function') {
      // Guide-Screen muss erst sichtbar sein
      setTimeout(function () { guideOeffneDetail(id); }, 100);
    }
  }
}
