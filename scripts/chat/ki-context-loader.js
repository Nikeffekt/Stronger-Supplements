/* ============================================================
   ki-context-loader.js – Smart Context Loading

   Aufgabe: Aus der User-Nachricht erkennen, welche Wirkstoffe
   und Themen relevant sind, und die passenden Daten aus den
   globalen JSONs (WIRKSTOFFE_WISSEN, DB) als Zusatz-Kontext
   fuer Claude aufbauen.

   Wird VOR ki-chat.js geladen, NACH ki-keywords.js.

   Abhaengigkeiten:
   - ki-keywords.js     (kiAnalysiereNachricht, KI_WIRKSTOFF_KEYWORDS)
   - state.js           (WIRKSTOFFE_WISSEN, DB)
============================================================ */


/* ──────────────────────────────────────────────────────────
   WIRKSTOFF-DETAIL FORMATIEREN
   Aus einem Eintrag aus WIRKSTOFFE_WISSEN einen kompakten
   aber inhaltsreichen Text-Block bauen
────────────────────────────────────────────────────────── */
function kiFormatiereWirkstoff(wid, w) {
  if (!w) return '';
  var z = [];

  z.push('### ' + (w.name || wid));

  // Kurzbeschreibung
  if (w.kurz_beschreibung) {
    z.push(w.kurz_beschreibung);
  }

  // Evidenz
  if (w.evidenz) {
    var e = w.evidenz;
    var ezeile = 'Evidenz: Level ' + (e.level || '?') +
                 ' (Score ' + (e.score || '?') + '/100)';
    if (e.konsens) ezeile += ', ' + e.konsens;
    if (e.studien_anzahl) ezeile += ', ' + e.studien_anzahl + ' Studien';
    z.push(ezeile);

    // Top-Effektgroesse
    if (e.effekt_groesse && e.effekt_groesse.length > 0) {
      var topEff = e.effekt_groesse[0];
      var effZeile = 'Hauptwirkung: ' + topEff.wert + ' ' + topEff.einheit;
      if (topEff.kontext) effZeile += ' (' + topEff.kontext + ')';
      if (topEff.quelle) effZeile += ' [Quelle: ' + topEff.quelle + ']';
      z.push(effZeile);
    }
  }

  // Fazit-Block
  if (w.fazit) {
    if (w.fazit.dosis) {
      z.push('Dosis: ' + w.fazit.dosis);
    }
    if (w.fazit.ideal_fuer) {
      z.push('Ideal fuer: ' + w.fazit.ideal_fuer);
    }
    if (w.fazit.vorsicht_bei) {
      z.push('Vorsicht bei: ' + w.fazit.vorsicht_bei);
    }
    if (w.fazit.top_effekte && w.fazit.top_effekte.length > 0) {
      z.push('Top-Effekte:');
      w.fazit.top_effekte.forEach(function (eff) {
        z.push('- ' + eff);
      });
    }
    if (w.fazit.mythen && w.fazit.mythen.length > 0) {
      z.push('Mythen (mit Aufklaerung):');
      w.fazit.mythen.forEach(function (m) {
        z.push('- ' + m);
      });
    }
  }

  // Kontraindikationen (sehr wichtig fuer Sicherheit!)
  if (w.kontraindikationen && w.kontraindikationen.length > 0) {
    z.push('Kontraindikationen:');
    w.kontraindikationen.forEach(function (k) {
      var kzeile = '- ' + (k.art || '?') + ': ' + (k.wert || '?');
      if (k.schwere) kzeile += ' [' + k.schwere + ']';
      if (k.hinweis) kzeile += ' – ' + k.hinweis;
      z.push(kzeile);
    });
  }

  // Wechselwirkungen
  if (w.wechselwirkungen && w.wechselwirkungen.length > 0) {
    z.push('Wechselwirkungen:');
    w.wechselwirkungen.forEach(function (ww) {
      var wstr = (typeof ww === 'string') ? ww :
                 ((ww.mit || '?') + ': ' + (ww.hinweis || ''));
      z.push('- ' + wstr);
    });
  }

  return z.join('\n');
}


/* ──────────────────────────────────────────────────────────
   PRODUKT-EMPFEHLUNG FORMATIEREN
   Aus DB die Produkte fuer einen Wirkstoff zeigen
────────────────────────────────────────────────────────── */
function kiFormatiereProdukte(wid) {
  if (!DB || !DB[wid] || !DB[wid].alle) return '';
  var produkte = DB[wid].alle.slice(0, 3);  // max 3 zeigen
  if (produkte.length === 0) return '';

  var z = ['Verfuegbare Produkte:'];
  produkte.forEach(function (p) {
    var pstr = '- ' + p.marke + ' ' + p.name + ' (' + p.preis + ' EUR';
    if (p.rating) pstr += ', ' + p.rating;
    pstr += ')';
    z.push(pstr);
  });
  return z.join('\n');
}


/* ──────────────────────────────────────────────────────────
   SICHERHEITS-KONTEXT
   Wird bei Erkennung sicherheitsrelevanter Begriffe
   zusaetzlich mitgeschickt
────────────────────────────────────────────────────────── */
function kiBaueSicherheitsKontext() {
  return [
    '── SICHERHEITS-PROTOKOLL AKTIV ──',
    'Der User hat ein sicherheitsrelevantes Thema angesprochen.',
    'Verhaltensregeln fuer diese Antwort:',
    '1. Quellen explizit nennen (Studie/Position-Stand) wenn moeglich.',
    '2. Bei harten Kontraindikationen KLAR und EHRLICH abraten – nicht relativieren.',
    '3. Bei medikamentoesen Wechselwirkungen: empfehlen mit dem Arzt zu sprechen.',
    '4. Bei Notfallsymptomen (Atemnot, Brustschmerz, etc.):',
    '   sofort auf aerztliche Akutversorgung verweisen.',
    '5. Schwangerschaft, Stillzeit, Niere, Leber: extrem konservativ beraten.',
    '6. KEINE Diagnose stellen, nur Wissen vermitteln.',
    '',
    'Die folgenden Wirkstoff-Daten enthalten die noetigen Sicherheitsinfos:'
  ].join('\n');
}


/* ──────────────────────────────────────────────────────────
   EMPFEHLUNGS-VERWEIS
   Bot kann (noch) keine eigenen Empfehlungen geben.
   Bei expliziter Empfehlungsfrage: aufs Quiz verweisen
────────────────────────────────────────────────────────── */
function kiBaueEmpfehlungsKontext(hatQuizGemacht) {
  if (hatQuizGemacht) {
    return [
      '── EMPFEHLUNGS-MODUS: USER HAT QUIZ ──',
      'User hat das Quiz bereits ausgefuellt. Beziehe dich auf',
      'seinen vorhandenen Stack und sein Profil. Erklaere warum',
      'bestimmte Wirkstoffe drin sind. Falls User nach NEUEN',
      'Empfehlungen fragt, die nicht im Stack sind: erklaere die',
      'Engine-Logik (Score-System), aber verweise darauf dass',
      'eine neue Quiz-Durchfuehrung die sauberste Loesung ist',
      'wenn sich etwas geaendert hat.'
    ].join('\n');
  } else {
    return [
      '── EMPFEHLUNGS-MODUS: KEIN QUIZ ──',
      'User hat noch KEIN Quiz ausgefuellt und fragt nach',
      'Empfehlungen. Wichtig:',
      '1. Erklaere informativ was Wirkstoffe leisten koennen.',
      '2. KEINE konkreten "du brauchst X" Empfehlungen ohne Profil.',
      '3. Schlage freundlich vor das Quiz auszufuellen fuer',
      '   personalisierte Empfehlungen.',
      '4. Du kannst aber gerne Wissen vermitteln und Fragen',
      '   beantworten – beratend, nicht verschreibend.'
    ].join('\n');
  }
}


/* ──────────────────────────────────────────────────────────
   MYTHEN-KONTEXT
   Bei Mythen-Fragen: ehrliche Aufklaerung ohne Marketing
────────────────────────────────────────────────────────── */
function kiBaueMythenKontext() {
  return [
    '── MYTHEN-AUFKLAERUNGS-MODUS ──',
    'User hat eine Mythen-typische Frage gestellt.',
    'Verhalten:',
    '1. EHRLICH antworten, auch wenn die Wahrheit unbequem ist.',
    '2. Wenn Mythos = falsch: klar widerlegen, mit Quelle.',
    '3. Wenn Mythos = wahr: bestaetigen, Hintergrund erklaeren.',
    '4. Wenn Mythos = teilweise wahr: nuanciert differenzieren.',
    '5. KEINE Marketing-Sprache. KEINE Heilsversprechen.',
    '6. Wirkungen realistisch einschaetzen, Effektgroessen nennen.'
  ].join('\n');
}


/* ──────────────────────────────────────────────────────────
   HAUPT-FUNKTION
   Wird von ki-chat.js aufgerufen mit der letzten User-Nachricht
   Gibt zusaetzlichen System-Kontext als String zurueck
────────────────────────────────────────────────────────── */
function kiLadeKontextFuerNachricht(userText) {
  // Analyse durchfuehren
  var analyse = kiAnalysiereNachricht(userText);

  // Wenn nichts erkannt wurde: leerer Kontext (Basis-Prompt reicht)
  var nichtsErkannt = (
    analyse.wirkstoffe.length === 0 &&
    analyse.themen.length === 0 &&
    !analyse.sicherheit &&
    !analyse.mythen &&
    !analyse.empfehlung
  );
  if (nichtsErkannt) return '';

  var bloecke = [];
  bloecke.push('');
  bloecke.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  bloecke.push('  KONTEXT-INJEKTION FUER DIESE NACHRICHT');
  bloecke.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Spezial-Modi zuerst (Verhaltensanweisungen)
  if (analyse.sicherheit) {
    bloecke.push('');
    bloecke.push(kiBaueSicherheitsKontext());
  }

  if (analyse.mythen) {
    bloecke.push('');
    bloecke.push(kiBaueMythenKontext());
  }

  if (analyse.empfehlung) {
    bloecke.push('');
    var quizGemacht = (typeof AW !== 'undefined') &&
                      AW && Object.keys(AW).length > 5;
    bloecke.push(kiBaueEmpfehlungsKontext(quizGemacht));
  }

  // Erkannte Wirkstoffe im Detail anhaengen
  if (analyse.wirkstoffe.length > 0 &&
      typeof WIRKSTOFFE_WISSEN !== 'undefined' && WIRKSTOFFE_WISSEN) {

    bloecke.push('');
    bloecke.push('── DETAILS ZU ERKANNTEN WIRKSTOFFEN ──');
    bloecke.push('Quelle: stronger.wirkstoffe-wissen.json');
    bloecke.push('');

    analyse.wirkstoffe.forEach(function (wid) {
      var w = WIRKSTOFFE_WISSEN[wid];
      if (!w) return;

      var formatiert = kiFormatiereWirkstoff(wid, w);
      if (formatiert) {
        bloecke.push(formatiert);
        bloecke.push('');
      }

      // Produkte nur bei nicht-sicherheitskritischen Themen
      if (!analyse.sicherheit) {
        var produkte = kiFormatiereProdukte(wid);
        if (produkte) {
          bloecke.push(produkte);
          bloecke.push('');
        }
      }
    });
  }

  bloecke.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  bloecke.push('');

  // Debug-Ausgabe in Console (kann fuer Production entfernt werden)
  console.log('🤖 KI-Kontext geladen:', {
    wirkstoffe: analyse.wirkstoffe,
    themen:     analyse.themen,
    sicherheit: analyse.sicherheit,
    mythen:     analyse.mythen,
    empfehlung: analyse.empfehlung,
    contextLaenge: bloecke.join('\n').length + ' Zeichen'
  });

  return bloecke.join('\n');
}
