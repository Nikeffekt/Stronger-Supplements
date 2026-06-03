/* ============================================================
   scripts/ui/header.js
   Header & Hamburger-Menü Initialisierung

   Abhängigkeiten: keine
   Wird genutzt von: scripts/main.js → initHamburger()
============================================================ */

function initHamburger() {
  var hamburger = document.getElementById('btn-hamburger');
  var overlay   = document.getElementById('hdr-menu-overlay');
  var closeBtn  = document.getElementById('hdr-menu-close');

  if (!hamburger || !overlay) return;

  // Menü öffnen
  hamburger.addEventListener('click', function () {
    overlay.classList.add('offen');
  });

  // Menü schließen per Close-Button
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      overlay.classList.remove('offen');
    });
  }

  // Menü schließen per Klick auf Backdrop
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('offen');
  });

  // Menü-Links: Screen wechseln + Menü schließen
  var menuItems = overlay.querySelectorAll('.hdr-menu-item[data-screen]');
  menuItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var screenId = item.getAttribute('data-screen');
      overlay.classList.remove('offen');
      if (screenId) zeige(screenId);
    });
  });
}
