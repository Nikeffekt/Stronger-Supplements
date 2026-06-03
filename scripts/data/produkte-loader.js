/* ============================================================
   scripts/data/produkte-loader.js
   Lädt produkte.json, bereinigt die Daten und befüllt die globale DB

   Abhängigkeiten:
   - scripts/state.js       (globale Variable DB)
   - scripts/data/konstanten.js (JSON_KEY_MAP, SEGMENT_MAP, WIRKSTOFF_FILTER)
   Wird genutzt von: scripts/main.js → ladeProdukte()
============================================================ */

// ── HILFSFUNKTIONEN ──

// Bereinigt Preis-Strings aus der JSON (z. B. "29,90 €" → "29,90")
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
  // Exakter Match
  if (SEGMENT_MAP[mp]) return SEGMENT_MAP[mp];
  // Fuzzy Match (Teilstring)
  var keys = Object.keys(SEGMENT_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (mp.indexOf(keys[i]) >= 0) return SEGMENT_MAP[keys[i]];
  }
  return 'other';
}

// Wandelt einen Anbieter-Eintrag aus der JSON in ein App-Produkt-Objekt um
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
// Wandelt die produkte.json Struktur in die App-DB-Struktur um:
// JSON:  { wirkstoffe: { kreatin: { anbieter: [...] } } }
// DB:    { kreatin: { hauptprodukt: {...}, alternativen: [...], alle: [...] } }
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
      alle:         alleProdukte,  // für getPersonalisierteAlts()
    };
  });

  console.log('✅ DB geladen: ' + Object.keys(DB).length + ' Wirkstoffe');
}


// ── PRODUKTE LADEN ──
// Lädt data/produkte.json und befüllt die globale DB.
// Fallback: DB bleibt leer → Popups zeigen Hinweis.
function ladeProdukte() {
  fetch('data/produkte.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (daten) {
      bauDB(daten);
    })
    .catch(function (err) {
      console.warn('produkte.json konnte nicht geladen werden:', err);
      console.warn('Stelle sicher dass data/produkte.json korrekt liegt.');
    });
}
