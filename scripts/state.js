/* ============================================================
   scripts/state.js
   Globaler App-State – Single Source of Truth

   Alle globalen Variablen werden hier definiert.
   Keine Logik, nur Deklarationen.

   Abhängigkeiten: keine
   Wird genutzt von: allen anderen Scripts
============================================================ */

// ── PRODUKT-DATENBANK ──
// Wird beim Start aus data/produkte.json geladen (ladeProdukte())
// Struktur nach Laden: { 'kreatin': { hauptprodukt: {...}, alternativen: [...], alle: [...] } }
var DB = {};

// ── QUIZ-ANTWORTEN ──
// Befüllt durch quiz.js
var AW = {};

// ── NUTZERPROFIL ──
// Befüllt durch Login-Screen
var NP = { name: '', email: '' };

// ── STACK STATE ──
var meinStack        = {};  // { suppId: { prod, preis } } – gewählter Stack
var abgewaehlt       = {};  // { suppId: true } – manuell abgewählte Supplements
var aufgeklappteAlts = {};  // { suppId: true } – aufgeklappte Alternativen
var gewaehlteAlts    = {};  // { suppId: altIndex } – gewählte Alternative je Wirkstoff

// ── SHOP STATE ──
var aktivTab = 'essential';  // Aktiver Tab im Shop
