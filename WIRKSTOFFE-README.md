# Wirkstoffe-Wissensbasis – Workflow

Die Wirkstoff-Wissensbasis ist in zwei Ebenen aufgeteilt:

```
data/
├── wirkstoffe-wissen.json     ← Browser-Datei (auto-generiert, NICHT manuell editieren)
└── wirkstoffe/                 ← Quelldateien (HIER editieren)
    ├── _meta.json              ← Schema-Version, Disclaimer
    ├── kreatin.json
    ├── vitamin-d3.json
    └── ... (eine Datei pro Wirkstoff)
```

## Wirkstoff editieren

1. Datei in `data/wirkstoffe/` öffnen (z. B. `kreatin.json`)
2. Änderungen machen
3. Im Terminal im Projekt-Root:

   ```bash
   node build-wissen.js
   ```

4. Das Skript:
   - Validiert alle Wirkstoffe (Pflichtfelder vorhanden?)
   - Sortiert nach definierter Reihenfolge
   - Aktualisiert das Datum in `_meta`
   - Schreibt `data/wirkstoffe-wissen.json` neu

5. Committen:

   ```bash
   git add .
   git commit -m "Kreatin Dosierung aktualisiert"
   ```

## Neuen Wirkstoff hinzufügen

1. Neue Datei in `data/wirkstoffe/` anlegen, z. B. `taurin.json`
2. Struktur eines bestehenden Wirkstoffs kopieren und anpassen
3. **Wichtig:** Den neuen Wirkstoff in `build-wissen.js` zur `REIHENFOLGE`-Liste hinzufügen (Position bestimmt Anzeige im Guide)
4. `node build-wissen.js` ausführen
5. Bei fehlenden Pflichtfeldern bricht das Skript mit Fehlermeldung ab – nachbessern

## Pflichtfelder pro Wirkstoff

Jeder Wirkstoff MUSS diese 14 Felder haben:

- `id`, `name`, `kategorie`, `ikon`, `kurz_beschreibung`
- `beschreibung` (was_ist_es, wie_wirkt_es, warum_wichtig)
- `fazit` (top_effekte, ideal_fuer, dosis, vorsicht_bei, mythen)
- `evidenz` (level A-D, score, review_typ, studien_anzahl, konsens, effekt_groesse)
- `indikationen`, `kontraindikationen`, `dosierung`, `population_spezifisch`
- `warnhinweise`, `quellen`

Siehe `docs/wirkstoffe-wissen-SCHEMA.md` für Details.

## Dateinamenkonvention

- Unterstriche werden zu Bindestrichen: `vitamin_d3` → `vitamin-d3.json`
- Im JSON-Output bleibt der Key mit Unterstrich (`vitamin_d3`)
- Das macht das Build-Skript automatisch

## Was tun bei Build-Fehler?

```
❌ kreatin.json: Pflichtfelder fehlen:
   • fazit
   • indikationen
```

→ Datei öffnen, fehlende Felder ergänzen, Build erneut ausführen.

```
❌ JSON-Fehler in kreatin.json:
   Unexpected token ] in JSON at position 12345
```

→ Syntax-Fehler. Komma vergessen, Anführungszeichen falsch, etc. JSON-Linter im Editor nutzen.
