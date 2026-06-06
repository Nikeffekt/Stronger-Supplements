/* ============================================================
   scripts/ui/guide.js
   Supplement Guide – nutzt wirkstoffe-wissen.json als Datenquelle

   Abhängigkeiten:
   - scripts/state.js           (WIRKSTOFFE_WISSEN – wird von produkte-loader.js befüllt)
   - scripts/navigation.js      (zeige)

   ÄNDERUNGEN vs. vorheriger Version:
   - GUIDE_DATEN entfernt – Wissen kommt jetzt aus wirkstoffe-wissen.json
   - Detail-Render zeigt: Effektgrößen, Indikationen, Dosierung,
     Population-spezifische Hinweise, Warnhinweise, Quellen mit Links
============================================================ */


// ── GUIDE ÖFFNEN ──
function guideOeffnen() {
  var menuOv = document.getElementById('hdr-menu-overlay');
  if (menuOv) menuOv.classList.remove('offen');
  baueGuideListe();
  zeige('s-guide');
}

// ── GUIDE ZURÜCK ──
function guideZurueck() {
  zeige('s-start');
}


// ── LISTE AUFBAUEN ──
// Nutzt WIRKSTOFFE_WISSEN (geladen aus wirkstoffe-wissen.json)
function baueGuideListe() {
  var container = document.getElementById('guide-liste');
  if (!container) return;

  // Wenn noch keine Daten geladen: Hinweis
  if (!WIRKSTOFFE_WISSEN || Object.keys(WIRKSTOFFE_WISSEN).length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.4);">Wissensbasis wird geladen…</div>';
    return;
  }

  // Nach Kategorie gruppieren
  var kategorien = {
    performance:   { label: 'Performance & Muskelaufbau', emoji: '💪', items: [] },
    gesundheit:    { label: 'Gesundheit & Vorbeugung',    emoji: '🛡️', items: [] },
    regeneration:  { label: 'Regeneration',               emoji: '🌙', items: [] },
    wellbeing:     { label: 'Wellbeing & Mental',         emoji: '🧠', items: [] }
  };

  Object.keys(WIRKSTOFFE_WISSEN).forEach(function (id) {
    if (id === '_meta') return;  // Meta-Eintrag überspringen
    var w   = WIRKSTOFFE_WISSEN[id];
    var kat = kategorien[w.kategorie] || kategorien.gesundheit;
    kat.items.push({ id: id, daten: w });
  });

  // HTML aufbauen
  var html = '';
  Object.keys(kategorien).forEach(function (key) {
    var kat = kategorien[key];
    if (kat.items.length === 0) return;

    html += '<div class="guide-kat">';
    html +=   '<div class="guide-kat-header">';
    html +=     '<span class="guide-kat-emoji">' + kat.emoji + '</span>';
    html +=     '<span class="guide-kat-label">' + kat.label + '</span>';
    html +=   '</div>';

    kat.items.forEach(function (item) {
      var w        = item.daten;
      var evidenz  = w.evidenz || {};
      var prioColor = farbeFuerEvidenz(evidenz.level);

      html += '<div class="guide-item" onclick="guideOeffneDetail(\'' + item.id + '\')">';
      html +=   '<div class="guide-item-emoji">' + (w.ikon || '💊') + '</div>';
      html +=   '<div class="guide-item-info">';
      html +=     '<div class="guide-item-name">' + w.name + '</div>';
      html +=     '<div class="guide-item-tagline">' + (w.kurz_beschreibung || '') + '</div>';
      html +=   '</div>';
      html +=   '<div class="guide-item-prio" style="color:' + prioColor + ';">' +
                  'Evidenz ' + (evidenz.level || '?') +
                '</div>';
      html +=   '<div class="guide-item-arrow">›</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;
}


// ── DETAIL ÖFFNEN ──
function guideOeffneDetail(id) {
  var w = WIRKSTOFFE_WISSEN && WIRKSTOFFE_WISSEN[id];
  if (!w) {
    console.warn('Wirkstoff nicht gefunden:', id);
    return;
  }

  var detailEl = document.getElementById('guide-detail-inner');
  if (!detailEl) return;

  // ── HTML aufbauen ──
  var html = '<button class="guide-detail-back" onclick="guideDetailZurueck()">← Zurück zur Liste</button>';

  // Header
  html += '<div class="guide-detail-emoji">' + (w.ikon || '💊') + '</div>';
  html += '<h2 class="guide-detail-name">' + w.name + '</h2>';
  html += '<div class="guide-detail-tagline">' + (w.kurz_beschreibung || '') + '</div>';

  // Evidenz-Badge
  var ev = w.evidenz || {};
  var evColor = farbeFuerEvidenz(ev.level);
  html += '<div class="gd-evidenz-badge" style="background:' + evColor + '20;border-color:' + evColor + '50;color:' + evColor + ';">';
  html +=   '<span class="gd-evidenz-level">Evidenz Level ' + (ev.level || '?') + '</span>';
  html +=   '<span class="gd-evidenz-sub">' + evidenzLabel(ev.level) + '</span>';
  html += '</div>';

  // ── Über diesen Nährstoff (Beschreibung) ──
  if (w.beschreibung) {
    var b = w.beschreibung;
    html += '<div class="gd-sektion">';
    html +=   '<div class="gd-sektion-titel">📖 Über diesen Nährstoff</div>';
    if (b.was_ist_es) {
      html += '<div class="gd-besch-block">';
      html +=   '<div class="gd-besch-titel">Was ist es?</div>';
      html +=   '<div class="gd-besch-text">' + b.was_ist_es + '</div>';
      html += '</div>';
    }
    if (b.wie_wirkt_es) {
      html += '<div class="gd-besch-block">';
      html +=   '<div class="gd-besch-titel">Wie wirkt es?</div>';
      html +=   '<div class="gd-besch-text">' + b.wie_wirkt_es + '</div>';
      html += '</div>';
    }
    if (b.warum_wichtig) {
      html += '<div class="gd-besch-block">';
      html +=   '<div class="gd-besch-titel">Warum supplementieren?</div>';
      html +=   '<div class="gd-besch-text">' + b.warum_wichtig + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ── Fazit / Auf einen Blick ──
  if (w.fazit) {
    var f = w.fazit;
    html += '<div class="gd-fazit">';
    html +=   '<div class="gd-fazit-titel">🎯 Auf einen Blick</div>';
    if (f.top_effekte && f.top_effekte.length) {
      html += '<div class="gd-fazit-zeile">';
      html +=   '<div class="gd-fazit-label">Top-Effekte</div>';
      html +=   '<ul class="gd-fazit-liste">';
      f.top_effekte.forEach(function (e) { html += '<li>' + e + '</li>'; });
      html +=   '</ul>';
      html += '</div>';
    }
    if (f.ideal_fuer) {
      html += '<div class="gd-fazit-zeile">';
      html +=   '<div class="gd-fazit-label">Ideal für</div>';
      html +=   '<div class="gd-fazit-text">' + f.ideal_fuer + '</div>';
      html += '</div>';
    }
    // Vollständige Dosierung: bevorzugt w.dosierung (Detail-Objekt),
    // Fallback auf das alte Kurzfeld f.dosis
    if (w.dosierung) {
      var fd = w.dosierung;
      html += '<div class="gd-fazit-zeile">';
      html +=   '<div class="gd-fazit-label">Empfohlene Dosierung</div>';
      html +=   '<div class="gd-dosis-box">';
      html +=     '<div class="gd-dosis-haupt">' + (fd.standard || '–') + '</div>';
      if (fd.timing) html += '<div class="gd-dosis-timing"><strong>Timing:</strong> ' + fd.timing + '</div>';
      if (fd.loading_optional) {
        html += '<div class="gd-dosis-loading">';
        html +=   '<div class="gd-dosis-loading-titel">⚡ Optional: Loading-Phase</div>';
        html +=   '<div>' + fd.loading_optional.dosierung + ' → danach ' + fd.loading_optional.danach + '</div>';
        if (fd.loading_optional.kommentar) {
          html += '<div class="gd-dosis-loading-hint">' + fd.loading_optional.kommentar + '</div>';
        }
        html += '</div>';
      }
      if (fd.quelle) html += '<div class="gd-dosis-quelle">Quelle: ' + fd.quelle + '</div>';
      html +=   '</div>';
      html += '</div>';
    } else if (f.dosis) {
      html += '<div class="gd-fazit-zeile">';
      html +=   '<div class="gd-fazit-label">Dosis</div>';
      html +=   '<div class="gd-fazit-text gd-fazit-dosis">' + f.dosis + '</div>';
      html += '</div>';
    }
    if (f.vorsicht_bei) {
      html += '<div class="gd-fazit-zeile gd-fazit-warn">';
      html +=   '<div class="gd-fazit-label">⚠️ Vorsicht bei</div>';
      html +=   '<div class="gd-fazit-text">' + f.vorsicht_bei + '</div>';
      html += '</div>';
    }
    // ── Marketing-Mythen / Überschätzt ──
    if (f.mythen && f.mythen.length) {
      html += '<div class="gd-fazit-zeile gd-fazit-mythen">';
      html +=   '<div class="gd-fazit-label">🧐 Ehrlich gesagt (überschätzt / Mythen)</div>';
      html +=   '<ul class="gd-fazit-liste">';
      f.mythen.forEach(function (e) { html += '<li>' + e + '</li>'; });
      html +=   '</ul>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ── Effektgrößen ──
  if (ev.effekt_groesse && ev.effekt_groesse.length) {
    html += '<div class="gd-sektion">';
    html +=   '<div class="gd-sektion-titel">📊 Wissenschaftlich belegte Effekte</div>';
    ev.effekt_groesse.forEach(function (eff, idx) {
      var effId        = id + '-eff-' + idx;
      var hatErklaerung = !!eff.erklaerung;

      // Die ganze Box ist klickbar wenn Erklärung vorhanden
      html += '<div class="gd-effekt' + (hatErklaerung ? ' gd-effekt-klickbar' : '') + '"' +
              (hatErklaerung ? ' onclick="gdToggleErklaerung(\'' + effId + '\', this)"' : '') + '>';
      html +=   '<div class="gd-effekt-wert">' + eff.wert + ' <span class="gd-effekt-einheit">' + (eff.einheit || '') + '</span></div>';
      html +=   '<div class="gd-effekt-kontext">' + eff.kontext + '</div>';
      if (eff.quelle) html += '<div class="gd-effekt-quelle">' + eff.quelle + '</div>';

      // Dezenter Hinweis dass es klickbar ist
      if (hatErklaerung) {
        html += '<div class="gd-effekt-hint">';
        html +=   '<span class="gd-effekt-hint-icon">▼</span>';
        html +=   '<span>Tippen für Details</span>';
        html += '</div>';
      }

      // ── Aufklappbares Panel ──
      if (hatErklaerung) {
        html += '<div class="gd-erklaerung" id="' + effId + '" onclick="event.stopPropagation()">';
        if (eff.erklaerung.was_bedeutet) {
          html += '<div class="gd-erkl-block">';
          html +=   '<div class="gd-erkl-titel">📌 Was bedeutet die Zahl?</div>';
          html +=   '<div class="gd-erkl-text">' + eff.erklaerung.was_bedeutet + '</div>';
          html += '</div>';
        }
        if (eff.erklaerung.studie_zeigt) {
          html += '<div class="gd-erkl-block">';
          html +=   '<div class="gd-erkl-titel">📌 Was zeigt die Studie konkret?</div>';
          html +=   '<div class="gd-erkl-text">' + eff.erklaerung.studie_zeigt + '</div>';
          html += '</div>';
        }
        if (eff.erklaerung.studien_details) {
          html += '<div class="gd-erkl-block">';
          html +=   '<div class="gd-erkl-titel">📌 Studiendetails</div>';
          html +=   '<div class="gd-erkl-text">' + eff.erklaerung.studien_details + '</div>';
          html += '</div>';
        }
        if (eff.erklaerung.zuverlaessigkeit) {
          html += '<div class="gd-erkl-block">';
          html +=   '<div class="gd-erkl-titel">📌 Wie zuverlässig ist das?</div>';
          html +=   '<div class="gd-erkl-text">' + eff.erklaerung.zuverlaessigkeit + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
    });
    if (ev.studien_anzahl) {
      html += '<div class="gd-studien-anzahl">Basis: ' + ev.studien_anzahl + '+ wissenschaftliche Studien</div>';
    }
    html += '</div>';
  }

  // ── Indikationen ──
  if (w.indikationen && w.indikationen.length) {
    html += '<div class="gd-sektion">';
    html +=   '<div class="gd-sektion-titel">🎯 Wofür ist es besonders gut?</div>';
    // Nach Stärke sortieren
    var indSorted = w.indikationen.slice().sort(function (a, b) { return (b.staerke || 0) - (a.staerke || 0); });
    indSorted.forEach(function (ind) {
      var staerkePct = Math.round((ind.staerke || 0) * 100);
      html += '<div class="gd-indikation">';
      html +=   '<div class="gd-ind-zeile">';
      html +=     '<span class="gd-ind-ziel">' + zielLabel(ind.ziel) + '</span>';
      html +=     '<div class="gd-ind-bar"><div class="gd-ind-bar-fill" style="width:' + staerkePct + '%;"></div></div>';
      html +=     '<span class="gd-ind-pct">' + staerkePct + '%</span>';
      html +=   '</div>';
      if (ind.kommentar) {
        html +=   '<div class="gd-ind-kommentar">' + ind.kommentar + '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // ── Dosierung: jetzt vollständig in "Auf einen Blick" integriert ──
  // (Der frühere separate Dosierungsblock wurde nach oben in die Fazit-Box verschoben.)

  // ── Population-spezifisch ──
  if (w.population_spezifisch) {
    var pops = w.population_spezifisch;
    var popKeys = Object.keys(pops);
    if (popKeys.length > 0) {
      html += '<div class="gd-sektion">';
      html +=   '<div class="gd-sektion-titel">👥 Spezielle Hinweise für Zielgruppen</div>';
      popKeys.forEach(function (key) {
        var pop = pops[key];
        if (!pop.relevant) return;
        html += '<div class="gd-pop">';
        html +=   '<div class="gd-pop-titel">' + popLabel(key) + '</div>';
        html +=   '<div class="gd-pop-text">' + pop.kommentar + '</div>';
        if (pop.quelle) html += '<div class="gd-pop-quelle">' + pop.quelle + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
  }

  // ── Kontraindikationen ──
  if (w.kontraindikationen && w.kontraindikationen.length) {
    html += '<div class="gd-sektion gd-sektion-warn">';
    html +=   '<div class="gd-sektion-titel">⚠️ Vorsicht / Nicht geeignet bei</div>';
    w.kontraindikationen.forEach(function (k) {
      html += '<div class="gd-warn">';
      html +=   '<div class="gd-warn-titel">' + kontraLabel(k.wert) + '</div>';
      html +=   '<div class="gd-warn-text">' + k.hinweis + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ── Warnhinweise ──
  if (w.warnhinweise && w.warnhinweise.length) {
    html += '<div class="gd-sektion">';
    html +=   '<div class="gd-sektion-titel">💡 Wichtig zu wissen</div>';
    html +=   '<ul class="gd-hinweise-liste">';
    w.warnhinweise.forEach(function (h) {
      html += '<li>' + h + '</li>';
    });
    html +=   '</ul>';
    html += '</div>';
  }

  // ── Quellen ──
  if (w.quellen && w.quellen.length) {
    html += '<div class="gd-sektion">';
    html +=   '<div class="gd-sektion-titel">📚 Wissenschaftliche Quellen</div>';
    html +=   '<div class="gd-quellen-hint">Alle Aussagen basieren auf den folgenden publizierten Studien:</div>';
    w.quellen.forEach(function (q) {
      html += '<a href="' + q.url + '" target="_blank" rel="noopener" class="gd-quelle">';
      html +=   '<div class="gd-quelle-titel">' + q.titel + '</div>';
      html +=   '<div class="gd-quelle-meta">';
      html +=     '<span>' + (q.autoren || '–') + '</span>';
      html +=     '<span class="gd-quelle-jahr">' + (q.jahr || '?') + '</span>';
      html +=     '<span class="gd-quelle-typ">' + typLabel(q.typ) + '</span>';
      html +=   '</div>';
      html += '</a>';
    });
    html += '</div>';
  }

  // Disclaimer
  html += '<div class="gd-disclaimer">';
  html +=   'Diese Informationen ersetzen keine medizinische Beratung. ';
  html +=   'Bei Vorerkrankungen, Schwangerschaft oder Medikamenteneinnahme bitte einen Arzt konsultieren.';
  html += '</div>';

  detailEl.innerHTML = html;
  document.getElementById('guide-detail').classList.add('sichtbar');
}


// ── DETAIL SCHLIESSEN ──
function guideDetailZurueck() {
  var d = document.getElementById('guide-detail');
  if (d) d.classList.remove('sichtbar');
}


// ── LABEL-HELPERS ──

function farbeFuerEvidenz(level) {
  if (level === 'A') return '#10B981';  // Grün – sehr stark belegt
  if (level === 'B') return '#3B82F6';  // Blau – gut belegt
  if (level === 'C') return '#F59E0B';  // Gelb – moderate Evidenz
  if (level === 'D') return '#EF4444';  // Rot – schwach belegt
  return '#6B7280';                      // Grau – unbekannt
}

function evidenzLabel(level) {
  if (level === 'A') return 'Sehr stark wissenschaftlich belegt';
  if (level === 'B') return 'Gut belegt durch Meta-Analysen';
  if (level === 'C') return 'Moderate Evidenz – einzelne RCTs';
  if (level === 'D') return 'Schwache Evidenz – Vorsicht';
  return 'Evidenz wird noch geprüft';
}

function zielLabel(ziel) {
  var labels = {
    'muskelaufbau':           '💪 Muskelaufbau',
    'kraftsteigerung':        '⚡ Kraftsteigerung',
    'regeneration':           '🌙 Regeneration',
    'knochengesundheit_frauen':'🦴 Knochengesundheit (Frauen)',
    'sarkopenie_praevention': '🛡️ Muskelerhalt im Alter',
    'kognition_alt':          '🧠 Kognition (Ältere)',
    'ausdauer_hochintensiv':  '🏃 Ausdauer (hochintensiv)',
    'fettabbau':              '🔥 Fettabbau',
    'immunsystem':            '🦠 Immunsystem',
    'schlaf':                 '😴 Schlafqualität',
    'energie':                '⚡ Energie',
    'gesundheit':             '❤️ Allgemeine Gesundheit',
  };
  return labels[ziel] || ziel;
}

function popLabel(key) {
  var labels = {
    'frauen':              '👩 Frauen',
    'maenner':             '👨 Männer',
    'senioren_50plus':     '👴 Senioren (50+)',
    'vegetarier_veganer':  '🌱 Vegetarier & Veganer',
    'schwangerschaft':     '🤰 Schwangerschaft',
    'leistungssportler':   '🏆 Leistungssportler',
  };
  return labels[key] || key;
}

function kontraLabel(wert) {
  var labels = {
    'niereninsuffizienz':   'Nierenerkrankung',
    'schwangerschaft':      'Schwangerschaft',
    'blutverduenner':       'Blutverdünner',
    'schilddruese':         'Schilddrüsen-Medikamente',
    'antidepressiva':       'Antidepressiva',
    'bluthochdruck':        'Bluthochdruck-Medikamente',
    'diabetes':             'Diabetes',
  };
  return labels[wert] || wert;
}

function typLabel(typ) {
  var labels = {
    'meta_analyse':    'Meta-Analyse',
    'systematic_review':'Systematic Review',
    'position_stand':  'Position Stand',
    'rct':             'RCT',
    'review':          'Review',
  };
  return labels[typ] || typ;
}


// ── ERKLÄRUNGS-PANEL AUFKLAPPEN/SCHLIESSEN ──
// box = das geklickte .gd-effekt Element (wird automatisch von onclick übergeben)
function gdToggleErklaerung(effId, box) {
  var panel = document.getElementById(effId);
  if (!panel) return;

  var offen = panel.classList.contains('gd-erkl-offen');
  panel.classList.toggle('gd-erkl-offen', !offen);

  // Box-State umschalten (für Hint-Icon-Rotation und Background)
  if (box) box.classList.toggle('gd-effekt-offen', !offen);
}
