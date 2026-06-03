/* ============================================================
   scripts/ui/reset.js
   App Reset – setzt den kompletten State zurück

   Abhängigkeiten:
   - scripts/state.js      (AW, NP, meinStack, …)
   - scripts/navigation.js (zeige)
   - scripts/ui/toast.js   (toast)
   - scripts/quiz/quiz.js  (qIdx, multiSel, initQueue)
============================================================ */

function resetApp() {
  // State zurücksetzen
  AW = {};
  NP = { name: '', email: '' };
  abgewaehlt       = {};
  aufgeklappteAlts = {};
  gewaehlteAlts    = {};
  meinStack        = {};

  // Quiz zurücksetzen
  qIdx     = 0;
  multiSel = [];
  initQueue();

  zeige('s-start');
  toast('↺ App zurückgesetzt.');
}
