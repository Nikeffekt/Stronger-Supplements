/* ============================================================
   scripts/ui/start-modal.js
   Start Modal – "Wie möchtest du starten?" Overlay

   Abhängigkeiten:
   - scripts/navigation.js  (zeige)
   - scripts/quiz/quiz.js   (zeigeQuiz)
   - scripts/ui/shop.js     (zeigeShop)

   Hinweis: Das Modal wird komplett per JS gebaut (kein HTML-Template)
   damit es nie im DOM ist bevor es gebraucht wird.
   Die Inline-Styles sind bewusst – das Modal ist eine Ausnahme
   da es kein eigenes CSS-File hat und selten geändert wird.
   TODO: In Zukunft als CSS-Klassen in styles/components/modal.css auslagern.
============================================================ */

function oeffneStartModal() {
  // Fade-Animation einmalig in <head> einfügen
  if (!document.getElementById('sm-style')) {
    var st = document.createElement('style');
    st.id = 'sm-style';
    st.textContent = '@keyframes smFade{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(st);
  }

  // Overlay-Backdrop
  var ov = document.createElement('div');
  ov.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.78)',
    'z-index:9999', 'display:flex', 'align-items:center', 'justify-content:center',
    'padding:20px', 'backdrop-filter:blur(5px)', '-webkit-backdrop-filter:blur(5px)',
    'animation:smFade 0.2s ease'
  ].join(';');

  // Modal-Box
  var box = document.createElement('div');
  box.style.cssText = [
    'background:#1C1C1C', 'border:1px solid rgba(255,255,255,0.09)',
    'border-radius:24px', 'padding:28px 22px', 'width:100%', 'max-width:440px',
    'display:flex', 'flex-direction:column', 'gap:14px',
    'box-shadow:0 24px 64px rgba(0,0,0,0.65)', 'position:relative'
  ].join(';');

  // ── Header ──
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;';

  var titel = document.createElement('div');
  titel.style.cssText = "font-family:'Barlow Condensed',Impact,sans-serif;font-size:20px;font-weight:800;font-style:italic;text-transform:uppercase;letter-spacing:1px;color:#fff;";
  titel.textContent = 'Wie möchtest du starten?';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:rgba(255,255,255,0.07);border:none;color:rgba(255,255,255,0.5);width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  closeBtn.addEventListener('click', function () { document.body.removeChild(ov); });

  hdr.appendChild(titel);
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);

  // ── Hilfsfunktion: Option-Karte bauen ──
  function baueOption(icon, titleText, desc, ctaText, featured) {
    var card = document.createElement('div');
    card.style.cssText = [
      'position:relative', 'border-radius:16px', 'padding:20px 18px',
      'display:flex', 'gap:14px', 'cursor:pointer',
      'border:1px solid ' + (featured ? 'rgba(255,107,0,0.35)' : 'rgba(255,255,255,0.08)'),
      'background:'       + (featured ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.03)'),
      'transition:border-color 0.18s,background 0.18s,transform 0.15s'
    ].join(';');

    card.addEventListener('mouseenter', function () {
      card.style.borderColor = featured ? 'rgba(255,107,0,0.65)' : 'rgba(255,255,255,0.18)';
      card.style.background  = featured ? 'rgba(255,107,0,0.11)' : 'rgba(255,255,255,0.07)';
      card.style.transform   = 'translateY(-1px)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.borderColor = featured ? 'rgba(255,107,0,0.35)' : 'rgba(255,255,255,0.08)';
      card.style.background  = featured ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.03)';
      card.style.transform   = 'translateY(0)';
    });

    // "Empfohlen" Badge
    if (featured) {
      var badge = document.createElement('div');
      badge.textContent = 'Empfohlen';
      badge.style.cssText = "position:absolute;top:-10px;left:18px;background:#FF6B00;color:#fff;font-family:'Barlow Condensed',Impact,sans-serif;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:2px 10px;border-radius:20px;";
      card.appendChild(badge);
    }

    var iconEl = document.createElement('div');
    iconEl.style.cssText = 'font-size:28px;line-height:1;flex-shrink:0;padding-top:2px;';
    iconEl.textContent = icon;
    card.appendChild(iconEl);

    var content = document.createElement('div');
    content.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    var t = document.createElement('div');
    t.style.cssText = "font-family:'Barlow Condensed',Impact,sans-serif;font-size:17px;font-weight:800;font-style:italic;text-transform:uppercase;letter-spacing:0.5px;color:#fff;";
    t.textContent = titleText;

    var d = document.createElement('div');
    d.style.cssText = 'font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55);';
    d.textContent = desc;

    var cta = document.createElement('div');
    cta.style.cssText = 'font-size:13px;font-weight:600;color:#FF6B00;margin-top:2px;';
    cta.textContent = ctaText;

    content.appendChild(t);
    content.appendChild(d);
    content.appendChild(cta);
    card.appendChild(content);
    return card;
  }

  // ── Option 1: Persönlicher Stack (Quiz) ──
  var optQuiz = baueOption(
    '🎯',
    'Persönlicher Stack',
    'Beantworte 10 kurze Fragen zu Ziel, Ernährung und Körper — wir stellen dir exakt die Supplements zusammen, die für dich wirken. Mit Dosierungen, Timing und personalisierten Alternativen.',
    'Quiz starten →',
    true
  );
  optQuiz.addEventListener('click', function () {
    document.body.removeChild(ov);
    zeigeQuiz();
  });

  // ── Option 2: Alle Produkte (Shop) ──
  var optShop = baueOption(
    '🛒',
    'Alle Produkte',
    'Direkt zum vollständigen Sortiment. Ohne Empfehlung, ohne Filter — du entscheidest selbst was in deinen Stack kommt.',
    'Produkte ansehen →',
    false
  );
  optShop.addEventListener('click', function () {
    document.body.removeChild(ov);
    zeigeShop();
  });

  box.appendChild(optQuiz);
  box.appendChild(optShop);
  ov.appendChild(box);

  // Klick auf Backdrop schließt Modal
  ov.addEventListener('click', function (ev) {
    if (ev.target === ov) document.body.removeChild(ov);
  });

  document.body.appendChild(ov);
}
