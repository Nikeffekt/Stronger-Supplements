# Quiz-Spezifikation v2 – Stronger Supplement App

**Status:** Spec finalisiert, bereit zur Implementierung
**Datum:** Juni 2026
**Vorgänger:** quiz.js (10 Pflichtfragen + dynamische Situation-Frage)

---

## Übersicht der Änderungen

| Änderung | Auswirkung |
|---|---|
| Größe-Frage **entfernt** | 9 Pflichtfragen statt 10 |
| Geschlecht: "Keine Angabe" **entfernt** | Nur Männlich/Weiblich |
| Alter: konkrete Zahl **gespeichert** | Engine kann mit exakten Schwellen arbeiten |
| Training: Labels **präzisiert** | Bestand bleibt, klarere Wording |
| Erfahrung: Labels **verfeinert** | Anfänger/Erfahren/Sehr erfahren statt Einsteiger/Fortgeschritten/Profi |
| Ziele: **Stress-Reduktion** als neue Option + Max-3-Limit | 7 Optionen, schärfere Empfehlungen |
| Ernährung: **Pescetarisch** ergänzt + Engine differenziert alle 5 | Vegetarier/Pescetarier endlich korrekt behandelt |
| Allergien: **Milcheiweiß** ergänzt + Engine nutzt alle 5 | Sicherheitslücke geschlossen |
| Medikamente: **Lebererkrankung** ergänzt + Labels verbessert | Curcumin-Sicherheit verbessert |
| Situation: **Multi-Select**, Reha ergänzt, Schlafprobleme granular | Kombi-Profile möglich |

---

## Schritt 1 – Alter (Geburtsjahr)

```
id:        intro
typ:       rad (Number-Picker)
frage:     "Wann bist du geboren?"
hint:      "Beeinflusst Vitamin-D, Kollagen und Dosierungen."
range:     1940-2010
default:   1990
absteigend: true
```

**Speicherung:**
- `a.geburtsjahr` (Number, z.B. 1990)
- `a.alter` (Number, berechnet, z.B. 36)
- `a.intro` (Kategorie A-E, für Rückwärtskompatibilität)

**Engine-Logik:**
Arbeitet mit `a.alter` (Zahl) für exakte Schwellen:
- `>= 50`: Sarkopenie-Prävention, Kollagen relevant
- `>= 60`: HMB hochpriorisiert, intensive Senioren-Logik
- `>= 65`: Knochengesundheit fokussiert
- `< 18`: Sonderbehandlung (Pre-Workout, ZMA, Melatonin verboten)

---

## Schritt 2 – Biologisches Geschlecht

```
id:        geschlecht
typ:       choice
frage:     "Biologisches Geschlecht?"
hint:      "Relevant für Eisen, Magnesium und Dosierungen."

opts:
  A = Männlich
  B = Weiblich
```

**Geändert:**
- "Keine Angabe" entfernt
- User MUSS sich entscheiden (Pflichtfeld)

**Engine-Logik:**
- `w = (geschlecht === 'B')`
- Eisen-Bonus für Frauen, Testosteron-Themen für Männer
- Schwangerschaft/Wechseljahre konditional nur bei `B`

---

## Schritt 3 – Gewicht

```
id:        gewicht
typ:       rad (Number-Picker)
frage:     "Wie viel wiegst du?"
hint:      "Grundlage für exakte Proteindosierung."
einheit:   kg
range:     40-200
default:   75
```

**Behalten:** unverändert

**Engine-Verbesserung (später):**
- Protein-Faktoren werden aus Wissensbasis gelesen (`whey-protein.json` → `dosierung.tagesdosis_pro_kg`)
- Statt hardcoded Code-Logik

---

## Schritt 4 – Trainingsform

```
id:        training
typ:       choice
frage:     "Deine Trainingsform?"
hint:      "Bestimmt deinen Supplement-Bedarf."

opts:
  A = Kraft 4+×/Woche
  B = Kraft 2-3×/Woche
  C = Hauptsächlich Cardio
  D = Mix (Kraft + Cardio kombiniert)         ← Label präzisiert
  E = Wenig Sport (≤ 1×/Woche)                ← Label präzisiert
```

**Engine-Verbesserung:**
- "Mix" wird intelligent als Kraft 2-3x + Cardio-Add-ons behandelt
- Elektrolyte und Beta-Alanin bei Mix mit empfohlen

---

## Schritt 5 – Trainings-Erfahrung

```
id:        erfahrung
typ:       choice
frage:     "Wie lange trainierst du regelmäßig?"     ← umformuliert
hint:      "Beeinflusst die Komplexität deines Stacks."

opts (Code-IDs bleiben):
  einsteiger      = Anfänger (< 1 Jahr)             ← Label verfeinert
  fortgeschritten = Erfahren (1-3 Jahre)            ← Label verfeinert
  profi           = Sehr erfahren (3+ Jahre)        ← Label verfeinert
```

**Behalten:** Code-IDs (`einsteiger`, `fortgeschritten`, `profi`) bleiben für Rückwärtskompatibilität

---

## Schritt 6 – Ziele

```
id:        ziele
typ:       multi (Multi-Select)
frage:     "Deine Ziele?"
hint:      "Wähle deine 3 wichtigsten – das schärft die Empfehlungen."
max:       3                                       ← NEU: Auswahl-Limit

opts:
  A = 💪 Muskelaufbau
  B = 🔥 Fettabbau
  C = ⚡ Mehr Energie
  D = 🏃 Ausdauer
  E = 😴 Regeneration
  F = ❤️ Gesundheit
  G = 🧘 Stress reduzieren                          ← NEU
```

**Engine-Logik:**
- Ziel `G` mappt auf Indikationen: `stress_angst`, `regeneration`, `schlaf`
- Profitierende Wirkstoffe: Ashwagandha (primär), Magnesium-Bisglycinat, ZMA, Vitamin C
- Max-3-Limit zwingt zu Priorisierung → schärferer Stack

**UX-Hinweis für Implementation:**
Bei 3 ausgewählten Optionen wird ein 4. Klick visuell ignoriert oder zeigt Hinweis "Max. 3 Ziele auswählbar".

---

## Schritt 7 – Ernährungsweise

```
id:        ernaehrung
typ:       choice
frage:     "Deine Ernährungsweise?"
hint:      "Beeinflusst Protein-Form, B12, Eisen und Omega-3."   ← präzisiert

opts:
  A = Alles essen
  B = Flexitarisch (selten Fleisch)
  C = Pescetarisch (Fisch, kein Fleisch)            ← NEU
  D = Vegetarisch
  E = Vegan
```

**Engine-Logik (alle 5 differenziert):**
- A: Standard, keine Anpassung
- B: Minimal angepasst (leichter B12-Hinweis)
- C: Wie D, aber Algenöl-Omega-3 nicht zwingend (Fisch ok)
- D: B12-Bonus, Eisen-Bonus, Kreatin-Bonus (kein Fleisch = weniger Kreatin aus Nahrung)
- E: Pflanzenprotein + Algenöl + B12 **essential** + starker Eisen-Bonus + Zink-Bonus

---

## Schritt 8 – Unverträglichkeiten / Allergien

```
id:        unvertraeglichkeiten
typ:       multi (Multi-Select, "Keine" exklusiv)
frage:     "Unverträglichkeiten oder Allergien?"
hint:      "Wichtig für deine Sicherheit – wir filtern Produkte entsprechend."
exkl:      A

opts:
  A = Keine
  B = 🥛 Laktoseintoleranz
  C = 🥛 Milcheiweiß-Allergie                       ← NEU
  D = 🐟 Fischallergie
  E = 🌾 Glutenunverträglichkeit
  F = 🌱 Sojaallergie
```

**Engine-Logik (alle aktiv genutzt):**
- B Laktose → ISO Clear statt Whey-Konzentrat
- C Milcheiweiß → **KEIN Whey, auch nicht ISO Clear** – nur Pflanzenprotein
- D Fisch → Algenöl statt Fischöl
- E Gluten → Hinweis auf glutenfreie Marken
- F Soja → Bei Pflanzenprotein nur Erbsen-/Reis-Blend

**WICHTIG – Code-Migration:**
- Alte Codes: B=Laktose, C=Fisch, D=Gluten, E=Soja
- Neue Codes: B=Laktose, C=Milcheiweiß, D=Fisch, E=Gluten, F=Soja
- profil.js Matcher und Engine müssen umgestellt werden

---

## Schritt 9 – Medikamente / Erkrankungen

```
id:        medikamente
typ:       multi (Multi-Select, "Keine" exklusiv)
frage:     "Erkrankungen oder regelmäßige Medikamente?"     ← umformuliert
hint:      "Sicherheitsrelevant. Wir empfehlen nichts was problematisch wäre."
exkl:      A

opts:
  A = Keine
  B = Blutverdünner / Gerinnungshemmer              ← Label erweitert
  C = Schilddrüsenerkrankung
  D = Bluthochdruck / Herzerkrankung                ← Label erweitert
  E = Nierenerkrankung
  F = Lebererkrankung                               ← NEU
  G = Diabetes
  H = Antidepressiva / Psychopharmaka               ← Label erweitert
```

**Engine-Logik:**
- B Blutverdünner → Vitamin D ohne K2, KEIN Curcumin, KEIN Vitamin E hochdos, Vorsicht Omega-3 (Hochdosis)
- C Schilddrüse → KEIN Ashwagandha, Vorsicht Soja-Protein
- D Bluthochdruck/Herz → KEIN Pre-Workout (Stimulanzien), KEIN Yohimbe
- E Nieren → KEIN Kreatin, KEIN ZMA, KEIN HMB (Calcium), Eiweiß-Vorsicht
- F Lebererkrankung → **KEIN Curcumin (HART)**, Vorsicht Ashwagandha
- G Diabetes → KEIN Pre-Workout, Vorsicht L-Carnitin
- H Antidepressiva → KEIN Melatonin, KEIN Ashwagandha (Serotonin-Modulation)

**WICHTIG – Code-Migration:**
- Alte Codes: B=Blutverd, C=Schilddr, D=BluthHD, E=Niere, F=Diabetes, G=Antidepressiva
- Neue Codes: B=Blutverd, C=Schilddr, D=BluthHD, E=Niere, **F=Leber**, G=Diabetes, H=Antidepressiva
- profil.js Matcher und Engine müssen umgestellt werden

---

## Bonus-Schritt – Aktuelle Situation (Multi-Select)

```
id:        situation
typ:       multi                                    ← war: choice
frage:     "Aktuelle Situation?"
hint:      "Beeinflusst spezielle Empfehlungen."
exkl:      A

opts (kontext-gefiltert):
  A = Keine besondere
  B = 🤰 Schwangerschaft / Stillzeit                (nur weiblich, 18-50)
  C = 🌗 Wechseljahre                               (nur weiblich, 40+)
  D = 😴 Schlafprobleme                             (alle)
  E = 💊 Reha / nach Krankheit                      (alle, NEU)
```

**Bei D ausgewählt: Folgefrage**

```
id:        schlafproblem_typ
typ:       choice
frage:     "Welche Art Schlafproblem?"
hint:      "Bestimmt die richtige Empfehlung."

opts:
  A = Einschlafen (>30 Min bis Schlaf)
  B = Durchschlafen (Aufwachen, wieder einschlafen schwer)
  C = Beides
```

**Engine-Logik:**
- B Schwangerschaft → KOMPLETT eigene minimale Liste
- C Wechseljahre → Kollagen, Vitamin D, Omega-3 priorisiert
- D Schlafprobleme + Typ:
  - Einschlafen → Melatonin Erst-Empfehlung
  - Durchschlafen → Magnesium-Bisglycinat priorisiert, ggf. retardiertes Melatonin
  - Beides → Melatonin + Magnesium kombiniert
- E Reha → HMB priorisiert, Whey-Protein essential, Vitamin C, Omega-3

---

## Reihenfolge im Quiz

```
1. Geburtsjahr            (Pflicht)
2. Geschlecht             (Pflicht)
3. Gewicht                (Pflicht)
4. Training               (Pflicht)
5. Erfahrung              (Pflicht)
6. Ziele                  (Pflicht, Max 3)
7. Ernährung              (Pflicht)
8. Unverträglichkeiten    (Pflicht, "Keine" möglich)
9. Medikamente            (Pflicht, "Keine" möglich)
10. Situation             (Pflicht, "Keine" möglich)
    └─ ggf. 10a. Schlafproblem-Typ (konditional)
```

**Total: 9-10 Fragen** (10. ist konditional auf Schlafproblem)

---

## Datenstruktur (User-Antworten)

```javascript
AW = {
  geburtsjahr: 1990,              // Number
  alter: 36,                      // Number (berechnet)
  intro: 'D',                     // Kategorie (für Rückwärtskompatibilität)
  geschlecht: 'A' | 'B',          // Männlich | Weiblich
  gewicht: 75,                    // Number in kg
  training: 'A'|'B'|'C'|'D'|'E',
  erfahrung: 'einsteiger'|'fortgeschritten'|'profi',
  ziele: ['A', 'D'],              // Array, max 3
  ernaehrung: 'A'|'B'|'C'|'D'|'E',
  unvertraeglichkeiten: ['A'] | ['B','C'],
  medikamente: ['A'] | ['B','F'],
  situation: ['A'] | ['C','D'],   // Multi-Select
  schlafproblem_typ: 'A'|'B'|'C'  // nur wenn 'D' in situation
}
```

---

## Migration alter User-Daten

Wenn User früher mit altem Quiz durchgegangen sind:
- `groesse` → ignorieren
- `geschlecht === 'C'` → ungültig, neues Quiz starten
- Alte Allergien-Codes (D=Gluten alt → E neu) → migrieren oder neu starten
- Alte Medikamenten-Codes (G=Antidepressiva alt → H neu) → migrieren oder neu starten

**Empfehlung:** Bei vorhandenen User-Daten Hinweis zeigen: "Wir haben unser Quiz verbessert – möchtest du es neu machen?"

---

## Engine-Vorbereitung

Diese Quiz-Spec ist die Grundlage für die neue Empfehlungs-Engine (separates Dokument).

Wichtige Mappings:
- Ziele (A-G) → Wirkstoff-Indikationen (`indikationen.ziel`)
- Unverträglichkeiten + Medikamente → Wirkstoff-Kontraindikationen (`kontraindikationen.wert`)
- Geschlecht + Alter → `population_spezifisch` Profile

Standardisierte Wert-IDs (für JSON-Konsistenz):
- `milcheiweiss_allergie` (nicht: milcheiweissallergie, milcheiweiss_kuhmilchprotein)
- `laktose_intoleranz` (nicht: laktoseintoleranz)
- `niereninsuffizienz_schwer` (nicht: nierenerkrankung)
- `vegetarisch_vegan`
- `lebererkrankung`
- `schilddruesenerkrankung`
- `bluthochdruck`
- `diabetes`
- `antikoagulantien` (für Blutverdünner)
- `antidepressiva_ssri`

---

**Status: Spec final, bereit zur Implementierung**
