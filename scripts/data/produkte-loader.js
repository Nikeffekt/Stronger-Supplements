/* ============================================================
   scripts/data/produkte-loader.js
   Lädt alle drei Daten-JSONs parallel und befüllt den globalen State

   Geladene Dateien:
   - data/produkte.json              → DB
   - data/wirkstoff-erklaerungen.json → ERKLAERUNG
   - data/wirkstoff-inhalte.json      → INHALT

   Abhängigkeiten:
   - scripts/state.js           (DB, ERKLAERUNG, INHALT)
   - scripts/data/konstanten.js (JSON_KEY_MAP, SEGMENT_MAP, WIRKSTOFF_FILTER)
   Wird genutzt von: scripts/main.js → ladeProdukte()
============================================================ */

// ── HILFSFUNKTIONEN ──

// Bereinigt Preis-Strings (z. B. "29,90 €" → "29,90")
function preisBereinigen(preisStr) {
  if (!preisStr) return '0,00';
  var m = preisStr.match(/(\d+[,\.]\d+)/);
  if (m) return m[1].replace('.', ',');
  var m2 = preisStr.match(/(\d+)/);
  return m2 ? m2[1] + ',00' : '0,00';
}

// Bereinigt Rating-Strings (z. B. "4,8 ★" → "4.8 ★")
function ratingBereinigen(ratingStr) {
  if (!ratingStr) return '4.5 ★';
  return ratingStr.replace(',', '.');
}

// Extrahiert bis zu 3 Tags aus einem Anbieter-Objekt
function tagsAusAnbieter(anbieter) {
  var tags = [];
  if (anbieter.trigger) {
    anbieter.trigger.split(',').forEach(function (t) {
      t = t.trim();
      if (t && tags.length < 2) tags.push(t);
    });
  }
  if (tags.length < 2 && anbieter.zertifikat) tags.push(anbieter.zertifikat);
  if (tags.length < 3 && anbieter.empfehlung)  tags.push(anbieter.empfehlung.split(' – ')[0]);
  return tags.slice(0, 3);
}

// Bestimmt das interne Segment aus der marktposition eines Anbieters
function segmentAusAnbieter(anbieter) {
  var mp = anbieter.marktposition || '';
  if (SEGMENT_MAP[mp]) return SEGMENT_MAP[mp];
  var keys = Object.keys(SEGMENT_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (mp.indexOf(keys[i]) >= 0) return SEGMENT_MAP[keys[i]];
  }
  return 'other';
}

// Wandelt einen Anbieter-Eintrag in ein App-Produkt-Objekt um
function anbieterZuProdukt(anbieter, appKey) {
  return {
    marke:   anbieter.name    || '–',
    name:    anbieter.produkt || '–',
    preis:   preisBereinigen(anbieter.preis_paket || anbieter.preis || ''),
    rating:  ratingBereinigen(anbieter.bewertung  || ''),
    tags:    tagsAusAnbieter(anbieter),
    segment: segmentAusAnbieter(anbieter),
    filter:  WIRKSTOFF_FILTER[appKey] || [],
  };
}


// ── DB AUFBAUEN ──
function bauDB(jsonDaten) {
  var wirkstoffe = jsonDaten && jsonDaten.wirkstoffe;
  if (!wirkstoffe) {
    console.warn('produkte.json: Keine Wirkstoffe gefunden.');
    return;
  }

  Object.keys(wirkstoffe).forEach(function (jsonKey) {
    var wirkstoff = wirkstoffe[jsonKey];
    if (!wirkstoff.anbieter || !wirkstoff.anbieter.length) return;

    var appKey       = JSON_KEY_MAP[jsonKey] || jsonKey;
    var alleProdukte = wirkstoff.anbieter.map(function (a) {
      return anbieterZuProdukt(a, appKey);
    });

    DB[appKey] = {
      hauptprodukt: alleProdukte[0],
      alternativen: alleProdukte.slice(1),
      alle:         alleProdukte,
    };
  });

  console.log('✅ DB geladen: ' + Object.keys(DB).length + ' Wirkstoffe');
}


// ── ALLE DATEN PARALLEL LADEN ──
// Lädt produkte.json, wirkstoff-erklaerungen.json, wirkstoff-inhalte.json
// und wirkstoffe-wissen.json gleichzeitig mit Promise.all – schneller als sequenziell.
// Fallback: Leere Objekte damit die App nicht abstürzt.
function ladeProdukte() {
  Promise.all([
    fetch('data/produkte.json').then(function (r) {
      if (!r.ok) throw new Error('produkte.json: HTTP ' + r.status);
      return r.json();
    }),
    fetch('data/wirkstoff-erklaerungen.json').then(function (r) {
      if (!r.ok) throw new Error('wirkstoff-erklaerungen.json: HTTP ' + r.status);
      return r.json();
    }),
    fetch('data/wirkstoff-inhalte.json').then(function (r) {
      if (!r.ok) throw new Error('wirkstoff-inhalte.json: HTTP ' + r.status);
      return r.json();
    }),
    fetch('data/wirkstoffe-wissen.json').then(function (r) {
      if (!r.ok) throw new Error('wirkstoffe-wissen.json: HTTP ' + r.status);
      return r.json();
    })
  ])
  .then(function (ergebnisse) {
    var produkteDaten   = ergebnisse[0];
    var erklaerungDaten = ergebnisse[1];
    var inhaltDaten     = ergebnisse[2];
    var wissenDaten     = ergebnisse[3];

    // Globale Variablen befüllen
    bauDB(produkteDaten);
    Object.keys(erklaerungDaten).forEach(function (k) { ERKLAERUNG[k] = erklaerungDaten[k]; });
    Object.keys(inhaltDaten).forEach(function (k)     { INHALT[k]     = inhaltDaten[k]; });
    Object.keys(wissenDaten).forEach(function (k)     { WIRKSTOFFE_WISSEN[k] = wissenDaten[k]; });

    console.log('✅ Erklärungen geladen: '  + Object.keys(ERKLAERUNG).length        + ' Einträge');
    console.log('✅ Inhalte geladen: '      + Object.keys(INHALT).length            + ' Einträge');
    console.log('✅ Wissensbasis geladen: ' + (Object.keys(WIRKSTOFFE_WISSEN).length - 1) + ' Wirkstoffe');
  })
  .catch(function (err) {
    console.warn('Fehler beim Laden der Daten:', err);
    console.warn('Stelle sicher dass alle JSON-Dateien im data/-Ordner liegen.');
  });
}
