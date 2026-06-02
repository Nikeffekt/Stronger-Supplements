/* ============================================================
   engine/overlaps.js
   Entfernt redundante Supplements wenn Wirkstoffe bereits
   anderweitig abgedeckt sind (z. B. ZMA, wenn Mg + Zink schon drin)
   Ausgelagert aus app.js

   Abhängigkeiten:
   - Globale Variable INHALT (aus data/wirkstoff-inhalte.js)
   Genutzt von: engine/empfehlungen.js → berechneEmpfehlungen()
============================================================ */

// ── OVERLAP-AUFLÖSUNG ──
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
