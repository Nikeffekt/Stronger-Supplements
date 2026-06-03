/* ============================================================
   scripts/navigation.js
   Screen-Navigation – blendet Screens ein und aus

   Abhängigkeiten: keine
   Wird genutzt von: allen UI-Scripts
============================================================ */

// ── SCREEN WECHSEL ──
// Blendet alle .screen Elemente aus und zeigt den gewünschten.
// Scrollt automatisch nach oben.
function zeige(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('on');
  });
  var el = document.getElementById(id);
  if (el) {
    el.classList.add('on');
    window.scrollTo(0, 0);
  }
}
