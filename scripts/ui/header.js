/* ============================================================
   scripts/ui/header.js
   Header & Hamburger-Menü Initialisierung

   Abhängigkeiten:
   - scripts/navigation.js (zeige)
   - scripts/ui/reset.js   (resetApp)
   - scripts/ui/guide.js   (guideOeffnen – wird per Inline-onclick aufgerufen)
   Wird genutzt von: scripts/main.js → initHamburger()
============================================================ */

function initHamburger() {
  var hamburger = document.getElementById('btn-menu');
  var overlay   = document.getElementById('hdr-menu-overlay');
  var closeBtn  = document.getElementById('hdr-menu-close');
  var resetBtn  = document.getElementById('btn-reset-menu');

  if (!hamburger || !overlay) {
    console.warn('Header: btn-menu oder hdr-menu-overlay nicht gefunden.');
    return;
  }

  // ── Menü öffnen ──
  hamburger.addEventListener('click', function () {
    overlay.classList.add('offen');
  });

  // ── Schließen via X-Button ──
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      overlay.classList.remove('offen');
    });
  }

  // ── Schließen via Klick auf Backdrop ──
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('offen');
  });

  // ── Reset-Button im Menü ──
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      overlay.classList.remove('offen');
      resetApp();
    });
  }

  // ── Menü-Links ──
  // Jeder Link schließt erst das Menü. Falls ein data-screen Attribut
  // gesetzt ist, wird zusätzlich der Screen gewechselt.
  // Items mit inline onclick (z. B. Guide) funktionieren parallel.
  var menuItems = overlay.querySelectorAll('.hdr-menu-item');
  menuItems.forEach(function (item) {
    item.addEventListener('click', function () {
      overlay.classList.remove('offen');
      var screenId = item.getAttribute('data-screen');
      if (screenId) zeige(screenId);
    });
  });
}
