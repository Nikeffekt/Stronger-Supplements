#!/usr/bin/env node
/* ============================================================
   build-wissen.js
   Build-Skript: Fügt alle einzelnen Wirkstoff-JSONs aus
   data/wirkstoffe/ zur Sammeldatei data/wirkstoffe-wissen.json zusammen.

   Verwendung:
     node build-wissen.js

   Was es tut:
   1. Liest _meta.json (Schema-Version, Disclaimer etc.)
   2. Liest alle anderen .json Dateien aus data/wirkstoffe/
   3. Validiert dass alle Pflichtfelder vorhanden sind
   4. Sortiert nach gewünschter Reihenfolge
   5. Schreibt zusammengeführte Datei nach data/wirkstoffe-wissen.json
============================================================ */

const fs = require('fs');
const path = require('path');

// ── Pfade ──
const QUELL_ORDNER = path.join(__dirname, 'data', 'wirkstoffe');
const ZIEL_DATEI   = path.join(__dirname, 'data', 'wirkstoffe-wissen.json');

// ── Reihenfolge der Wirkstoffe in der Ausgabe ──
// Diese Reihenfolge bestimmt wie sie im Guide angezeigt werden.
// Neue Wirkstoffe einfach unten anhängen.
const REIHENFOLGE = [
  'kreatin',
  'vitamin-d3',
  'omega3',
  'magnesium',
  'whey-protein',
  'zink',
  'ashwagandha',
  'beta-alanin',
  'vitamin-b12',
  'elektrolyte',
  'vitamin-c',
  'eaas',
  'kollagen',
  'koffein',
  'eisen',
  'multivitamin',
];

// ── Pflichtfelder die jeder Wirkstoff haben MUSS ──
const PFLICHTFELDER = [
  'id',
  'name',
  'kategorie',
  'ikon',
  'kurz_beschreibung',
  'beschreibung',
  'fazit',
  'evidenz',
  'indikationen',
  'kontraindikationen',
  'dosierung',
  'population_spezifisch',
  'inhalt',
  'warnhinweise',
  'quellen',
];


// ══════════════════════════════════════════════════════════════
// HELFER-FUNKTIONEN
// ══════════════════════════════════════════════════════════════

// Bunte Konsolen-Ausgabe
const farbe = {
  rot:    (s) => `\x1b[31m${s}\x1b[0m`,
  gruen:  (s) => `\x1b[32m${s}\x1b[0m`,
  gelb:   (s) => `\x1b[33m${s}\x1b[0m`,
  blau:   (s) => `\x1b[34m${s}\x1b[0m`,
  grau:   (s) => `\x1b[90m${s}\x1b[0m`,
  fett:   (s) => `\x1b[1m${s}\x1b[0m`,
};

// JSON sicher laden
function ladeJson(dateipfad) {
  const inhalt = fs.readFileSync(dateipfad, 'utf-8');
  try {
    return JSON.parse(inhalt);
  } catch (err) {
    console.error(farbe.rot(`❌ JSON-Fehler in ${path.basename(dateipfad)}:`));
    console.error(farbe.rot(`   ${err.message}`));
    process.exit(1);
  }
}

// Wirkstoff gegen Pflichtfelder validieren
function validiereWirkstoff(wirkstoff, dateiname) {
  const fehlend = PFLICHTFELDER.filter((f) => !(f in wirkstoff));
  if (fehlend.length > 0) {
    console.error(farbe.rot(`❌ ${dateiname}: Pflichtfelder fehlen:`));
    fehlend.forEach((f) => console.error(farbe.rot(`   • ${f}`)));
    return false;
  }
  return true;
}


// ══════════════════════════════════════════════════════════════
// HAUPTLOGIK
// ══════════════════════════════════════════════════════════════

console.log(farbe.fett('\n📦  Build wirkstoffe-wissen.json\n'));

// Prüfen ob Quell-Ordner existiert
if (!fs.existsSync(QUELL_ORDNER)) {
  console.error(farbe.rot(`❌ Quell-Ordner nicht gefunden: ${QUELL_ORDNER}`));
  console.error(farbe.grau('   Lege data/wirkstoffe/ an und packe die einzelnen JSONs rein.'));
  process.exit(1);
}

// _meta laden
const metaPfad = path.join(QUELL_ORDNER, '_meta.json');
if (!fs.existsSync(metaPfad)) {
  console.error(farbe.rot('❌ _meta.json fehlt im Quell-Ordner'));
  process.exit(1);
}
const meta = ladeJson(metaPfad);
console.log(farbe.grau(`  _meta.json   (Schema v${meta.schema_version})`));

// Datum automatisch aktualisieren
const heute = new Date().toISOString().split('T')[0];
meta.letzte_aktualisierung = heute;

// Alle Wirkstoff-Dateien einlesen
const wirkstoffe = {};
const alleDateien = fs.readdirSync(QUELL_ORDNER)
  .filter((f) => f.endsWith('.json') && f !== '_meta.json');

let fehlerAnzahl = 0;
alleDateien.forEach((dateiname) => {
  const pfad = path.join(QUELL_ORDNER, dateiname);
  const wirkstoff = ladeJson(pfad);
  const id = dateiname.replace('.json', '');

  if (!validiereWirkstoff(wirkstoff, dateiname)) {
    fehlerAnzahl++;
    return;
  }

  wirkstoffe[id] = wirkstoff;
  console.log(farbe.gruen(`  ✓ ${dateiname.padEnd(22)} ${wirkstoff.name}`));
});

if (fehlerAnzahl > 0) {
  console.error(farbe.rot(`\n❌ Build abgebrochen wegen ${fehlerAnzahl} Validierungsfehler\n`));
  process.exit(1);
}

// In der definierten Reihenfolge zusammenfügen
const zusammengefuehrt = { _meta: meta };
const verwendetIds = new Set();

REIHENFOLGE.forEach((id) => {
  if (wirkstoffe[id]) {
    zusammengefuehrt[id.replace(/-/g, '_')] = wirkstoffe[id];
    verwendetIds.add(id);
  } else {
    console.log(farbe.gelb(`  ⚠️  In REIHENFOLGE definiert aber nicht gefunden: ${id}`));
  }
});

// Wirkstoffe die in der Datei aber NICHT in REIHENFOLGE sind
// werden trotzdem hinzugefügt, mit Hinweis
Object.keys(wirkstoffe).forEach((id) => {
  if (!verwendetIds.has(id)) {
    zusammengefuehrt[id.replace(/-/g, '_')] = wirkstoffe[id];
    console.log(farbe.gelb(`  ℹ️  Nicht in REIHENFOLGE, wird angehängt: ${id}`));
    console.log(farbe.grau(`     Tipp: In build-wissen.js zur REIHENFOLGE hinzufügen.`));
  }
});

// Zieldatei schreiben
const ausgabe = JSON.stringify(zusammengefuehrt, null, 2);
fs.writeFileSync(ZIEL_DATEI, ausgabe + '\n', 'utf-8');

// Erfolgsmeldung
const groesseKb = (ausgabe.length / 1024).toFixed(1);
const anzahlWirkstoffe = Object.keys(zusammengefuehrt).length - 1;

console.log(farbe.fett(farbe.gruen(`\n✅ Build erfolgreich!`)));
console.log(farbe.grau(`   ${anzahlWirkstoffe} Wirkstoffe → ${path.basename(ZIEL_DATEI)} (${groesseKb} KB)\n`));
