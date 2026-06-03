/* ============================================================
   scripts/ui/guide.js
   Supplement Guide – Daten, Listen-Aufbau und Detail-Overlay

   Abhängigkeiten:
   - scripts/navigation.js  (zeige)
============================================================ */

// ── GUIDE DATEN ──
var GUIDE_DATEN = {
  "magnesium":         { name: "Magnesium",              emoji: "🟢", tagline: "Muskelkontraktion, Nerven & Schlaf",              kategorie: "gesundheit",   prioritaet: "essential", beschreibung: "Magnesium ist an über 300 Enzymreaktionen beteiligt – darunter Muskelkontraktion, Nervenfunktion und Energieproduktion. Sportler verlieren durch Schweiß erhöhte Mengen. Ein Mangel äußert sich durch Krämpfe, Schlafprobleme und Erschöpfung.\n\n💊 Einnahme:\n300–400 mg Magnesium Bisglycinat täglich, abends mit einem großen Glas Wasser direkt vor dem Schlafen. Nicht zusammen mit Kalzium einnehmen – beide Mineralien konkurrieren um dieselben Transportwege.\n\n📌 Beispiel:\nWenn du regelmäßig Wadenkrämpfe bekommst, schlecht schläfst oder dich trotz ausreichend Schlaf erschöpft fühlst – besonders nach intensivem Sport – könnte ein Magnesiummangel die Ursache sein." },
  "vitamin_d3_k2":     { name: "Vitamin D3 + K2",        emoji: "☀️", tagline: "Knochen, Immunsystem & Testosteron",              kategorie: "gesundheit",   prioritaet: "essential", beschreibung: "Vitamin D3 ist kein Vitamin sondern ein Hormon-Vorläufer. Reguliert Kalziumaufnahme, Immunsystem und Testosteronproduktion. K2 (MK-7) stellt sicher, dass Kalzium in die Knochen geht und nicht in die Gefäße eingelagert wird. In Mitteleuropa haben 70–80% der Bevölkerung im Winter einen Mangel.\n\n💊 Einnahme:\n2.000–5.000 IU D3 + 100–200 mcg K2 täglich, morgens zum Frühstück mit einer fetthaltigen Mahlzeit – zum Beispiel mit Eiern, Avocado oder einem Löffel Olivenöl. D3 ist fettlöslich und wird ohne Fett kaum aufgenommen.\n\n📌 Beispiel:\nWenn du viel Zeit in Innenräumen verbringst, dich oft müde und antriebslos fühlst oder häufig krank wirst – vor allem im Winter – lohnt sich ein Bluttest." },
  "omega_3":           { name: "Omega-3",                emoji: "🐟", tagline: "Entzündung, Herz, Gehirn & Recovery",             kategorie: "gesundheit",   prioritaet: "essential", beschreibung: "EPA und DHA sind essenzielle Omega-3-Fettsäuren mit stark entzündungshemmender Wirkung. Unterstützen Herzgesundheit, Gehirnfunktion, Gelenke und beschleunigen die Regeneration nach dem Training.\n\n💊 Einnahme:\n2–3 g EPA+DHA täglich, zu einer Hauptmahlzeit mit Fett. Fischöl immer im Kühlschrank lagern. Auf nüchternen Magen kann Fischöl Übelkeit verursachen.\n\n📌 Beispiel:\nWenn deine Gelenke nach dem Training schmerzen, du dich langsam erholst oder häufig Entzündungszeichen hast – dann ist dein Omega-6/Omega-3-Verhältnis wahrscheinlich zu ungünstig." },
  "zink":              { name: "Zink",                   emoji: "🔷", tagline: "Testosteron, Immunsystem & Enzyme",               kategorie: "gesundheit",   prioritaet: "essential", beschreibung: "Zink ist essenziell für über 300 Enzymreaktionen, Testosteronproduktion, Immunabwehr und Wundheilung. Intensives Training erhöht den Zinkverlust über Schweiß erheblich.\n\n💊 Einnahme:\n15–25 mg täglich, abends auf nüchternen Magen. Nicht gleichzeitig mit Eisen, Kalzium oder Milchprodukten.\n\n📌 Beispiel:\nWenn du intensiv trainierst und dich dauerhaft müde und anfällig für Erkältungen fühlst." },
  "vitamin_c":         { name: "Vitamin C",              emoji: "🍊", tagline: "Kollagensynthese, Antioxidans & Immunsystem",      kategorie: "gesundheit",   prioritaet: "empfohlen", beschreibung: "Vitamin C ist ein wasserlösliches Antioxidans und Cofaktor der Kollagensynthese. Schützt Zellen vor freien Radikalen und verbessert die Eisenaufnahme.\n\n💊 Einnahme:\n500–1.000 mg täglich zu einer Mahlzeit. Bei Kollagen-Einnahme immer gleichzeitig nehmen.\n\n📌 Beispiel:\nWenn du Kollagen-Peptide nimmst aber keine Wirkung spürst – fehlt dir wahrscheinlich Vitamin C als Cofaktor." },
  "probiotika":        { name: "Probiotika",             emoji: "🦠", tagline: "Darmflora, Nährstoffaufnahme & Immunsystem",      kategorie: "verdauung",    prioritaet: "empfohlen", beschreibung: "Das Mikrobiom besteht aus ca. 100 Billionen Bakterien die Verdauung, Immunsystem und sogar Stimmung beeinflussen.\n\n💊 Einnahme:\nMindestens 10 Milliarden KBE täglich, morgens nüchtern mit lauwarmem Wasser.\n\n📌 Beispiel:\nWenn du nach einer Antibiotika-Kur Verdauungsprobleme hast oder dich oft aufgebläht fühlst." },
  "verdauungsenzyme":  { name: "Verdauungsenzyme",       emoji: "🧫", tagline: "Proteinverwertung, Blähungen & Laktoseintoleranz", kategorie: "verdauung",    prioritaet: "empfohlen", beschreibung: "Verdauungsenzyme verbessern die Aufspaltung von Proteinen, Fetten und Kohlenhydraten. Besonders hilfreich bei hoher Proteinzufuhr.\n\n💊 Einnahme:\nDirekt vor dem ersten Bissen oder zu Beginn der Mahlzeit.\n\n📌 Beispiel:\nWenn du täglich viel Protein isst und nach Shakes Blähungen bekommst." },
  "whey_protein":      { name: "Whey Protein",           emoji: "🥛", tagline: "Muskelaufbau, Sättigung & Recovery",              kategorie: "muskelaufbau", prioritaet: "essential", beschreibung: "Whey ist das am schnellsten absorbierbare Protein mit hohem Leucin-Gehalt (ca. 11%). Ideal für das Zeitfenster direkt nach dem Training.\n\n💊 Einnahme:\n25–40 g in 250–300 ml Wasser, innerhalb von 30–60 Minuten nach dem Training.\n\n📌 Beispiel:\nWenn du nach dem Training kein vollständiges Essen zu dir nehmen kannst." },
  "iso_clear":         { name: "Iso Clear",              emoji: "🧬", tagline: "Whey Isolat, fettarm & leichte Textur",           kategorie: "muskelaufbau", prioritaet: "empfohlen", beschreibung: "Iso Clear ist ein Whey-Isolat als klares, fruchtiges Getränk. Kaum Laktose und Fett, für Laktoseintolerante geeignet.\n\n💊 Einnahme:\n25 g in 400–500 ml kaltem Wasser, nicht mit heißem Wasser mischen.\n\n📌 Beispiel:\nWenn du klassische cremige Proteinshakes nicht verträgst." },
  "kreatin":           { name: "Kreatin",                emoji: "🔵", tagline: "Kraft, Schnellkraft & Muskelmasse",               kategorie: "muskelaufbau", prioritaet: "essential", beschreibung: "Kreatin Monohydrat ist das am besten erforschte Supplement der Welt mit über 1.000 Studien. Erhöht die Phosphokreatin-Speicher im Muskel.\n\n💊 Einnahme:\n3–5 g täglich nach dem Training. Kein Laden nötig. Ausreichend Wasser trinken.\n\n📌 Beispiel:\nWenn du seit Monaten keine Kraftfortschritte machst." },
  "eaa_bcaa":          { name: "EAA & BCAA",             emoji: "💪", tagline: "Muskelproteinsynthese & Anti-Katabolismus",       kategorie: "muskelaufbau", prioritaet: "empfohlen", beschreibung: "EAAs liefern alle 9 essentiellen Aminosäuren. Im nüchternen Training oder bei Diäten besonders wertvoll.\n\n💊 Einnahme:\n10–15 g in 500 ml Wasser, 15–20 Minuten vor dem nüchternen Training.\n\n📌 Beispiel:\nWenn du morgens nüchtern trainierst und Angst hast dabei Muskeln abzubauen." },
  "pre_workout":       { name: "Pre-Workout",            emoji: "⚡", tagline: "Energie, Fokus, Pump & Ausdauer",                 kategorie: "muskelaufbau", prioritaet: "optional",  beschreibung: "Pre-Workout Booster kombinieren Koffein, L-Citrullin und Beta-Alanin für maximale Performance.\n\n💊 Einnahme:\n20–30 Minuten vor dem Training, nicht nach 16 Uhr wegen Koffein. Max. 3–4x pro Woche.\n\n📌 Beispiel:\nWenn du nach der Arbeit erschöpft ins Gym gehst und die Trainingsqualität leidet." },
  "l_carnitin":        { name: "L-Carnitin",             emoji: "🔥", tagline: "Fettverbrennung, Energie & Recovery",             kategorie: "muskelaufbau", prioritaet: "empfohlen", beschreibung: "L-Carnitin transportiert Fettsäuren in die Mitochondrien zur Energiegewinnung. Besonders effektiv bei Ausdauersport.\n\n💊 Einnahme:\n1–2 g, 30–45 Minuten vor dem Training mit einem kohlenhydratreichen Snack.\n\n📌 Beispiel:\nWenn du Ausdauertraining machst und mehr Energie beim Cardio willst." },
  "beta_alanin":       { name: "Beta-Alanin",            emoji: "⚡", tagline: "Laktat-Puffer, Ausdauer & Muskelermüdung",        kategorie: "muskelaufbau", prioritaet: "empfohlen", beschreibung: "Beta-Alanin erhöht den Carnosin-Spiegel im Muskel und puffert Laktat. Das Kribbeln (Parästhesie) ist harmlos.\n\n💊 Einnahme:\n3,2 g täglich aufgeteilt in 2x 1,6 g. Muss täglich eingenommen werden – Carnosin-Aufbau dauert 4–6 Wochen.\n\n📌 Beispiel:\nWenn du bei intensiven Intervallen früh abbrichst weil der Muskel brennt." },
  "l_glutamin":        { name: "L-Glutamin",             emoji: "🟡", tagline: "Darmgesundheit, Immunsystem & Recovery",          kategorie: "muskelaufbau", prioritaet: "optional",  beschreibung: "L-Glutamin ist die häufigste Aminosäure im Körper. Schützt die Darmschleimhaut und fördert die Immunfunktion.\n\n💊 Einnahme:\n5–10 g täglich nach dem Training oder abends.\n\n📌 Beispiel:\nWenn du täglich trainierst und im Winter häufig krank wirst." },
  "hmb":               { name: "HMB",                   emoji: "🛡️", tagline: "Anti-Katabolismus, Muskelerhalt & Kraft",         kategorie: "muskelaufbau", prioritaet: "optional",  beschreibung: "HMB hemmt den Muskelabbau und beschleunigt die Reparatur von Muskelfasern. Besonders wirksam in der Diätphase und für ältere Sportler.\n\n💊 Einnahme:\n3 g täglich aufgeteilt in 3x 1 g zu den Hauptmahlzeiten. Wirkung tritt nach 2–4 Wochen ein.\n\n📌 Beispiel:\nWenn du gerade anfängst, über 40 bist oder in einer Diät Muskeln schützen willst." },
  "ashwagandha":       { name: "Ashwagandha",            emoji: "🌿", tagline: "Stressreduktion, Cortisol & Schlafqualität",      kategorie: "regeneration", prioritaet: "empfohlen", beschreibung: "Ashwagandha KSM-66 ist der am besten erforschte Extrakt. Senkt Cortisol, verbessert Schlafqualität und kann Testosteron leicht erhöhen.\n\n💊 Einnahme:\n300–600 mg KSM-66 abends zum Abendessen. Wirkung tritt nach 4–8 Wochen ein.\n\n📌 Beispiel:\nWenn du unter chronischem Stress leidest und abends nicht abschalten kannst." },
  "melatonin":         { name: "Melatonin",              emoji: "🌙", tagline: "Einschlafen, Schlafrhythmus & Regeneration",      kategorie: "regeneration", prioritaet: "empfohlen", beschreibung: "Melatonin ist das körpereigene Schlafhormon. Niedrige Dosen sind effektiver als hohe.\n\n💊 Einnahme:\n0,5–1 mg, 30–60 Minuten vor dem Schlafen. Nicht dauerhaft täglich verwenden.\n\n📌 Beispiel:\nWenn du nach einer Zeitzonenreise nicht in den Schlaf findest." },
  "zma":               { name: "ZMA",                   emoji: "💎", tagline: "Schlafqualität, Testosteron & Recovery",           kategorie: "regeneration", prioritaet: "empfohlen", beschreibung: "ZMA kombiniert Zink, Magnesium und Vitamin B6 für optimale Schlafqualität und hormonelle Balance.\n\n💊 Einnahme:\n1 Portion auf nüchternen Magen 30–60 Min. vor dem Schlafen. Nicht mit Milch einnehmen.\n\n📌 Beispiel:\nWenn du intensiv trainierst und morgens nicht erholt aufwachst." },
  "kollagen":          { name: "Kollagen",               emoji: "🦴", tagline: "Gelenke, Haut, Sehnen & Knorpel",                kategorie: "gelenke",      prioritaet: "empfohlen", beschreibung: "Kollagen macht 30% aller Körperproteine aus. Hydrolysiertes Kollagen wird am besten aufgenommen.\n\n💊 Einnahme:\n10–15 g vor dem Training in warmem Wasser, immer mit 200–500 mg Vitamin C.\n\n📌 Beispiel:\nWenn du Sehnenschmerzen oder Gelenkprobleme hast und kein Vitamin C dazu nimmst." },
  "curcumin":          { name: "Curcumin",               emoji: "🌱", tagline: "Entzündungshemmung & Gelenk-Recovery",            kategorie: "gelenke",      prioritaet: "empfohlen", beschreibung: "Curcumin hemmt Entzündungsprozesse. BCM-95 oder Phytosom-Formen haben bis zu 29-fach bessere Absorption.\n\n💊 Einnahme:\n500–1.000 mg zu einer fetthaltigen Mahlzeit. Ohne Fett kaum wirksam.\n\n📌 Beispiel:\nWenn du nach schwerem Training starke Muskelkater und Gelenkschmerzen hast." },
  "glucosamin_chond":  { name: "Glucosamin + Chondroitin", emoji: "🦵", tagline: "Knorpelaufbau, Gelenkschutz & Schmerz",        kategorie: "gelenke",      prioritaet: "empfohlen", beschreibung: "Glucosamin und Chondroitin sind Bausteine des Gelenkknorpels.\n\n💊 Einnahme:\n1.500 mg Glucosamin + 1.200 mg Chondroitin täglich zum Frühstück. Mindestens 3 Monate durchhalten.\n\n📌 Beispiel:\nWenn du beim Laufen oder Kniebeugen Knieschmerzen hast und über 35 bist." },
  "msm":               { name: "MSM",                   emoji: "🌊", tagline: "Entzündungshemmung, Gelenke & Schwefel",          kategorie: "gelenke",      prioritaet: "optional",  beschreibung: "MSM liefert organischen Schwefel für Kollagensynthese und Gelenke.\n\n💊 Einnahme:\n1.000–3.000 mg täglich aufgeteilt auf 2 Mahlzeiten. Langsam einschleichen.\n\n📌 Beispiel:\nWenn du bereits Kollagen und Glucosamin nimmst aber noch keine optimale Wirkung spürst." },
  "grüner_tee_egcg":   { name: "Grüner Tee (EGCG)",     emoji: "🍵", tagline: "Fettverbrennung, Thermogenese & Antioxidans",     kategorie: "gewicht",      prioritaet: "empfohlen", beschreibung: "EGCG ist das wirksamste Polyphenol aus grünem Tee. Erhöht die Thermogenese und aktiviert den Fettstoffwechsel.\n\n💊 Einnahme:\n400–800 mg morgens nüchtern oder vor dem Training. Nicht mit Milch.\n\n📌 Beispiel:\nWenn du in einer Diätphase bist und einen natürlichen Booster ohne starkes Koffein suchst." },
  "cla":               { name: "CLA",                   emoji: "🔶", tagline: "Körperfettanteil, Muskelmasse & Body-Recomp",     kategorie: "gewicht",      prioritaet: "optional",  beschreibung: "CLA reduziert Körperfett und unterstützt Muskelerhalt. Wirkung ist moderat aber kontinuierlich.\n\n💊 Einnahme:\n3–6 g täglich aufgeteilt auf 3 Mahlzeiten. Mindestens 12 Wochen durchhalten.\n\n📌 Beispiel:\nWenn du auf Diät bist und Muskelmasse erhalten willst." },
};


// ── GUIDE ÖFFNEN ──
function guideOeffnen() {
  var menuOv = document.getElementById('hdr-menu-overlay');
  if (menuOv) menuOv.classList.remove('offen');
  zeige('s-guide');
}

// ── GUIDE ZURÜCK (zur Startseite) ──
function guideZurueck() {
  zeige('s-start');
}

// ── DETAIL ÖFFNEN ──
function guideOeffneDetail(id) {
  var w = GUIDE_DATEN[id];
  if (!w) return;

  document.getElementById('guide-detail-emoji').textContent        = w.emoji;
  document.getElementById('guide-detail-name').textContent         = w.name;
  document.getElementById('guide-detail-tagline').textContent      = w.tagline;
  document.getElementById('guide-detail-beschreibung').textContent = w.beschreibung;

  var prioText  = { essential: 'Essentiell', empfohlen: 'Empfohlen', optional: 'Optional' };
  var prioFarbe = { essential: '#FF6B00',    empfohlen: '#10B981',    optional: '#6B7280' };

  var prioEl = document.getElementById('guide-detail-prio');
  prioEl.textContent        = prioText[w.prioritaet]  || w.prioritaet;
  prioEl.style.color        = prioFarbe[w.prioritaet] || '#6B7280';
  prioEl.style.background   = w.prioritaet === 'essential' ? 'rgba(255,107,0,0.15)'   :
                               w.prioritaet === 'empfohlen' ? 'rgba(16,185,129,0.15)' :
                               'rgba(107,114,128,0.15)';
  prioEl.style.borderColor  = prioFarbe[w.prioritaet] || '#6B7280';

  document.getElementById('guide-detail').classList.add('sichtbar');
}

// ── DETAIL SCHLIESSEN ──
function guideDetailZurueck() {
  document.getElementById('guide-detail').classList.remove('sichtbar');
}
