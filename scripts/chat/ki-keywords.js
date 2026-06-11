/* ============================================================
   ki-keywords.js – Erkennungs-Patterns fuer Smart Context Loading

   Aufgabe: Aus einer User-Nachricht (Text) erkennen, welche
   Wirkstoffe und Themen relevant sind. Wird von ki-context-loader.js
   genutzt um nur die noetigen JSON-Daten zu laden.

   Wird VOR ki-context-loader.js geladen.
   Abhaengigkeiten: keine
============================================================ */


/* ──────────────────────────────────────────────────────────
   WIRKSTOFF-ERKENNUNG
   Mapping: Wirkstoff-ID in wirkstoffe-wissen.json -> erkannte Begriffe
   Alle Begriffe in lowercase, Suche ignoriert Gross-/Kleinschreibung
────────────────────────────────────────────────────────── */
var KI_WIRKSTOFF_KEYWORDS = {
  "kreatin": [
    "kreatin", "creatine", "monohydrat", "phosphokreatin"
  ],
  "vitamin_d3": [
    "vitamin d", "vitamin-d", "vit d", "d3", "cholecalciferol",
    "sonnenvitamin"
  ],
  "vitamin_k2": [
    "vitamin k", "vit k", "k2", "mk-7", "menachinon"
  ],
  "omega3": [
    "omega", "omega-3", "omega3", "fischoel", "fischöl",
    "epa", "dha", "fettsaeuren", "fettsäuren"
  ],
  "omega3_vegan": [
    "algenoel", "algenöl", "veganes omega", "pflanzliches omega"
  ],
  "magnesium": [
    "magnesium", "bisglycinat", "magnesiumcitrat", "magnesiummangel"
  ],
  "whey_protein": [
    "whey", "molkenprotein", "molke", "wpc", "konzentrat"
  ],
  "iso_clear": [
    "iso clear", "isoclear", "isolat", "whey isolat", "wpi"
  ],
  "pflanzenprotein": [
    "pflanzenprotein", "veganes protein", "soja protein", "sojaprotein",
    "erbsenprotein", "reisprotein", "hanfprotein", "pflanzliches protein"
  ],
  "zink": [
    "zink", "zinc"
  ],
  "ashwagandha": [
    "ashwagandha", "ksm-66", "withania"
  ],
  "beta_alanin": [
    "beta alanin", "beta-alanin", "betaalanin", "carnosin"
  ],
  "vitamin_b12": [
    "b12", "b-12", "cobalamin", "methylcobalamin", "vitamin b12"
  ],
  "elektrolyte": [
    "elektrolyt", "elektrolyte", "isotonisch", "natrium", "kalium",
    "sportgetraenk", "sportgetränk"
  ],
  "vitamin_c": [
    "vitamin c", "vit c", "ascorbinsaeure", "ascorbinsäure"
  ],
  "eaas": [
    "eaa", "eaas", "essentielle aminosaeure", "essentielle aminosäure",
    "bcaa", "bcaas"
  ],
  "kollagen": [
    "kollagen", "collagen", "kollagen peptide", "bindegewebe"
  ],
  "curcumin": [
    "curcumin", "kurkuma", "curcuma", "turmeric"
  ],
  "l_carnitin": [
    "carnitin", "l-carnitin", "fettverbrennung", "fettstoffwechsel"
  ],
  "koffein": [
    "koffein", "caffein", "coffein"
  ],
  "pre_workout": [
    "pre workout", "pre-workout", "preworkout", "booster",
    "trainings booster"
  ],
  "eisen": [
    "eisen", "ferritin", "haemoglobin", "hämoglobin", "anaemie",
    "anämie"
  ],
  "multivitamin": [
    "multivitamin", "multi vitamin", "vitamin komplex"
  ],
  "melatonin": [
    "melatonin", "schlafhormon"
  ],
  "probiotika": [
    "probiotika", "probiotikum", "darmflora", "darmgesundheit",
    "lactobacillus", "bifidobacterium"
  ],
  "zma": [
    "zma"
  ],
  "hmb": [
    "hmb", "beta-hydroxy"
  ]
};


/* ──────────────────────────────────────────────────────────
   THEMEN-ERKENNUNG
   Welche grossen Themen werden angesprochen?
   Bestimmt welche Zusatz-Infos der Bot bekommt
────────────────────────────────────────────────────────── */
var KI_THEMA_KEYWORDS = {
  "muskelaufbau": [
    "muskelaufbau", "muskeln aufbauen", "muskelmasse", "bulken",
    "masseaufbau", "hypertrophie"
  ],
  "fettabbau": [
    "fettabbau", "abnehmen", "diaet", "diät", "cut", "cutten",
    "fett verbrennen", "definition"
  ],
  "kraft": [
    "kraft", "staerker", "stärker", "1rm", "maximalkraft",
    "kraftsteigerung"
  ],
  "ausdauer": [
    "ausdauer", "endurance", "marathon", "laufen", "joggen",
    "cardio", "radfahren"
  ],
  "regeneration": [
    "regeneration", "recovery", "erholung", "muskelkater",
    "regenerieren"
  ],
  "stress": [
    "stress", "cortisol", "burnout", "ueberlastung", "überlastung",
    "angst", "anspannung"
  ],
  "schlaf": [
    "schlaf", "einschlaf", "durchschlaf", "schlafqualitaet",
    "schlafqualität", "schlaflosigkeit", "insomnie", "muede",
    "müde"
  ],
  "energie": [
    "energie", "muede", "müde", "muedigkeit", "müdigkeit",
    "antrieb", "kraftlos"
  ],
  "gesundheit": [
    "gesundheit", "immunsystem", "krank", "erkaeltung", "erkältung",
    "vorbeugung", "praevention", "prävention"
  ],
  "gelenke": [
    "gelenk", "gelenke", "arthrose", "knie", "huefte", "hüfte",
    "schulter", "knorpel", "gelenkschmerzen"
  ]
};


/* ──────────────────────────────────────────────────────────
   SICHERHEITS-TRIGGER
   Diese Begriffe loesen automatisch den Sicherheits-Kontext aus
   (Kontraindikationen, Wechselwirkungen, Quellen-Pflicht)
────────────────────────────────────────────────────────── */
var KI_SICHERHEIT_KEYWORDS = [
  // Medikamente
  "medikament", "tablette", "rezept", "verschreibung",
  "blutverduenner", "blutverdünner", "marcumar", "warfarin",
  "aspirin", "ass", "eliquis", "xarelto",
  "schilddruese", "schilddrüse", "hashimoto", "l-thyroxin",
  "levothyroxin", "euthyrox",
  "antidepressiva", "ssri", "citalopram", "sertralin", "fluoxetin",
  "venlafaxin", "mirtazapin",
  "insulin", "metformin", "diabetes", "blutzucker",
  "blutdruck", "hypertonie", "betablocker", "ramipril",
  "schwangerschaft", "schwanger", "stillzeit", "stillen",

  // Erkrankungen
  "niere", "nierenerkrankung", "niereninsuffizienz", "dialyse",
  "leber", "lebererkrankung", "hepatitis", "leberwerte",
  "herz", "herzerkrankung", "herzinfarkt", "arrhythmie",
  "krebs", "tumor", "chemotherapie",
  "essstoerung", "essstörung", "magersucht", "anorexie", "bulimie",

  // Notfall-Signale
  "atemnot", "brustschmerz", "ohnmacht", "bewusstlos",
  "allergische reaktion", "anaphylaxie", "ausschlag",

  // Allgemeine Warnungen
  "nebenwirkung", "wechselwirkung", "ueberdosis", "überdosis",
  "kontraindikation", "vertraegt sich", "verträgt sich"
];


/* ──────────────────────────────────────────────────────────
   MYTHEN-TRIGGER
   Wenn User Mythen-typische Formulierungen nutzt,
   wird die Mythen-Aufklaerungs-Logik aktiviert
────────────────────────────────────────────────────────── */
var KI_MYTHEN_KEYWORDS = [
  "stimmt es", "ist es wahr", "wirklich", "man sagt",
  "ich hab gehoert", "ich habe gehört", "angeblich",
  "schaedlich", "schädlich", "schadet", "gefaehrlich",
  "gefährlich", "mythen", "mythos", "geruecht", "gerücht",
  "macht das", "stimmt das"
];


/* ──────────────────────────────────────────────────────────
   EMPFEHLUNG-TRIGGER
   User will eine Empfehlung -> Quiz-Verweis anzeigen
   (Bot ohne Engine-Integration kann keine eigenen geben)
────────────────────────────────────────────────────────── */
var KI_EMPFEHLUNG_KEYWORDS = [
  "empfiehl", "empfehlung", "was soll ich nehmen",
  "was brauche ich", "was hilft mir", "rate mir",
  "vorschlag", "was passt zu mir", "fuer mich", "für mich"
];


/* ──────────────────────────────────────────────────────────
   ANALYSE-FUNKTION
   Bekommt einen Text, gibt zurueck welche Wirkstoffe/Themen
   erkannt wurden. Wird von ki-context-loader.js genutzt.
────────────────────────────────────────────────────────── */
function kiAnalysiereNachricht(text) {
  if (!text) {
    return { wirkstoffe: [], themen: [], sicherheit: false,
             mythen: false, empfehlung: false };
  }

  var t = text.toLowerCase();
  var ergebnis = {
    wirkstoffe: [],
    themen:     [],
    sicherheit: false,
    mythen:     false,
    empfehlung: false
  };

  // Wirkstoffe finden
  Object.keys(KI_WIRKSTOFF_KEYWORDS).forEach(function (wid) {
    var keys = KI_WIRKSTOFF_KEYWORDS[wid];
    for (var i = 0; i < keys.length; i++) {
      if (t.indexOf(keys[i]) >= 0) {
        ergebnis.wirkstoffe.push(wid);
        return;  // Wirkstoff einmal gefunden reicht
      }
    }
  });

  // Themen finden
  Object.keys(KI_THEMA_KEYWORDS).forEach(function (tid) {
    var keys = KI_THEMA_KEYWORDS[tid];
    for (var i = 0; i < keys.length; i++) {
      if (t.indexOf(keys[i]) >= 0) {
        ergebnis.themen.push(tid);
        return;
      }
    }
  });

  // Sicherheits-Trigger
  for (var i = 0; i < KI_SICHERHEIT_KEYWORDS.length; i++) {
    if (t.indexOf(KI_SICHERHEIT_KEYWORDS[i]) >= 0) {
      ergebnis.sicherheit = true;
      break;
    }
  }

  // Mythen-Trigger
  for (var j = 0; j < KI_MYTHEN_KEYWORDS.length; j++) {
    if (t.indexOf(KI_MYTHEN_KEYWORDS[j]) >= 0) {
      ergebnis.mythen = true;
      break;
    }
  }

  // Empfehlungs-Trigger
  for (var k = 0; k < KI_EMPFEHLUNG_KEYWORDS.length; k++) {
    if (t.indexOf(KI_EMPFEHLUNG_KEYWORDS[k]) >= 0) {
      ergebnis.empfehlung = true;
      break;
    }
  }

  return ergebnis;
}
