/*
================================================================================
  WIRKSTOFFE-WISSEN.JSON – SCHEMA-DOKUMENTATION
================================================================================

  Diese Datei dokumentiert das Schema unserer Wissensbasis.
  Sie ist die "Source of Truth" für alle wissenschaftlichen Daten zu Wirkstoffen.

  WICHTIG:
  - Stronger ist KEIN medizinisches Beratungssystem
  - Alle Daten basieren auf publizierten Reviews, Meta-Analysen und Position Stands
  - Bei jeder Empfehlung muss die Quelle nachvollziehbar sein
  - Effekt-Stärken sind realistisch und vorsichtig bewertet

================================================================================
  FELDER
================================================================================

  id                  → eindeutige Wirkstoff-ID (lowercase, mit Unterstrich)
  name                → Anzeigename (z.B. "Kreatin Monohydrat")
  kategorie           → "performance" | "gesundheit" | "regeneration" | "wellbeing"
  ikon                → Emoji für UI

  evidenz             → wissenschaftliche Bewertung
    level             → "A" | "B" | "C" | "D"
                        A = mehrere unabhängige Meta-Analysen + Position Stand
                        B = mind. eine Meta-Analyse, konsistente RCTs
                        C = einzelne RCTs, gemischte Ergebnisse
                        D = vorwiegend Beobachtungsstudien / Tierversuche
    score             → 0–100 (interner Score für Berechnung)
                        90–100: Goldstandard-Evidenz (Kreatin, Protein)
                        70–89:  Solide Evidenz (Vit D3, Omega-3, Mg)
                        50–69:  Moderate Evidenz (Ashwagandha, Beta-Alanin)
                        30–49:  Schwache Evidenz (HMB, Curcumin)
                        0–29:   Spekulativ
    review_typ        → "meta-analyse" | "systematic-review" | "rct" | "position-stand"
    studien_anzahl    → Anzahl seriöser RCTs
    konsens           → führende Quelle/Organisation
    effekt_groesse    → Cohen's d ODER prozentuale Verbesserung
                        { wert: 0.35, einheit: "cohen_d", kontext: "Kraft" }

  indikationen        → für welche Ziele/Profile besonders relevant
                        Liste von { ziel, staerke (0–1), evidenz_kommentar }

  kontraindikationen  → harte Ausschlusskriterien (Safety First!)
                        Liste von { art, wert, schwere, hinweis }

  dosierung           → empfohlene Dosis mit Quelle (NUR hier pflegen!
                        NICHT zusätzlich unter fazit.dosierung – das Frontend
                        liest w.dosierung. Doppelte Haltung vermeiden.)
    standard          → "3-5 g täglich"
    bereich           → { min: 3, max: 5, einheit: "g" } (für Berechnungen)
    timing            → "konsistent täglich, Tageszeit egal"
    quelle            → kurzer Quellenverweis

  fazit.mythen        → NEU (ab v1.2): Liste ehrlicher Einordnungen –
                        was wird bei diesem Wirkstoff überschätzt oder als
                        Marketingmythos verbreitet? Format: Array von Strings.
                        Wird in "Auf einen Blick" gerendert.
                        Beispiel: ["„Loading-Phase ist Pflicht" – falsch, ..."]

  population_spezifisch → besondere Empfehlungen für Subgruppen
                          (z.B. Frauen, Senioren, Vegetarier, Schwangere)

  warnhinweise        → wichtige Hinweise die der User wissen muss

  quellen             → Vollständige Quellenangaben
                        Liste von { titel, autoren, url, jahr, typ, doi }
                        ERLAUBTE typ-Werte (einheitlich mit Bindestrich!):
                        "meta-analyse" | "systematic-review" |
                        "position-stand" | "rct" | "review"
                        (NICHT mit Unterstrich – seit v1.2 normiert)

================================================================================
  EVIDENZ-LEVEL: BEDEUTUNG
================================================================================

  A = "Sehr stark belegt" – Mehrere unabhängige Meta-Analysen ZUSÄTZLICH
      zu einem Position Stand einer Fachgesellschaft. Effekt ist konsistent
      und klinisch relevant. Empfehlung steht außer Frage.
      Beispiele: Kreatin (Kraft), Protein (Muskelaufbau), Vitamin D (Mangel)

  B = "Gut belegt" – Mind. eine hochwertige Meta-Analyse ODER mehrere
      konsistente RCTs mit klarem Effekt. Empfehlung ist solide.
      Beispiele: Omega-3 (Entzündung), Magnesium (Schlaf bei Mangel)

  C = "Moderate Evidenz" – Einzelne RCTs, teilweise widersprüchliche
      Ergebnisse, kleinere Effektgrößen, methodische Schwächen.
      Vorsicht bei Vermarktung.
      Beispiele: Ashwagandha (Cortisol), Beta-Alanin (Ausdauer)

  D = "Schwache Evidenz" – Tierversuche, Beobachtungsstudien oder
      Pilot-RCTs. Kann interessant sein, aber nicht überbewerten.
      Beispiele: HMB (Muskelerhalt), Curcumin (Entzündung)

================================================================================
*/
