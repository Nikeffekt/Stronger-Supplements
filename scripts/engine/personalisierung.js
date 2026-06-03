/* ============================================================
   engine/personalisierung.js
   Wählt bis zu 5 alternative Produkte für einen Wirkstoff
   anhand des User-Profils (Allergien, Alter, Erfahrung, Ziele …)
   Ausgelagert aus app.js

   Abhängigkeiten:
   - Globale Variable DB (befüllt durch app.js → ladeProdukte/bauDB)
   Genutzt von: app.js → oeffneWirkstoffPopup()
============================================================ */

// ── PERSONALISIERTE ALTERNATIVEN ──
// Wählt bis zu 5 kompatible Produkte – gefiltert und nach Profil priorisiert
function getPersonalisierteAlts(suppId, a) {
  var db = DB[suppId];
  if (!db || !db.alle) return [];

  var unvert      = a.unvertraeglichkeiten || ['A'];
  var ernaehrung  = a.ernaehrung || 'A';
  var vegan       = ernaehrung === 'D';
  var vegetarisch = ernaehrung === 'C' || ernaehrung === 'D';
  var hatLaktose  = unvert.indexOf('B') >= 0;
  var hatFisch    = unvert.indexOf('C') >= 0;
  var hatGluten   = unvert.indexOf('D') >= 0;
  var hatSoja     = unvert.indexOf('E') >= 0;
  var alter       = a.intro || 'C';
  var ziele       = a.ziele || [];
  var erfahrung   = a.erfahrung || 'einsteiger';
  var fett        = ziele.indexOf('B') >= 0;
  var mu          = ziele.indexOf('A') >= 0;
  var health      = ziele.indexOf('F') >= 0;

  // Strenger Allergen-Filter
  function istKompatibel(p) {
    var f = p.filter || [];
    if (hatLaktose && f.indexOf('laktose')   >= 0) return false;
    if (hatFisch   && f.indexOf('fisch')     >= 0) return false;
    if (hatGluten  && f.indexOf('gluten')    >= 0) return false;
    if (hatSoja    && f.indexOf('soja')      >= 0) return false;
    if (vegan      && f.indexOf('tierisch')  >= 0) return false;
    if (vegetarisch && f.indexOf('gelatine') >= 0) return false;
    if (vegetarisch && f.indexOf('fisch')    >= 0) return false;
    return true;
  }

  var alle = db.alle.filter(istKompatibel);
  if (alle.length === 0) return [];

  function findSeg(seg) {
    for (var i = 0; i < alle.length; i++) {
      if (alle[i].segment === seg) return alle[i];
    }
    return null;
  }

  // Slot 1: Bestes Produkt nach Profil
  var best = null;
  if (vegan)                                              best = findSeg('trend') || findSeg('premium_medical');
  else if ((erfahrung === 'profi' || erfahrung === 'fortgeschritten') && mu) best = findSeg('premium_medical') || findSeg('medical_grade');
  else if (fett)                                          best = findSeg('functional') || findSeg('premium_medical');
  else if (health && (alter === 'D' || alter === 'E'))    best = findSeg('medical_grade') || findSeg('premium_medical');
  else if (erfahrung === 'einsteiger')                    best = findSeg('preis_leistung');
  if (!best) best = findSeg('dach_premium') || alle[0];

  // Slot 2: Trend passend zur Altersklasse
  var trend = null;
  if (alter === 'A' || alter === 'B')      trend = findSeg('budget_cee') || findSeg('trend');
  else if (alter === 'C')                  trend = findSeg('trend') || findSeg('functional');
  else if (alter === 'D' || alter === 'E') trend = findSeg('medical_grade') || findSeg('tradition');
  if (!trend) trend = findSeg('trend') || alle[Math.min(3, alle.length - 1)];

  // Slot 3–5: DACH Premium / Preis-Leistung / Reviews
  var dach    = findSeg('dach_premium')   || alle[0];
  var preis   = findSeg('preis_leistung') || alle[1];
  var reviews = findSeg('reviews_global') || findSeg('eu_reviews') || alle[2];

  // Deduplizieren und auf max. 5 begrenzen
  var result = [], seen = [];
  function addIfNew(p) {
    if (!p) return;
    var key = p.marke + '|' + p.name;
    if (seen.indexOf(key) < 0) { seen.push(key); result.push(p); }
  }
  addIfNew(best);
  addIfNew(trend);
  addIfNew(dach);
  addIfNew(preis);
  addIfNew(reviews);
  for (var i = 0; i < alle.length && result.length < 5; i++) addIfNew(alle[i]);

  return result;
}
