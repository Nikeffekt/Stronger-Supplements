/* ============================================================
   engine/overlaps.js
   Entfernt redundante Supplements wenn Wirkstoffe bereits
   anderweitig abgedeckt sind (z. B. ZMA, wenn Mg + Zink schon drin)
   Ausgelagert aus app.js

   Abhängigkeiten:
   - Globale Variable INHALT (aus data/wirkstoff-inhalte.js)
   Genutzt von: engine/empfehlungen.js → berechneEmpfehlungen()

   Fixes:
   - Bug #1: ID-Duplikat-Check verhindert doppelte Wirkstoffe
   - Bug #3: Geschützte IDs werden nie durch Multivitamin verdrängt
============================================================ */

// ── OVERLAP-AUFLÖSUNG ──
function loesOverlaps(emps) {
  var del = {};

  // ── Bug #1 Fix: ID-Duplikat-Check ──
  // Verhindert dass derselbe Wirkstoff (gleiche ID) mehrfach im Stack landet.
  // Behält immer die höher priorisierte Variante (essential > empfohlen > optional).
  var prio = { essential: 0, empfohlen: 1, optional: 2 };
  var gesehenIds = {};
  for (var k = 0; k < emps.length; k++) {
    var id = emps[k].id;
    if (gesehenIds[id] !== undefined) {
      // ID bereits vorhanden – schwächere Prio raus
      var bestehendeIdx = gesehenIds[id];
      if (prio[emps[k].prioritaet] < prio[emps[bestehendeIdx].prioritaet]) {
        del[emps[bestehendeIdx].id + '_idx_' + bestehendeIdx] = 'Doppelter Wirkstoff – stärkere Variante behalten';
        gesehenIds[id] = k;
      } else {
        del[id + '_idx_' + k] = 'Doppelter Wirkstoff – stärkere Variante behalten';
      }
    } else {
      gesehenIds[id] = k;
    }
  }
  // Duplikate aus emps filtern (Index-basiert da gleiche ID mehrfach vorkommen kann)
  emps = emps.filter(function(e, idx) {
    return !del[e.id + '_idx_' + idx];
  });
  del = {}; // Reset für weiteren Verlauf

  // ── Spezifische Kombinations-Regeln ──

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

  // ── Bug #3 Fix: Geschützte IDs ──
  // Diese Wirkstoffe haben therapeutische Relevanz in Einzeldosierung
  // und dürfen NICHT durch Multivitamin-Overlap aus dem Stack fliegen.
  // Hintergrund: Multivitamin enthält z. B. Eisen und B12, aber oft in zu
  // niedriger Dosis um einen Mangel zu beheben.
  var geschuetzt = ['eisen', 'vitamin_b12', 'vitamin_d3'];

  // ── Allgemeine Wirkstoff-Überschneidungen prüfen ──
  var prioCmp = { essential: 0, empfohlen: 1, optional: 2 };
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
            // Bug #3: Geschützte Wirkstoffe werden nie durch Multivitamin verdrängt
            var iMulti = emps[i].id === 'multivitamin';
            var jMulti = emps[j].id === 'multivitamin';
            if (iMulti && geschuetzt.indexOf(emps[j].id) >= 0) continue;
            if (jMulti && geschuetzt.indexOf(emps[i].id) >= 0) continue;

            if (prioCmp[emps[i].prioritaet] <= prioCmp[emps[j].prioritaet]) {
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
