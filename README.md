# Stronger – Supplement-Berater App

Personalisierte Supplement-Empfehlungen auf Basis eines Quiz-Profils. Mobile-first Web-App mit KI-Chat-Assistent.

---

## Projektstruktur

```
stronger/
├── index.html                         # App-Einstiegspunkt
├── README.md                          # Diese Datei
│
├── assets/
│   └── images/
│       └── banner1.jpg … banner4.jpg  # Banner-Karussell Bilder
│
├── data/                              # Reine Datendateien (kein Code)
│   ├── produkte.json                  # Alle Produkte & Anbieter
│   ├── wirkstoffe_meta.json           # Wirkstoff-Metadaten
│   ├── wirkstoff-erklaerungen.json    # Popup-Beschreibungstexte
│   └── wirkstoff-inhalte.json        # Overlap-Map (welche Wirkstoffe sind in welchem Produkt)
│
├── styles/
│   ├── main.css                       # Sammeldatei – importiert alle anderen
│   │
│   ├── base/
│   │   ├── tokens.css                 # CSS-Variablen (Farben, Fonts, Z-Index, Transitions)
│   │   ├── reset.css                  # Reset & Body-Defaults
│   │   └── layout.css                 # #app, Screen-System, globale Animationen
│   │
│   ├── components/                    # Wiederverwendbare UI-Komponenten
│   │   ├── announcement-bar.css
│   │   ├── header.css                 # Header + Hamburger-Menü
│   │   ├── cards.css
│   │   ├── buttons.css
│   │   ├── progressbar.css
│   │   └── toast.css
│   │
│   └── screens/                       # Pro Screen eine Datei
│       ├── start.css
│       ├── quiz.css
│       ├── login.css
│       ├── profil.css                 # Profil + Wirkstoff-Popup
│       ├── shop.css
│       ├── guide.css
│       ├── usp.css
│       └── ki-chat.css
│
└── scripts/
    ├── main.js                        # Einstiegspunkt – DOMContentLoaded + alle Inits
    ├── state.js                       # Globaler App-State (DB, AW, NP, meinStack …)
    ├── navigation.js                  # zeige() – Screen-Wechsel
    │
    ├── data/
    │   ├── konstanten.js              # JSON_KEY_MAP, SEGMENT_MAP, Label-Maps
    │   └── produkte-loader.js         # Lädt alle 3 JSONs parallel, befüllt State
    │
    ├── engine/
    │   ├── empfehlungen.js            # berechneEmpfehlungen(), dosis()
    │   ├── overlaps.js                # loesOverlaps() – verhindert Doppelempfehlungen
    │   └── personalisierung.js        # getPersonalisierteAlts() – profilbasierte Auswahl
    │
    ├── ui/
    │   ├── toast.js                   # toast() – temporäre Feedback-Meldung
    │   ├── reset.js                   # resetApp() – kompletter State-Reset
    │   ├── banner.js                  # initBanner() – Karussell mit Auto-Play & Swipe
    │   ├── header.js                  # initHamburger() – Menü-Overlay
    │   ├── start-modal.js             # oeffneStartModal() – Quiz vs. Shop Auswahl
    │   ├── shop.js                    # zeigeShop() – Platzhalter (noch nicht implementiert)
    │   ├── guide.js                   # guideOeffnen(), guideOeffneDetail() + GUIDE_DATEN
    │   └── profil.js                  # zeigeProfil(), oeffneWirkstoffPopup(), schliessePopup()
    │
    ├── quiz/
    │   └── quiz.js                    # Quiz-Logik, Fragen-Queue, Jahresrad
    │
    └── chat/
        ├── ki-chat.js                 # KI-Chat Toggle, Senden, API-Anfrage
        └── ki-system-prompt.js        # System-Prompt Aufbau + Wirkstoff-Index
```

---

## Screens

| Screen ID | Beschreibung |
|---|---|
| `s-start` | Startseite mit Hero, Banner-Karussell und USP-Liste |
| `s-quiz` | Personalisierungs-Quiz (10 Fragen) |
| `s-login` | Name & E-Mail Eingabe |
| `s-profil` | Empfohlener Stack mit Wirkstoff-Popup |
| `s-shop` | Produktkatalog *(noch nicht implementiert)* |
| `s-guide` | Supplement-Wissensdatenbank |
| `s-usp-*` | USP Detail-Screens (12 Screens) |

---

## Script-Ladereihenfolge

Die Reihenfolge in `index.html` ist wichtig – jede Datei hängt von den vorher geladenen ab:

```
state.js → navigation.js → konstanten.js → produkte-loader.js
→ engine/* → ui/* → quiz.js → chat/* → main.js
```

---

## Design-System

Alle CSS-Variablen sind in `styles/base/tokens.css` definiert.

| Token-Gruppe | Beispiel |
|---|---|
| Farben | `--orange`, `--bg`, `--card`, `--text` |
| Z-Index | `--z-header`, `--z-overlay`, `--z-fab` |
| Transitions | `--t-fast`, `--t-spring`, `--t-smooth` |
| Typografie | `--font-d` (Display), `--font-b` (Body), `--font-m` (Mono) |
| Abstände | `--app-padding-x`, `--header-height` |

---

## KI-Chat

Der Chat verbindet sich mit einem **Cloudflare Worker** als sicheren Proxy zur Anthropic API.

- Proxy URL: `https://stronger-proxy.stronger-supplements.workers.dev`
- Kontext: Quiz-Profil, aktueller Stack und Wirkstoff-Index werden bei jeder Anfrage mitgeschickt
- Verlauf: max. 10 Nachrichten (Kosten-Optimierung)

---

## Offene Punkte

- [ ] Shop-Screen implementieren (`scripts/ui/shop.js` ist Platzhalter)
- [ ] Vektordatenbank (Supabase pgvector) für semantische Suche im KI-Chat
- [ ] `wirkstoff-erklaerungen.js` / `wirkstoff-inhalte.js` → bereits als JSON migriert
- [ ] `Cormorant Garamond` aus Google Fonts entfernen (wird nicht verwendet)
