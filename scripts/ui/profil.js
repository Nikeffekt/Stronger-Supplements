/* ============================================================
   scripts/ui/profil.js
   Profil Screen – Anzeige, Wirkstoff-Popup, Stack-Verwaltung

   Abhängigkeiten:
   - scripts/state.js           (AW, NP, DB, meinStack)
   - scripts/navigation.js      (zeige)
   - scripts/ui/toast.js        (toast)
   - scripts/ui/reset.js        (resetApp)
   - scripts/data/konstanten.js (ALT, TRG, ERN, GES, ZIEL)
   - scripts/engine/empfehlungen.js    (berechneEmpfehlungen, dosis)
   - scripts/engine/personalisierung.js (getPersonalisierteAlts)
   - data/wirkstoff-erklaerungen.js    (ERKLAERUNG)
============================================================ */

// ── AVATAR HELPER ──
function getAvatar(a) {
  if (!a) return '🧑';
  var g = a.geschlecht;
  var alt = a.intro;
  if (g === 'A') return alt === 'A' || alt === 'B' ? '👦' : alt === 'D' || alt === 'E' ? '👨‍🦳' : '👨';
  if (g === 'B') return alt === 'A' || alt === 'B' ? '👧' : alt === 'D' || alt === 'E' ? '👩‍🦳' : '👩';
  return '🧑';
}

// ── ICON / NAME AUS EMPFEHLUNGEN ──
function getEmpIcon(eid) {
  var emps = berechneEmpfehlungen(AW);
  for (var i = 0; i < emps.length; i++) if (emps[i].id === eid) return emps[i].ikon;
  return '💊';
}

function getEmpName(eid) {
  var emps = berechneEmpfehlungen(AW);
  for (var i = 0; i < emps.length; i++) if (emps[i].id === eid) return emps[i].name;
  return eid;
}


// ── PROFIL ANZEIGEN ──
function zeigeProfil() {
  var a   = AW;
  var kg  = parseFloat(a.gewicht) || 75;
  var cm  = parseFloat(a.groesse) || 175;
  var bmi = (kg / ((cm / 100) * (cm / 100))).toFixed(1);

  var bmiKat = parseFloat(bmi) < 18.5 ? { l: 'Untergewicht',  c: '#3B82F6' }
             : parseFloat(bmi) < 25   ? { l: 'Normalgewicht', c: '#059669' }
             : parseFloat(bmi) < 30   ? { l: 'Übergewicht',   c: '#F59E0B' }
             :                          { l: 'Adipositas',     c: '#EF4444' };

  var bmiPct = Math.min(100, Math.max(0, ((parseFloat(bmi) - 15) / 25) * 100));
  var avatar = getAvatar(a);
  var emps   = berechneEmpfehlungen(a);
  var prio   = { essential: 0, empfohlen: 1, optional: 2 };
  emps.sort(function (x, y) { return prio[x.prioritaet] - prio[y.prioritaet]; });

  var h = '';

  // ── PROFIL HEADER ──
  h += '<div class="profil-card">';
  h += '<div class="profil-header">';
  h += '<div class="avatar-wrap">';
  h += '<div class="avatar">' + avatar + '</div>';
  h += '<div class="avatar-info">';
  h += '<div class="avatar-name">' + (NP.name || 'Mein Profil') + '</div>';
  h += '<div class="avatar-sub">' + (ALT[a.intro] || '') + '  ·  ' + (GES[a.geschlecht] || '') + '  ·  ' + (ERN[a.ernaehrung] || '') + '</div>';
  h += '</div></div>';

  // Stack-Fortschritt
  var stackAnzahl  = Object.keys(meinStack).length;
  var gesamtAnzahl = emps.length;
  var stackPct     = gesamtAnzahl > 0 ? Math.round((stackAnzahl / gesamtAnzahl) * 100) : 0;
  var stackPreis   = 0;
  Object.keys(meinStack).forEach(function (k) { stackPreis += meinStack[k].preis || 0; });

  h += '<div class="profil-progress-wrap">';
  h += '<div class="profil-progress-top">';
  h += '<span class="profil-progress-label">Mein Stack</span>';
  h += '<span class="profil-progress-count">' + stackAnzahl + ' / ' + gesamtAnzahl + ' Supplements</span>';
  h += '</div>';
  h += '<div class="profil-progress-bar"><div class="profil-progress-fill" style="width:' + stackPct + '%"></div></div>';
  if (stackAnzahl > 0) {
    h += '<div class="profil-progress-preis">~' + stackPreis.toFixed(0) + ' € / Monat ausgewählt</div>';
  } else {
    h += '<div class="profil-progress-hint">Tippe auf einen Wirkstoff um Produkte hinzuzufügen</div>';
  }
  h += '</div>';

  // Stats
  h += '<div class="profil-stats">';
  h += '<div class="stat-pill"><div class="stat-pill-label">Gewicht</div><div class="stat-pill-val">' + kg + ' kg</div><div class="stat-pill-sub">' + cm + ' cm</div></div>';
  h += '<div class="stat-pill"><div class="stat-pill-label">BMI</div><div class="stat-pill-val" style="color:' + bmiKat.c + '">' + bmi + '</div><div class="stat-pill-sub">' + bmiKat.l + '</div><div class="bmi-bar-wrap"><div class="bmi-bar-fill" style="width:' + bmiPct + '%;background:' + bmiKat.c + '"></div></div></div>';
  h += '<div class="stat-pill"><div class="stat-pill-label">Training</div><div class="stat-pill-val" style="font-size:12px;">' + (TRG[a.training] || '–') + '</div></div>';
  h += '<div class="stat-pill"><div class="stat-pill-label">Ziele</div><div class="stat-pill-val" style="font-size:11px;">' + (a.ziele || ['F']).map(function (z) { return ZIEL[z] || z; }).join(', ') + '</div></div>';
  h += '</div></div>';

  // ── WIRKSTOFF BODY ──
  h += '<div class="profil-body">';
  h += '<div class="profil-section-label">Deine Wirkstoffe – tippe für Details & Produkte</div>';

  var gruppen = [
    { prio: 'essential', label: 'Essentiell', color: '#FF6B00', bg: 'rgba(255,107,0,0.08)',  border: 'rgba(255,107,0,0.25)' },
    { prio: 'empfohlen', label: 'Empfohlen',  color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
    { prio: 'optional',  label: 'Optional',   color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  ];

  gruppen.forEach(function (g) {
    var gruppe = emps.filter(function (e) { return e.prioritaet === g.prio; });
    if (!gruppe.length) return;

    h += '<div class="pw-gruppe-label" style="color:' + g.color + ';">';
    h += '<span class="pw-gruppe-dot" style="background:' + g.color + ';"></span>' + g.label;
    h += '</div>';

    gruppe.forEach(function (e) {
      var d      = dosis(e.id, a);
      var imStack = meinStack[e.id];
      h += '<div class="pw-zeile tipp' + (imStack ? ' pw-zeile-gewaehlt' : '') + '" data-eid="' + e.id + '" data-prio="' + e.prioritaet + '" style="border-color:' + (imStack ? g.color : g.border) + ';">';
      h += '<div class="pw-zeile-left">';
      h += '<div class="pw-zeile-ikon" style="background:' + g.bg + ';">' + e.ikon + '</div>';
      h += '<div class="pw-zeile-info">';
      h += '<div class="pw-zeile-name">' + e.name + '</div>';
      if (imStack) {
        h += '<div class="pw-zeile-stack-prod">';
        h += '<span class="pw-stack-check" style="color:' + g.color + ';">✓</span>';
        h += '<span class="pw-stack-prodname">' + imStack.prod.name + '</span>';
        h += '</div>';
      } else {
        h += '<div class="pw-zeile-meta">' + d.z + ' · ' + d.d + '</div>';
      }
      h += '</div></div>';
      h += '<div class="pw-zeile-rechts">';
      if (imStack) h += '<div class="pw-zeile-preis" style="color:' + g.color + ';">' + imStack.prod.preis + ' €</div>';
      h += '<div class="pw-zeile-pfeil" style="color:' + g.color + ';">›</div>';
      h += '</div></div>';
    });
  });

  h += '</div></div>';

  // ── STACK KAUF BOX ──
  if (Object.keys(meinStack).length > 0) {
    var totalPreis = 0;
    Object.keys(meinStack).forEach(function (k) { totalPreis += meinStack[k].preis || 0; });
    h += '<div class="pw-stack-kauf-box">';
    h += '<div class="pw-stack-kauf-info">';
    h += '<div class="pw-stack-kauf-label">' + Object.keys(meinStack).length + ' Supplements im Stack</div>';
    h += '<div class="pw-stack-kauf-preis">~' + totalPreis.toFixed(0) + ' € / Monat</div>';
    h += '</div>';
    h += '<button class="pw-stack-kauf-btn btn-primary tipp" id="btn-stack-kaufen">Stack kaufen ↗</button>';
    h += '</div>';
  }

  h += '<div style="text-align:center;margin-top:12px;"><button class="btn-ghost" id="btn-reset-p">↺ Neu starten</button></div>';

  // ── POPUP CONTAINER ──
  h += '<div class="pw-overlay" id="pw-overlay" style="display:none;">';
  h += '<div class="pw-popup" id="pw-popup">';
  h += '<div class="pw-popup-inner" id="pw-popup-inner"></div>';
  h += '</div></div>';

  document.getElementById('s-profil').innerHTML = h;
  zeige('s-profil');

  // Events
  document.getElementById('btn-reset-p').addEventListener('click', function () { resetApp(); });

  var stackKaufBtn = document.getElementById('btn-stack-kaufen');
  if (stackKaufBtn) {
    stackKaufBtn.addEventListener('click', function () {
      toast('🛒 Shop-Integration folgt – Stack gespeichert');
    });
  }

  // Wirkstoff-Zeile → Popup
  document.querySelectorAll('.pw-zeile').forEach(function (row) {
    row.addEventListener('click', function () {
      oeffneWirkstoffPopup(row.getAttribute('data-eid'), row.getAttribute('data-prio'), a);
    });
  });

  // Overlay schließen bei Klick außen
  document.getElementById('pw-overlay').addEventListener('click', function (ev) {
    if (ev.target === this) schliessePopup();
  });
}


// ── WIRKSTOFF POPUP ──
function oeffneWirkstoffPopup(eid, prio, a) {
  if (!DB || !DB[eid]) return;
  var db        = DB[eid];
  var erkl      = ERKLAERUNG[eid] || 'Wichtiger Wirkstoff für dein Profil.';
  var d         = dosis(eid, a);
  var prioColor = prio === 'essential' ? '#FF6B00' : prio === 'empfohlen' ? '#3B82F6' : '#10B981';
  var prioLabel = prio === 'essential' ? 'Essentiell' : prio === 'empfohlen' ? 'Empfohlen' : 'Optional';
  var produkte  = getPersonalisierteAlts(eid, a);
  if (!produkte || !produkte.length) produkte = [db.hauptprodukt].concat(db.alternativen || []);

  var h = '';
  h += '<div class="pw-popup-header" style="border-color:' + prioColor + '20;">';
  h += '<div class="pw-popup-title-row">';
  h += '<div class="pw-popup-ikon">' + getEmpIcon(eid) + '</div>';
  h += '<div>';
  h += '<div class="pw-popup-name">' + getEmpName(eid) + '</div>';
  h += '<div class="pw-popup-prio" style="color:' + prioColor + ';background:' + prioColor + '15;">● ' + prioLabel + '</div>';
  h += '</div>';
  h += '<button class="pw-popup-close tipp" id="pw-close">✕</button>';
  h += '</div>';
  h += '<p class="pw-popup-erkl">' + erkl + '</p>';
  h += '<div class="pw-popup-einnahme pw-einnahme-klickbar" id="pw-einnahme-toggle">';
  h += '<div class="pw-einnahme-block"><div class="pw-einnahme-lbl">⏱ EINNAHME</div><div class="pw-einnahme-val">' + d.z + '</div></div>';
  h += '<div class="pw-einnahme-divider"></div>';
  h += '<div class="pw-einnahme-block"><div class="pw-einnahme-lbl">💊 DOSIERUNG</div><div class="pw-einnahme-val" style="color:#34D399;">' + d.d + '</div></div>';
  h += '<div class="pw-einnahme-hint">💡 Tippe für Beispiel</div>';
  h += '</div>';
  h += '<div class="pw-bsp-panel" id="pw-bsp-panel">';
  h += '<div class="pw-bsp-titel">📋 Konkretes Beispiel</div>';
  h += '<div class="pw-bsp-text">' + (d.bsp || 'Laut Produktangabe einnehmen.') + '</div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="pw-popup-produkte-titel">Verfügbare Produkte</div>';
  h += '<div class="pw-popup-produkte">';

  produkte.forEach(function (prod, idx) {
    var isFirst = idx === 0;
    var imStack = meinStack[eid] && meinStack[eid].prod.name === prod.name;
    h += '<div class="pw-prod-card' + (isFirst ? ' pw-prod-best' : '') + '">';
    if (isFirst) h += '<div class="pw-prod-best-badge">★ Empfohlen</div>';
    h += '<div class="pw-prod-header">';
    h += '<div>';
    h += '<div class="pw-prod-marke">' + prod.marke + '</div>';
    h += '<div class="pw-prod-name">' + prod.name + '</div>';
    h += '<div class="pw-prod-rating">' + prod.rating + '</div>';
    h += '</div>';
    h += '<div class="pw-prod-preis">' + prod.preis + ' <span style="font-size:11px;opacity:0.6;">€</span></div>';
    h += '</div>';
    h += '<div class="pw-prod-tags">';
    prod.tags.forEach(function (t) { h += '<span class="pw-prod-tag">' + t + '</span>'; });
    h += '</div>';
    h += '<button class="pw-prod-kaufen' + (imStack ? ' pw-prod-im-stack' : '') + ' tipp" data-eid="' + eid + '" data-pidx="' + (idx === 0 ? -1 : idx - 1) + '">';
    h += imStack ? '<span>✓ Im Stack</span>' : '<span>Zum Stack hinzufügen</span><span>+</span>';
    h += '</button>';
    h += '</div>';
  });

  h += '</div>';

  document.getElementById('pw-popup-inner').innerHTML = h;
  document.getElementById('pw-overlay').style.display = 'flex';
  setTimeout(function () { document.getElementById('pw-popup').classList.add('pw-popup-open'); }, 10);

  document.getElementById('pw-close').addEventListener('click', schliessePopup);

  // Einnahme-Block Toggle
  var einnahmeToggle = document.getElementById('pw-einnahme-toggle');
  var bspPanel       = document.getElementById('pw-bsp-panel');
  if (einnahmeToggle && bspPanel) {
    einnahmeToggle.addEventListener('click', function () {
      var offen = bspPanel.classList.contains('pw-bsp-offen');
      bspPanel.classList.toggle('pw-bsp-offen', !offen);
      einnahmeToggle.classList.toggle('pw-einnahme-aktiv', !offen);
    });
  }

  // Kaufen-Buttons
  document.querySelectorAll('.pw-prod-kaufen').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var eid  = btn.getAttribute('data-eid');
      var pidx = parseInt(btn.getAttribute('data-pidx'));
      var db   = DB[eid];
      if (!db) return;
      var prod = pidx === -1 ? db.hauptprodukt : db.alternativen[pidx];
      if (!prod) return;
      meinStack[eid] = { prod: prod, preis: parseFloat(prod.preis.replace(',', '.')) };
      schliessePopup();
      setTimeout(function () {
        zeigeProfil();
        toast('✓ ' + prod.name + ' zum Stack hinzugefügt');
      }, 300);
    });
  });
}


// ── POPUP SCHLIESSEN ──
function schliessePopup() {
  var popup = document.getElementById('pw-popup');
  if (popup) popup.classList.remove('pw-popup-open');
  setTimeout(function () {
    var overlay = document.getElementById('pw-overlay');
    if (overlay) overlay.style.display = 'none';
  }, 260);
}
