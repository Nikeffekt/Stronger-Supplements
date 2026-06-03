/* ============================================================
   scripts/ui/banner.js
   Banner Karussell – Auto-Slide, Dot-Navigation und Touch-Swipe

   Abhängigkeiten: keine
   Wird genutzt von: scripts/main.js → initBanner()
============================================================ */

function initBanner() {
  var slides    = document.querySelectorAll('.banner-slide');
  var dots      = document.querySelectorAll('.banner-dot');
  var karussell = document.getElementById('banner-karussell');

  if (!slides.length) return;

  var aktuell = 0;
  var interval;

  // Slide wechseln
  function zeigSlide(idx) {
    slides[aktuell].classList.remove('aktiv');
    dots[aktuell].classList.remove('aktiv-dot');
    aktuell = (idx + slides.length) % slides.length;
    slides[aktuell].classList.add('aktiv');
    dots[aktuell].classList.add('aktiv-dot');
  }

  // Auto-Play starten
  function startAuto() {
    interval = setInterval(function () { zeigSlide(aktuell + 1); }, 4000);
  }

  // Dot-Klick
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      clearInterval(interval);
      zeigSlide(parseInt(dot.getAttribute('data-dot')));
      startAuto();
    });
  });

  // Touch Swipe
  if (karussell) {
    var startX = 0;
    karussell.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    karussell.addEventListener('touchend', function (e) {
      var diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        clearInterval(interval);
        zeigSlide(diff > 0 ? aktuell + 1 : aktuell - 1);
        startAuto();
      }
    }, { passive: true });
  }

  startAuto();
}
