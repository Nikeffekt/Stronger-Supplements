/* ============================================================
   ki-system-prompt.js – Wirkstoff-Index & System-Prompt
   Wird vor ki-chat.js geladen
   Greift auf globale Variablen zu: AW (Quiz), NP (Profil), meinStack
============================================================ */

// ── Komprimierter Wirkstoff-Index (für System-Prompt) ──
var KI_WIRKSTOFFE = {
  "magnesium":        { name: "Magnesium",         kat: "gesundheit",    prio: "essential",   tagline: "Muskelkontraktion, Nerven & Schlaf",          timing: "Abends", brands: ["ESN","Myprotein","Thorne","NOW Foods"] },
  "vitamin_d3_k2":    { name: "Vitamin D3+K2",     kat: "gesundheit",    prio: "essential",   tagline: "Knochen, Immunsystem & Testosteron",           timing: "Morgens zu Fett", brands: ["ESN","Myprotein","Thorne"] },
  "omega_3":          { name: "Omega-3",            kat: "gesundheit",    prio: "essential",   tagline: "Entzündung, Herz, Gehirn & Recovery",          timing: "Zu Mahlzeiten", brands: ["Norsan","Nordic Naturals","ESN"] },
  "zink":             { name: "Zink",               kat: "gesundheit",    prio: "essential",   tagline: "Testosteron, Immunsystem & Enzyme",             timing: "Morgens nüchtern", brands: ["ESN","Thorne","NOW Foods"] },
  "vitamin_c":        { name: "Vitamin C",          kat: "gesundheit",    prio: "empfohlen",   tagline: "Kollagensynthese & Antioxidans",                timing: "Morgens/mittags", brands: ["ESN","Myprotein","NOW Foods"] },
  "probiotika":       { name: "Probiotika",         kat: "verdauung",     prio: "empfohlen",   tagline: "Darmflora & Nährstoffaufnahme",                 timing: "Nüchtern morgens", brands: ["ESN","Thorne","NOW Foods"] },
  "verdauungsenzyme": { name: "Verdauungsenzyme",   kat: "verdauung",     prio: "empfohlen",   tagline: "Proteinverwertung & Blähungen",                 timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","Thorne"] },
  "whey_protein":     { name: "Whey Protein",       kat: "muskelaufbau",  prio: "essential",   tagline: "Muskelaufbau, Sättigung & Recovery",            timing: "Post-Workout", brands: ["ESN","Myprotein","Optimum Nutrition"] },
  "iso_clear":        { name: "Iso Clear",          kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Whey Isolat, fettarm & leichte Textur",         timing: "Post-Workout", brands: ["ESN","Myprotein","BioTechUSA"] },
  "kreatin":          { name: "Kreatin Monohydrat", kat: "muskelaufbau",  prio: "essential",   tagline: "Kraft, Schnellkraft & Muskelmasse",             timing: "Täglich konsistent", brands: ["ESN","Myprotein","Optimum Nutrition"] },
  "eaa_bcaa":         { name: "EAA & BCAA",         kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Muskelproteinsynthese & Anti-Katabolismus",     timing: "Intra-Workout", brands: ["ESN","Myprotein","BioTechUSA"] },
  "pre_workout":      { name: "Pre-Workout",        kat: "muskelaufbau",  prio: "optional",    tagline: "Energie, Fokus & Pump",                         timing: "20-30 Min. vor Training", brands: ["ESN","Myprotein","BioTechUSA"] },
  "l_carnitin":       { name: "L-Carnitin",         kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Fettverbrennung & Energie",                     timing: "Vor Training/Mahlzeit", brands: ["ESN","Myprotein","NOW Foods"] },
  "beta_alanin":      { name: "Beta-Alanin",        kat: "muskelaufbau",  prio: "empfohlen",   tagline: "Ausdauer & Muskelpuffer",                       timing: "Pre-Workout", brands: ["ESN","Myprotein","NOW Foods"] },
  "ashwagandha":      { name: "Ashwagandha",        kat: "regeneration",  prio: "empfohlen",   tagline: "Cortisol senken, Schlaf & Stressresistenz",     timing: "Abends", brands: ["ESN","Myprotein","Thorne"] },
  "melatonin":        { name: "Melatonin",          kat: "regeneration",  prio: "optional",    tagline: "Einschlafhilfe & Schlafqualität",               timing: "30 Min. vor Schlaf", brands: ["ESN","Myprotein","NOW Foods"] },
  "zma":              { name: "ZMA",                kat: "regeneration",  prio: "optional",    tagline: "Zink + Magnesium + B6 für Schlaf & Testosteron", timing: "Abends nüchtern", brands: ["ESN","Myprotein","NOW Foods"] },
  "kollagen":         { name: "Kollagen Peptide",   kat: "gelenke",       prio: "empfohlen",   tagline: "Gelenke, Haut & Bindegewebe",                   timing: "Mit Vitamin C", brands: ["Norsan","ESN","Myprotein"] },
  "glucosamin_chond": { name: "Glucosamin+Chondroitin", kat: "gelenke",  prio: "optional",    tagline: "Knorpelschutz & Gelenkschmierung",              timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","Thorne"] },
  "curcumin":         { name: "Curcumin",           kat: "gelenke",       prio: "empfohlen",   tagline: "Entzündungshemmend & Antioxidans",              timing: "Zu Fett", brands: ["ESN","Thorne","NOW Foods"] },
  "l_glutamin":       { name: "L-Glutamin",         kat: "muskelaufbau",  prio: "optional",    tagline: "Darmgesundheit & Muskelregeneration",           timing: "Post-Workout/Abends", brands: ["ESN","Myprotein","NOW Foods"] },
  "hmb":              { name: "HMB",                kat: "muskelaufbau",  prio: "optional",    tagline: "Muskelschutz beim Abnehmen",                    timing: "Mit Mahlzeiten", brands: ["ESN","Myprotein","Thorne"] },
  "msm":              { name: "MSM",                kat: "gelenke",       prio: "optional",    tagline: "Schwefel für Gelenke & Haut",                   timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","NOW Foods"] },
  "grüner_tee_egcg":  { name: "Grüner Tee (EGCG)", kat: "fettabbau",     prio: "optional",    tagline: "Fettverbrennung & Antioxidans",                 timing: "Vor Training/morgens", brands: ["ESN","Myprotein","NOW Foods"] },
  "cla":              { name: "CLA",                kat: "fettabbau",     prio: "optional",    tagline: "Körperfettreduktion & Muskeldefinition",        timing: "Zu Mahlzeiten", brands: ["ESN","Myprotein","NOW Foods"] }
};

// ── System-Prompt aufbauen ──
// Wird bei jeder Anfrage neu gebaut damit User-Kontext aktuell ist
function kiSystemPrompt() {
  // Wirkstoff-Index als kompakter Text
  var wIndex = Object.entries(KI_WIRKSTOFFE).map(function(entry) {
    var w = entry[1];
    return w.name + ' [' + w.kat + ', ' + w.prio + ']: ' + w.tagline + ' · Timing: ' + w.timing + ' · Marken: ' + w.brands.join(', ');
  }).join('\n');

  // Quiz-Antworten des Users
  var quizInfo = 'Noch kein Quiz ausgefüllt.';
  if (AW && Object.keys(AW).length > 0) {
    var zeilen = [];
    if (AW.intro)       zeilen.push('Jahrgang: ' + AW.intro);
    if (AW.geschlecht)  zeilen.push('Geschlecht: ' + ({ A:'Männlich', B:'Weiblich', C:'k.A.' }[AW.geschlecht] || AW.geschlecht));
    if (AW.groesse)     zeilen.push('Größe: ' + AW.groesse + ' cm');
    if (AW.gewicht)     zeilen.push('Gewicht: ' + AW.gewicht + ' kg');
    if (AW.ziel)        zeilen.push('Ziel: ' + AW.ziel);
    if (AW.training)    zeilen.push('Training: ' + AW.training + 'x/Woche');
    if (AW.ernaehrung)  zeilen.push('Ernährung: ' + AW.ernaehrung);
    if (AW.schlaf)      zeilen.push('Schlaf: ' + AW.schlaf);
    if (AW.stress)      zeilen.push('Stress: ' + AW.stress);
    if (AW.allergien)   zeilen.push('Allergien: ' + AW.allergien);
    if (AW.medis)       zeilen.push('Medikamente: ' + AW.medis);
    quizInfo = zeilen.join('\n');
  }

  // Aktueller Stack des Users
  var stackInfo = 'Kein Stack ausgewählt.';
  if (meinStack && Object.keys(meinStack).length > 0) {
    stackInfo = Object.values(meinStack).map(function(s) {
      return '- ' + s.prod.name + ' (' + (s.preis || '?') + ' €/Monat)';
    }).join('\n');
  }

  // User-Name
  var userName = (NP && NP.name && NP.name !== 'Nutzer') ? NP.name : null;

  return [
    'Du bist der KI-Supplement-Assistent von SupplAI – einer App die Supplement-Stacks personalisiert empfiehlt.',
    'Du bist präzise, wissenschaftlich fundiert und sprichst den User direkt und freundlich an (Du-Form).',
    'Antworte kompakt (max. 3-4 Sätze) außer der User fragt nach einer detaillierten Erklärung.',
    'Verwende Emojis sparsam aber sinnvoll.',
    'Empfehle immer konkrete Produkte aus unserem Sortiment wenn möglich.',
    'Weise auf Wechselwirkungen, Überdosierungsrisiken und Timing-Regeln hin.',
    '',
    '── VERFÜGBARE WIRKSTOFFE & PRODUKTE ──',
    wIndex,
    '',
    '── USER-PROFIL (aus Quiz) ──',
    quizInfo,
    '',
    '── AKTUELLER STACK DES USERS ──',
    stackInfo,
    '',
    userName ? ('── USER-NAME: ' + userName) : '',
    '',
    'Halte dich an diese Daten. Erfinde keine Produkte oder Wirkstoffe die nicht im Index stehen.',
    'Du bist kein Arzt – weise bei medizinischen Fragen auf einen Arzt hin.'
  ].join('\n');
}
