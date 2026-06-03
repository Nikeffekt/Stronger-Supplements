/* ============================================================
   scripts/data/konstanten.js
   Statische Maps, Label-Definitionen und Filter

   Abhängigkeiten: keine
   Wird genutzt von:
   - scripts/data/produkte-loader.js  (JSON_KEY_MAP, SEGMENT_MAP, WIRKSTOFF_FILTER)
   - scripts/ui/profil.js             (ALT, TRG, ERN, GES, ZIEL)
   - scripts/chat/ki-system-prompt.js (Label-Maps)
============================================================ */

// ── JSON → APP KEY MAPPING ──
// Einige Wirkstoff-Schlüssel in produkte.json weichen vom App-Key ab
var JSON_KEY_MAP = {
  'omega_3':         'omega3',
  'vitamin_d3_k2':   'vitamin_d3',
  'eaa_bcaa':        'eaas',
  'grüner_tee_egcg': 'gruener_tee',
};

// ── SEGMENT MAPPING ──
// Wandelt marktposition aus produkte.json in interne Segment-Keys um
// Genutzt von: produkte-loader.js → segmentAusAnbieter()
var SEGMENT_MAP = {
  'DACH #1 Premium':               'dach_premium',
  'Studio-Distribution DACH':      'dach_premium',
  'Global Masse / Preis-Leistung': 'preis_leistung',
  'Budget Global':                 'preis_leistung',
  'Wachstum CEE / Preisjäger':     'budget_cee',
  'Functional EU / CEE Leader':    'functional',
  'Globaler Bestseller':           'reviews_global',
  'Review-König EU':               'eu_reviews',
  'Premium / Medical Grade':       'premium_medical',
  'Medical Grade / Biohacker':     'medical_grade',
  'Tradition & Qualität EU':       'tradition',
  'Trend / Functional':            'trend',
};

// ── ALLERGEN FILTER ──
// Welche Allergene sind in welchem Wirkstoff enthalten?
// Genutzt von: produkte-loader.js → anbieterZuProdukt()
//              personalisierung.js → istKompatibel()
var WIRKSTOFF_FILTER = {
  'whey_protein':    ['laktose'],
  'omega3':          ['fisch'],
  'kollagen':        ['tierisch'],
  'eaas':            [],
  'omega3_vegan':    [],
  'pflanzenprotein': [],
  'iso_clear':       [],   // laktosefrei per Definition
};

// ── LABEL MAPS (für Profil-Anzeige) ──
var ALT  = { A: '<18',       B: '18–25',     C: '26–35',       D: '36–45',  E: '>45' };
var TRG  = { A: 'Kraft 4+/Wo', B: 'Kraft 2–3/Wo', C: 'Cardio', D: 'Mix',   E: 'Wenig Sport' };
var ERN  = { A: 'Omnivor',   B: 'Flexitarisch', C: 'Vegetarisch', D: 'Vegan' };
var GES  = { A: 'Männlich',  B: 'Weiblich',  C: 'Keine Angabe' };
var ZIEL = {
  A: '💪 Muskelaufbau',
  B: '🔥 Fettabbau',
  C: '⚡ Energie',
  D: '🏃 Ausdauer',
  E: '😴 Regeneration',
  F: '❤️ Gesundheit',
};
