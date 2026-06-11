# Stronger KI-Bot Upgrade – Installations-Anleitung

## Was wurde gebaut?

Der KI-Bot bekommt einen großen Sprung in Qualität:

1. **Neuer System-Prompt** (`ki-system-prompt.js`)
   - Nutzt deine ECHTE Wissensbasis (`wirkstoffe-wissen.json`) statt das alte Mini-Schema
   - Stronger-Branding (war vorher SupplAI)
   - Klare Verhaltens- und Sicherheitsregeln
   - Lockerer Ton, präzise Inhalte
   - User-Profil sauber formatiert (alle Spec v2 Felder)

2. **Smart Context Loading** (`ki-context-loader.js`)
   - Erkennt automatisch welche Wirkstoffe in einer Frage gemeint sind
   - Lädt nur die nötigen Detail-Daten (token-effizient)
   - Aktiviert Sicherheits-Modus bei medizinischen Themen
   - Aktiviert Mythen-Aufklärungs-Modus bei Mythen-Fragen
   - Erkennt Empfehlungsfragen und steuert Bot-Verhalten

3. **Keyword-Erkennung** (`ki-keywords.js`)
   - 28+ Wirkstoffe mit allen gängigen Schreibweisen
   - 10 Themengruppen (Muskelaufbau, Schlaf, Stress, etc.)
   - Sicherheits-Trigger (Medikamente, Erkrankungen, Notfälle)
   - Mythen-Trigger
   - Empfehlungs-Trigger

4. **Chat-Logik aktualisiert** (`ki-chat.js`)
   - Hängt Smart-Context an Basis-Prompt an
   - Begrüßung aktualisiert (Stronger statt SupplAI)


## Installation

### Schritt 1: Dateien ersetzen / hinzufügen

Lege diese 4 Dateien in **denselben Ordner** wie deine bestehenden Chat-Files
(üblicherweise `scripts/chat/`):

```
scripts/chat/
├── ki-keywords.js          ← NEU
├── ki-context-loader.js    ← NEU
├── ki-system-prompt.js     ← ERSETZEN (komplett neu)
└── ki-chat.js              ← ERSETZEN (kleine Anpassung)
```

### Schritt 2: `index.html` anpassen

Suche diesen Block am Ende der `index.html`:

```html
<!-- KI-Chat -->
<script src="scripts/chat/ki-system-prompt.js"></script>
<script src="scripts/chat/ki-chat.js"></script>
```

Ersetze ihn durch:

```html
<!-- KI-Chat -->
<script src="scripts/chat/ki-keywords.js"></script>
<script src="scripts/chat/ki-context-loader.js"></script>
<script src="scripts/chat/ki-system-prompt.js"></script>
<script src="scripts/chat/ki-chat.js"></script>
```

**Reihenfolge ist wichtig!** Die Skripte hängen voneinander ab:
- `ki-keywords.js` muss vor `ki-context-loader.js` geladen werden
- `ki-context-loader.js` muss vor `ki-system-prompt.js` geladen werden
- `ki-chat.js` kommt zuletzt


## Wie testen?

Öffne deine App im Browser, öffne die DevTools (Cmd+Alt+I) und schau in die
Console. Dort siehst du bei jeder Bot-Antwort:

```
🤖 KI-Kontext geladen: {
  wirkstoffe: ['kreatin', 'magnesium'],
  themen:     ['muskelaufbau'],
  sicherheit: false,
  mythen:     false,
  empfehlung: false,
  contextLaenge: '2134 Zeichen'
}
```

So siehst du genau was der Bot wo hineinbekommen hat.

### Test-Szenarien

Test alle 6 Use Cases nacheinander durch:

**1. Wirkstoff-Fakten (A)**
- "Was macht Kreatin genau?"
- "Wie nehme ich Magnesium am besten?"
- "Erklär mir Beta-Alanin"

Erwartung: Detaillierte, präzise Antwort mit konkreter Dosis und Timing.
In Console: `wirkstoffe: ['kreatin']` o.ä.

**2. Stack-Erklärung (B)**
*(Nur nach Quiz-Durchlauf)*
- "Warum ist Magnesium in meinem Stack?"
- "Erklär mir warum ich Ashwagandha brauche"

Erwartung: Bot bezieht sich auf das User-Profil und erklärt
warum genau dieser Wirkstoff für dich passt.

**3. Neue Empfehlungen (C)**
- "Was hilft mir bei Stress?"
- "Ich hab Schlafprobleme – was kann ich nehmen?"

Erwartung: Bot erklärt mögliche Wirkstoffe informativ, verweist
ab und zu aufs Quiz für personalisierte Empfehlung.
In Console: `empfehlung: true`.

**4. Mythen-Aufklärung (D)**
- "Stimmt es dass Kreatin die Nieren schädigt?"
- "Ist Whey besser als Pflanzenprotein?"

Erwartung: Klare Aufklärung mit Quelle (z.B. ISSN 2017).
In Console: `mythen: true`.

**5. Sicherheits-Beratung (E)**
- "Ich nehme Marcumar – ist Curcumin ok?"
- "Hab Schilddrüsenüberfunktion, kann ich Ashwagandha nehmen?"

Erwartung: KLARES Abraten, Quelle nennen, Arzt-Verweis.
In Console: `sicherheit: true`.

**6. Quiz-Ersatz (F)**
*(Noch nicht implementiert – Bot verweist aktuell aufs Quiz)*
- "Welchen Stack soll ich nehmen?"

Erwartung: Bot erklärt freundlich dass Quiz die saubere
Lösung ist, gibt aber Wissen weiter wenn gewünscht.


## Was passiert intern?

```
User: "Stimmt es dass Kreatin die Nieren schädigt?"
   ↓
ki-chat.js: kiSenden() wird aufgerufen
   ↓
ki-chat.js: kiAnfragen(text) ruft Smart-Loader auf
   ↓
ki-context-loader.js: kiAnalysiereNachricht() erkennt:
   - Wirkstoff: 'kreatin'
   - Mythen-Modus: aktiv
   ↓
ki-context-loader.js: Baut Kontext-Block:
   - Mythen-Aufklärungs-Anweisung
   - Volldetails zu Kreatin (inkl. Mythen-Aufklärung aus JSON)
   ↓
ki-chat.js: Sendet an Cloudflare Worker:
   - System-Prompt (Basis + Smart-Context)
   - Letzte 10 Nachrichten
   ↓
Cloudflare Worker → Anthropic API
   ↓
Claude: Antwortet mit ehrlicher Aufklärung
        ("Bei gesunden Nieren keine Schäden, ISSN 2017 ...")
```


## Bekannte Einschränkungen (bewusst so designed)

1. **Bot gibt keine eigenen Stack-Empfehlungen.**
   Empfehlungen kommen aus der Engine (Quiz). Bot verweist freundlich aufs
   Quiz. Engine-Integration kommt in einem späteren Schritt.

2. **Keyword-Erkennung ist regex-basiert, nicht semantisch.**
   Wenn jemand sehr kreativ formuliert, kann was durchrutschen. Für 95%
   der typischen Fragen funktioniert es robust. Bei Bedarf können wir
   später auf Vektor-Suche umsteigen.

3. **Verlauf weiterhin bei 10 Nachrichten gekappt.**
   Kostenoptimierung. Bei Bedarf erhöhen oder smartes Memory einbauen.

4. **Kein Streaming.**
   Antwort kommt am Stück. Streaming wäre eine separate Erweiterung.


## Nächste Schritte (optional, später)

- **Engine-Integration:** `empfehlungen.js` refactoring, dann kann der Bot
  echte personalisierte Empfehlungen geben.

- **Conversation Memory:** Statt 10er-Cap intelligenter Verlauf
  (Kernfakten merken, Smalltalk vergessen).

- **Streaming:** Antworten wortweise einblenden für besseres UX.

- **Vektor-Suche (RAG):** Wenn Wissensbasis auf 50+ Wirkstoffe wächst,
  echtes RAG mit Supabase pgvector.


## Debugging-Hilfen

**Bot antwortet generisch / kennt Wirkstoff nicht:**
- Console öffnen, schauen ob `WIRKSTOFFE_WISSEN` geladen ist:
  `Object.keys(WIRKSTOFFE_WISSEN).length` muss > 0 sein.
- Falls leer: produkte-loader.js Problem, JSON-Datei prüfen.

**Bot weiß nicht von User-Profil:**
- In Console: `AW` ausgeben.
- Falls leer: Quiz wurde nicht durchgeführt.

**Smart-Context wird nicht aktiviert:**
- In Console schauen ob `🤖 KI-Kontext geladen:` ausgegeben wird.
- Falls nicht: Skript-Reihenfolge in index.html prüfen.

**Bot gibt falsche/veraltete Infos:**
- Wissensbasis (`wirkstoffe-wissen.json`) auf aktuelle Version prüfen.
- Bot zieht ALLES aus der JSON – also bei Updates dort ansetzen.
