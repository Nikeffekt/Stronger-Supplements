/* ============================================================
   scripts/ui/toast.js
   Toast Notification – temporäres Feedback-Element

   Abhängigkeiten: keine
   Wird genutzt von: allen UI-Scripts
============================================================ */

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(function () { t.classList.remove('on'); }, 2800);
}
