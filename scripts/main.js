/* ============================================================
   scripts/main.js
   Einstiegspunkt – startet die App nach DOM-Laden

   Ladereihenfolge (in index.html):
   1. state.js
   2. navigation.js
   3. data/konstanten.js
   4. data/produkte-loader.js (lädt produkte.json + wirkstoffe-wissen.json)
   5. engine/overlaps.js
   6. engine/empfehlungen.js
   7. engine/personalisierung.js
   8. ui/toast.js
   9. ui/reset.js
   10. ui/banner.js
   11. ui/header.js
   12. ui/start-modal.js
   13. ui/shop.js
   14. ui/guide.js
   15. ui/profil.js
   16. quiz/quiz.js
   17. chat/ki-system-prompt.js
   18. chat/ki-chat.js
   19. main.js  ← dieses File
============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ── Produkte laden ──
  ladeProdukte();

  // ── UI initialisieren ──
  initQueue();
  initBanner();
  initHamburger();
  initSuche();

  // ── Start-Button ──
  var btnStart = document.getElementById('btn-start');
  if (btnStart) {
    btnStart.addEventListener('click', function () { oeffneStartModal(); });
  }

  // ── Reset-Buttons (Header + Menü) ──
  var btnReset  = document.getElementById('btn-reset');
  var btnReset2 = document.getElementById('btn-reset2');
  if (btnReset)  btnReset.addEventListener('click',  function () { resetApp(); });
  if (btnReset2) btnReset2.addEventListener('click', function () { resetApp(); });

  // ── Login ──
  var btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', function () {
      NP.name  = (document.getElementById('inp-name')  && document.getElementById('inp-name').value.trim())  || 'Nutzer';
      NP.email = (document.getElementById('inp-email') && document.getElementById('inp-email').value.trim()) || '';
      zeigeProfil();
    });
  }

  // ── Login überspringen ──
  var btnSkip = document.getElementById('btn-skip');
  if (btnSkip) {
    btnSkip.addEventListener('click', function () {
      NP.name = 'Nutzer';
      zeigeProfil();
    });
  }

});
