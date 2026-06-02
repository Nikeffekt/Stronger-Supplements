/* ============================================================
   ki-chat.js – Floating Button & Overlay-Logik
   Verbindet sich mit dem Cloudflare Worker (sicherer Proxy)
   Kennt: Wirkstoffe, Produkte, Quiz-Antworten, User-Stack

   Abhängigkeiten:
   - ki-system-prompt.js (kiSystemPrompt-Funktion)
   - app.js (globale Variablen: AW, NP, meinStack)
============================================================ */

// ── Konfiguration ──
var KI_PROXY_URL = 'https://stronger-proxy.stronger-supplements.workers.dev';

// ── State ──
var kiOffen      = false;
var kiLaedt      = false;
var kiVerlauf    = [];   // Array von { role: 'user'|'assistant', content: '...' }
var kiBegruesst  = false;


// ── Chat öffnen/schließen ──
function kiChatToggle() {
  kiOffen = !kiOffen;
  var overlay = document.getElementById('ki-overlay');
  var fab     = document.getElementById('ki-fab');
  var icon    = document.getElementById('ki-fab-icon');

  if (kiOffen) {
    overlay.classList.add('sichtbar');
    fab.classList.add('offen');
    icon.textContent = '✕';
    // Begrüßung beim ersten Öffnen
    if (!kiBegruesst) {
      kiBegruesst = true;
      setTimeout(function() { kiBegruessen(); }, 300);
    }
    // Fokus auf Eingabefeld
    setTimeout(function() {
      var inp = document.getElementById('ki-input');
      if (inp) inp.focus();
    }, 350);
  } else {
    overlay.classList.remove('sichtbar');
    fab.classList.remove('offen');
    icon.textContent = '💬';
  }
}

// ── Begrüßungsnachricht ──
function kiBegruessen() {
  var name = (NP && NP.name && NP.name !== 'Nutzer') ? ', ' + NP.name : '';
  var quizGemacht = AW && Object.keys(AW).length > 5;
  var stackVorhanden = meinStack && Object.keys(meinStack).length > 0;

  var text;
  if (quizGemacht && stackVorhanden) {
    text = 'Hey' + name + '! 👋 Ich kenne deinen Stack und dein Profil. Frag mich alles – Timing, Dosierung, Wechselwirkungen oder neue Empfehlungen.';
  } else if (quizGemacht) {
    text = 'Hey' + name + '! 👋 Ich hab dein Quiz-Profil geladen. Stell mir eine Frage zu deinen Supplements oder deinem Stack.';
  } else {
    text = 'Hey' + name + '! 👋 Ich bin dein persönlicher Supplement-Assistent. Frag mich alles – von Kreatin bis Vitamin D. Tipp: Füll das Quiz aus für personalisierte Empfehlungen.';
  }

  kiNachrichtHinzufuegen('ki', text);
}

// ── Nachricht zum Chat hinzufügen ──
function kiNachrichtHinzufuegen(rolle, text) {
  var container = document.getElementById('ki-messages');
  if (!container) return;

  var div = document.createElement('div');
  div.className = 'ki-msg ki-msg-' + rolle;

  var bubble = document.createElement('div');
  bubble.className = 'ki-msg-bubble';
  // Zeilenumbrüche respektieren
  bubble.innerHTML = text.replace(/\n/g, '<br>');

  div.appendChild(bubble);
  container.appendChild(div);

  // Scroll nach unten
  container.scrollTop = container.scrollHeight;
}

// ── Tipp-Indikator anzeigen/verstecken ──
function kiTippAnzeigen(an) {
  var container = document.getElementById('ki-messages');
  var status    = document.getElementById('ki-status');
  if (!container) return;

  var bestehend = document.getElementById('ki-typing-indicator');

  if (an && !bestehend) {
    var div = document.createElement('div');
    div.id = 'ki-typing-indicator';
    div.className = 'ki-msg ki-msg-ki';
    div.innerHTML = '<div class="ki-msg-bubble"><div class="ki-typing"><span></span><span></span><span></span></div></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (status) { status.textContent = 'schreibt…'; status.classList.add('tippt'); }
  } else if (!an && bestehend) {
    bestehend.remove();
    if (status) { status.textContent = 'Online · Dein Supplement-Experte'; status.classList.remove('tippt'); }
  }
}

// ── Nachricht senden ──
function kiSenden() {
  if (kiLaedt) return;

  var input = document.getElementById('ki-input');
  var text  = input ? input.value.trim() : '';
  if (!text) return;

  // Eingabefeld leeren
  input.value = '';
  kiAutoResize(input);

  // User-Nachricht anzeigen
  kiNachrichtHinzufuegen('user', text);

  // Verlauf aktualisieren
  kiVerlauf.push({ role: 'user', content: text });

  // Verlauf auf max. 10 Nachrichten begrenzen (Kosten sparen)
  if (kiVerlauf.length > 10) {
    kiVerlauf = kiVerlauf.slice(kiVerlauf.length - 10);
  }

  // KI anfragen
  kiAnfragen();
}

// ── API-Anfrage an Cloudflare Worker ──
function kiAnfragen() {
  kiLaedt = true;
  kiTippAnzeigen(true);

  var sendBtn = document.getElementById('ki-send');
  if (sendBtn) sendBtn.disabled = true;

  fetch(KI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: kiSystemPrompt(),
      messages:     kiVerlauf
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(daten) {
    kiLaedt = false;
    kiTippAnzeigen(false);
    if (sendBtn) sendBtn.disabled = false;

    // Antwort extrahieren
    var antwort = '';
    if (daten.content && daten.content[0] && daten.content[0].text) {
      antwort = daten.content[0].text;
    } else if (daten.error) {
      antwort = '⚠️ Fehler: ' + daten.error;
    } else {
      antwort = '⚠️ Unbekannter Fehler. Bitte versuche es nochmal.';
    }

    // Antwort zum Verlauf hinzufügen und anzeigen
    kiVerlauf.push({ role: 'assistant', content: antwort });
    kiNachrichtHinzufuegen('ki', antwort);
  })
  .catch(function(err) {
    kiLaedt = false;
    kiTippAnzeigen(false);
    if (sendBtn) sendBtn.disabled = false;
    kiNachrichtHinzufuegen('ki', '⚠️ Verbindungsfehler. Prüfe deine Internetverbindung.');
    console.error('KI-Fehler:', err);
  });
}

// ── Enter-Taste senden (Shift+Enter = neue Zeile) ──
function kiKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    kiSenden();
  }
}

// ── Textarea Höhe automatisch anpassen ──
function kiAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
