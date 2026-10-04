import { readFile, writeFile } from 'node:fs/promises';
const r = JSON.parse(await readFile(new URL('results/node-warehouse.json', import.meta.url), 'utf8'));
const ms = v => v.medianMs < 0.00005 ? '<0,00005' : v.medianMs.toFixed(4).replace('.', ',');
const percent = (a, b) => ((1 - b.medianMs / a.medianMs) * 100).toFixed(1).replace('.', ',') + ' %';
const row = values => '| ' + values.join(' | ') + ' |';
const tables = {
  collisions: r.collisions.filter(x => x.count === 150 || x.count === 1000).map(x => row([x.count, x.mode, ms(x.baseline), ms(x.sweep), ms(x.grid), ms(x.prepared), x.collisionCount])).join('\n'),
  scene: r.scene.map(x => row([x.count, x.boxCount, ms(x.baseline), ms(x.revisionCold), ms(x.revisionWarm), ms(x.scanCold), ms(x.scanWarm)])).join('\n'),
  slots: r.slots.map(x => row([x.count, x.slotCount, x.articleCount, ms(x.indexBuild), ms(x.matchBaseline), ms(x.matchCold), ms(x.matchWarm), ms(x.lookupLinear), ms(x.lookupIndexed)])).join('\n'),
  snaps: r.snaps.map(x => row([x.count, ms(x.baseline), ms(x.indexBuild), ms(x.cold), ms(x.warm)])).join('\n'),
  locks: r.locks.map(x => row([x.count, ms(x.baseline), ms(x.indexed)])).join('\n'),
  profiles: r.profiles.map(x => row([x.columns, ms(x.baseline), ms(x.compile), ms(x.cold), ms(x.warm)])).join('\n'),
  projections: r.projections.map(x => row([x.fileCount, ms(x.baseline), ms(x.cold), ms(x.warm)])).join('\n'),
  geometry: r.geometry.map(x => row([x.count, x.boxCount, ms(x.projectBaseline), ms(x.packAlreadyProjected), x.transparentBytes, x.transparentDrawSubmissionsCurrent, x.transparentDrawSubmissionsPackedCandidate])).join('\n')
};
const supported = r.collisions.find(x => x.count === 150 && x.mode === 'spread');
const dense = r.collisions.find(x => x.count === 150 && x.mode === 'dense');
const report = `# Lager-, Workspace- und Profilalternativen: Auswertung

Stand: ${r.generatedAt}. Aktueller Fachkern: Commit \`${r.baselineCommit}\`. Vollständige Messwerte, Streuung und SHA-256: [node-warehouse.json](results/node-warehouse.json).

## Rahmen und Aussagegrenzen

- Alle Dateien liegen im isolierten Experimentordner. Produktivdateien, Launcher, Serverfreigaben, IndexedDB, Workspace-Schema 13 und Lagerformat 1 wurden nicht verändert.
- Die heutigen Grenzen bleiben **150 Lagerobjekte und 5000 Stellplätze**. 150 verteilte und dichte Objekte sind gültige heutige Layouts. 1000 Objekte sind **Zukunftsstress außerhalb des Produktvertrags**. Die lange vertikale Anordnung testet Sweep-Degeneration; bei größeren Größen verlässt sie zusätzlich den heutigen Positionsbereich ±500000 mm.
- Fixtures sind deterministisch und synthetisch: mehrere Regalfelder und Ebenen, belegte/leere/fehlende Codes, negative Koordinaten, Rotationen, Sperren. Keine Betriebsdaten oder Fremdübertragung.
- Gemessen unter ${r.environment.os}, Node ${r.environment.node}, ${r.environment.cpu}, ${r.environment.logicalCpus} logischen CPUs. Node dient ausschließlich als vorhandenes Entwicklungswerkzeug. Für Nutzer bleiben Browser und bereits freigegebenes Python; keine Installation, keine neuen Pakete, keine EXE.
- Je Variante zwei ungemessene Aufwärmungen und sieben Messungen. Tabellen: Median in Millisekunden pro Operation. Bei sehr kleinen Aufgaben werden mehrere Operationen pro Probe gemittelt; Anzahl, Minimum, Maximum und Einzelproben stehen im JSON. Die Varianten laufen in fester Reihenfolge; JIT, GC und weitere Rechnerlast können Ergebnisse beeinflussen. Keine Behauptung einer statistisch abgesicherten allgemeinen Hardwarewirkung.
- Dies ist ein vollständiger lokaler Einzellauf mit mehreren Proben, ohne reservierte CPU oder Kontrolle paralleler Entwicklungsarbeit. Unterschiede von wenigen Prozent sind damit nicht belastbar. Größere Unterschiede brauchen vor Übernahme weitere Läufe mit kontrollierter Last, realistischen Quellen und getrennt gemessenen Speicherspitzen.
- Kalte Varianten enthalten Aufbau, Validierung, Kandidatenbildung und Sortierung. Warme Varianten verlangen bereits vorhandene gültige Indizes bzw. Revisionen. Vollständige Ausgabegleichheit wird außerhalb der Zeitmessung geprüft.
- Die kumulative Prozess-Spitze für den **gesamten** Lauf beträgt ${(r.memory.wholeRunPeakRssKiB / 1024).toFixed(1)} MiB RSS, der abschließende RSS ${(r.memory.finalRssBytes / 1048576).toFixed(1)} MiB. Das ist keine getrennte Speicherbewertung einzelner Algorithmen. Der Lauf enthält dichte 1000-Objekt-Listen und vollständige CPU-Rendergeometrie. Ein großer Speedup allein belegt keine geringe Speicherspitze.
- Die hier aufgezeichneten Laufzeiten sind **Node-CPU-Messungen**. Keine Edge-FPS-, WebGL-/GPU-, Bedien-, Geräte- oder Firmenabnahme. Auch Drawsubmission-Zahlen sind eine strukturelle Kandidatenbewertung, kein gemessener GPU-Gewinn.

## Aktuelle Features und genaue Experimentgrenze

| Vorhandenes Feature | Heutiger Fachkern | Alternative bzw. Behandlung | Belegte Grenze |
| --- | --- | --- | --- |
| Objektarten, Maße, ID-/Code-Eindeutigkeit, Layoutvalidierung | warehouse.js normalizeLayout | unveränderter Validator; gültige 150 und abgewiesene 1000/über 5000 geprüft | Kein neuer Lagervertrag |
| Regalrezepte, Felder, Ebenen, Positionen | createRack/resizeRack/resizeBayLevels/resizeLevelPositions | bestehender Fachkern; Mehrfeld-Fixtures für alle neuen Projektionen | Kein neuer Rezeptalgorithmus oder Wizard |
| Kollisionen und blockierte Gänge | findCollisions + SAT | Sweep, Raster mit unverändertem Original-SAT; vorberechnetes mathematisch gleiches SAT | Ausgabetyp, Reihenfolge, Kontakt-Toleranz gleich; alle Artenpaare geprüft |
| Verbinder und einrastende Platzierung | findConnectionSnap/connectionAnchors | räumlicher Ankerindex, exakte Auswahlsortierung und Hysterese | Positiver Snap, Ties, bevorzugter Treffer und Fallback geprüft |
| Objekte/Regalteile sperren, Freigabe | lockedEditConflict | vorab erstellte ID-Sets ersetzen wiederholte lineare Mitgliedschaftssuche | Verschiebung, Teilcode-Edit, Entfernen, Reihenfolge, Toggle und neu gesperrtes Objekt gleich |
| Duplizieren, Rotieren, Raster, Undo/Redo | warehouse.js und warehouse-editor.js | unveränderter Fachkern; keine experimentelle Zustands-/Historienänderung | Keine separate Performance- oder Browserabnahme dieser UI-Aktionen |
| Artikel-/Stellplatzzuordnung und exakte Codesuche | listSlots/matchArticles, warehouse-analysis.js | Slot-ID-/Code-Map, vorbereiteter Zuordnungsindex | Artikelreihenfolge und unbekannte Codes gleich; normale Codes eindeutig |
| 3D-Regalgeometrie/Fokus | warehouse-scene.js buildBoxes | begrenzter Cache mit Revisionen oder Inhaltsprüfung | Exakte Boxlisten; Invalidation geprüft; kein FPS-Nachweis |
| 3D-CPU-Projektion, Transparenz/Picking | warehouse-webgl.js projectScene | Projektionsfachkern unverändert; sortierte transparente Vertices zusammenpacken | Exakte Vertexfolge; zusätzlicher Speicher und CPU-Kopie; GPU-Einsatz ungetestet |
| Arbeitsbereichsliste, Summen, eigene Felder | storage.js metadataFor/listWorkspaces, workspace.js | abgeleitete flache Zusammenfassung, optional Cache | Keine Kopie von Nutzerdaten; gleiche Quell-/Byte-/Zeilenzähler; kein alternatives Repository |
| Importprofile, Doppelheader, Regeln, eigene Ziele | workspace.js planImportProfile | Profil einmal validieren/vorkompilieren; Zielheader jedes Mal neu prüfen | Mehrdeutigkeit/Kollision/missing/custom-field-missing und Regelreihenfolge gleich |
| Speichern, Aktivieren, Löschen, Migration, Sicherung/Wiederherstellung | storage.js/workspace.js | bestehender Fachkern bleibt allein verantwortlich | Keine Transaktions-/Storage-Alternative in diesem Teil; keine Datenbankmigration |
| Sprache, 2D-Fallback, WebGL-Kontextverlust | warehouse-editor.js/warehouse-analysis.js/warehouse-webgl.js | bestehende UI; Locale invalidate als Cache-Vertragsdimension | Kein neuer Fallback, keine Browserabnahme |

## 1. Kollisionsprüfung

Der heutige Kern prüft Objektpaare in Eingabereihenfolge. Für jedes fachlich relevante Paar erzeugt SAT erneut beide gedrehten Grundrisse und projiziert auf die Kanten-Normalen. Eine Berührung bis 0,001 mm gilt weiter als keine Überschneidung.

**Sweep:** Einmal AABBs aus den originalen footprintCorners vorberechnen, nach minX sortieren, beendete Intervalle entfernen, Z-Überlappung prüfen, danach den **unveränderten** footprintsOverlap-Export aufrufen. Kandidaten abschließend nach ursprünglichem Paarindex sortieren. Gut bei räumlich getrennten Objekten; bei identischen X-Intervallen weiter O(n²) Broadphase.

**Raster:** AABBs in 10000-mm-Zellen eintragen; nur Zellen-Mitglieder vergleichen, Paar-Set deduplizieren und deterministisch sortieren. Negative Koordinaten werden mit floor behandelt. Ein Objekt mit über 4096 Zellen fällt konservativ auf Vergleich mit allen Objekten zurück. Große Zellbelegung erzeugt im dichten Fall fast alle Paare und zusätzlich Set-/Sortierkosten. Kein universeller Zellgrößen-Optimumanspruch.

**Vorberechnetes SAT:** Weiter alle Paare besuchen, vorher je Objekt einmal die originalen Eckpunkte erzeugen. Exakt gleiche Achsenfolge, Projektionsarithmetik und Toleranz; Min-/Max-Reduktion ohne temporäre Projektionstabellen. AABBs überspringen sicher getrennte Paare. Diese Variante implementiert SAT im Labor neu und hat daher mehr fachliche Übernahmeprüfung nötig als Sweep/Raster mit originalem Export. Bei wenigen stark überlappenden Objekten spart sie die sonst je Paar wiederholte Koordinatenberechnung.

| Objekte | Anordnung | Heute | Sweep | Raster | Vorberechnetes SAT | Kollisionen |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${tables.collisions}

Bei 150 verteilten Objekten spart Sweep in dieser Messung ${percent(supported.baseline, supported.sweep)} CPU-Zeit; bei 150 dichten Objekten sind es ${percent(dense.baseline, dense.sweep)}. Der dritte Ansatz spart dort ${percent(dense.baseline, dense.prepared)}. Die Anordnung beeinflusst den Nutzen stärker als die Objektzahl. Keine Variante darf anhand des verteilten Bestfalls allein gewählt werden.

## 2. Scene-Cache

| Objekte | Boxen | Heute buildBoxes | Revision kalt | Revision warm | Inhalt kalt | Inhalt warm |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${tables.scene}

Der begrenzte Cache hält genau einen Scene-Snapshot. Schlüssel: workspaceId, layoutRevision, registryRevision, locale, kernelVersion. Eine andere Layout- oder Match-Objektidentität invalidiert zusätzlich. Locale und Kernversion sind konservative Verträge für spätere beschriftete Geometrie/Styleänderungen.

**Annahme:** Ein schneller Revisionscache erhält unveränderliche Snapshots oder korrekt erhöhte Revisionen. In-place-Änderungen ohne Erhöhung werden bewusst nicht automatisch erkannt; ein Test zeigt diesen Vertrag. Bei Produktübernahme müssten neue/aktive Workspaces, Ladung/Migration, jede Entwurfänderung einschließlich Undo/Redo und Sperren, Codes, Regalteile, Registry-Neuanalyse sowie Sprache invalidieren. Reines Drehen/Zoomen der Kamera benötigt keine neue Boxgeometrie. In-flight Worker-Ergebnisse dürfen nur zur passenden Workspace- und Analyserevision aktiviert werden.

Der heutige Controller erstellt beim Rendern neue Match-Objekte; unverändertes Einstecken dieses Caches ergäbe deshalb meist einen kalten Treffer. Die warme Messung setzt eine getrennte Match-/Layout-Lebensdauer voraus. Inhaltsprüfung mittels JSON ist selbst-validierender für In-place-Änderungen, kostet hier aber deutlich mehr als buildBoxes. Auch ein warmer Box-Cache spart nur Boxaufbau, nicht die erheblich teurere spätere CPU-Projection.

## 3. Stellplatz-/Artikelindex

| Objekte | Slots | Artikel | Indexaufbau | Matching heute | Matching kalt | Matching warm | Lineare Suchserie | Map-Suchserie |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${tables.slots}

Die Suchserie fragt die letzten maximal 100 Codes ab (bei 10 Objekten nur 54). Eine Map findet exakte Codes ohne den wiederholten linearen Durchlauf. Der Indexaufbau ist getrennt ausgewiesen; einzelne einmalige Suchen amortisieren ihn nicht zwingend. Die Artikelzuordnung bleibt eine vollständige O(A)-Iteration, erhält Eingabereihenfolge, Mehrfachartikel und Reviewfälle. Damit ist der Gewinn beim gesamten Matching kleiner als bei reinen Codesuchen.

Der normale Validator weist doppelte Codes und IDs weiterhin ab. Für rohe Vorvalidierungsdaten sind **zwei** Code-Maps nötig: bestehende UI-find-Semantik nimmt den ersten Treffer, matchArticles nimmt den letzten. Keine versteckte neue Duplikatregel. Index nach jedem Code-/Teil-/Layoutwechsel neu aufbauen; Positionen für zukünftige räumliche Artikeloptimierung dürfen nicht aus uneindeutigen Quellcodes geraten werden.

## 4. Anker-Snap und Sperren

| Objekte | Snap heute | Ankerindex aufbauen | Snap kalt | Snap warm |
| --- | ---: | ---: | ---: | ---: |
${tables.snaps}

Beim Draggen wird der feste Rest der Szene einmal indexiert. Abfrage sucht um die beiden bewegten Anker; bevorzugte Verbindung verwendet weiter den Faktor 1,5. Kandidaten werden nach ursprünglichem Objekt- und Ankerindex sortiert, damit Gleichstände und Hysterese exakt bleiben. Sehr großer Toleranzbereich nimmt den ursprünglichen Kern. Der kalte Index ist für einzelne Aktionen teils teurer; Nutzen entsteht über viele Pointermoves mit unveränderten Zielobjekten. Werden Zielposition/Rotation/Maße/Typ geändert, ist er ungültig.

| Objekte | Locks-Prüfung heute | ID-Set-Variante |
| --- | ---: | ---: |
${tables.locks}

Der Set-Ansatz ersetzt den wiederholten previous.some-Aufruf für jedes vorgeschlagene Objekt. Fachliche Sperrentscheidung und JSON-Vergleich gesperrter Regalteile bleiben gleich. Am heutigen Maximum sind absolute Kosten klein; Priorität geringer als die CPU-Projektion oder Imports großer Quellen.

## 5. Importprofile und Workspace-Projektionen

| Quellspalten | Profilplan heute | Profil vorbereiten | Plan kalt | Plan warm |
| --- | ---: | ---: | ---: | ---: |
${tables.profiles}

Ein Profil wird einmal durch den originalen normalizeImportProfiles validiert, inklusive Regel-/Ziel-/Headergrenzen. Vorkompilierte normalisierte Quellheader und Häufigkeiten sind schreibgeschützter Vertrag; Zielheader und aktive Customfelder werden bei jedem Plan neu geprüft. Genau gleiche Headerpositionen bleiben möglich, bei geänderter Struktur müssen Doppelheader weiter manuell geklärt werden. Kein KI-Raten und kein automatisches Anwenden. Ausgegebene Regeln werden getrennt kopiert, damit UI-Änderungen einen späteren Plan nicht verunreinigen. Quellenprofile müssen bei jeder Regel-/Mapping-/Namensänderung neu kompiliert werden.

| Quellen pro Workspace | Zusammenfassung neu berechnen | Cache kalt | Cache warm |
| --- | ---: | ---: | ---: |
${tables.projections}

Dies ist eine experimentelle UI-Projektion auf Grundlage der bestehenden sourceCount/sourceBytes/normalizedRowCount-Semantik plus Feld-/Profil-/Objektzählung. **Kein Vergleich zweier IndexedDB-Repositories.** Die heutige Datenbank speichert die Kernmetadaten bereits getrennt; dafür sämtliche Quellen zu laden wäre eine Verschlechterung. Die warmen Nanosekundenwerte sind nur Microbenchmarks eines vorhandenen JS-Objekts und keine relevante Benutzerzeit. Keine hohe Priorität ohne nachgewiesenen Controller-Engpass.

## 6. Transparente Geometrie zusammenpacken

| Objekte | Boxen | CPU projectScene heute | Zusätzliche Packing-Zeit | Transparenzbytes | Bestehende Drawsubmissions | Kandidat |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${tables.geometry}

Die bereits nach Tiefe sortierten Float32-Arrays werden in gleicher Reihenfolge zu einem Array zusammengesetzt. Ein korrekt implementierter Renderer könnte statt eines gl.drawArrays je transparentem Teil einen Aufruf für diese geordnete Vertexfolge verwenden. Picking-Farbwerte und Vertexfolge bleiben exakt; die übrigen Scene-Arrays werden nicht verändert. Die Originalarrays existieren im Experiment zusätzlich: Packing erhöht Speicher um die angegebenen Transparenzbytes und kopiert je Szene. Eine künftige integrierte Variante müsste direkt in den Zielbuffer schreiben.

CPU projectScene allein benötigt im synthetischen 150-Objekt-Lauf bereits mehr als ein 60-FPS-Framebudget von 16,7 ms. Daraus folgt keine Edge-FPS-Messung, aber ein klarer Untersuchungsauftrag: Weltgeometrie vorhalten, Kameratransform im Shader, Auswahl-/Kollisionsfarben getrennt aktualisieren, GPU-Buffers/Picking wiederverwenden. Diese tieferen Renderer-Alternativen sind hier **Entwurf, nicht getestet**. Transparenzsortierung, Wandmodus, Kamera, Fitscale, Fokussierung, Picking, Resize und WebGL-Kontextverlust müssten dabei gemeinsam geprüft werden.

## Entscheidung

1. **Für weiterführende Fachtests auswählen:** vorberechnetes SAT, Sweep/Raster abhängig von räumlicher Verteilung, exakter Slotcode-Index und Snap-Index für wiederholte Drag-Bewegungen. Die Kombination braucht eine gemessene Umschalt-/Invalidationsstrategie; noch keine Produktintegration.
2. **Vorkompilierte Importprofile bevorzugt prüfen**, wenn Profile häufig auf viele neue Quellen angewendet werden. Ein einzelner 39-Spalten-Import profitiert absolut wenig.
3. **Scene-Revisionscache als Baustein**, mit vollständiger Lebensdauersteuerung. Inhalts-Hashing/JSON-Scanning in jedem Kameraframe ist hier schlechter als der bisherige Boxaufbau.
4. **Renderer weiter untersuchen:** vollständige CPU-Projektion ist erheblich teurer als Boxaufbau. Nur transparentes Packing ist ein kontrollierter CPU-/Submission-Prototyp; für GPU-Vorteile fehlt Messung.
5. **Workspace-Metadatencache und lineare Locks-Prüfung niedrig priorisieren.** Semantik und heutige Kosten sind belegt, ein größerer Funktionsgewinn nicht.

## Reproduzieren

Vom Projektordner mit vorhandenem Node:

\`\`\`powershell
node --test experiments/feature-lab/warehouse/tests.test.mjs
node experiments/feature-lab/warehouse/run-benchmarks.mjs
node experiments/feature-lab/warehouse/write-evaluation.mjs
\`\`\`

17 Labortests bestanden. Sie prüfen Vollausgaben, alle Objektartenpaare, deterministische Zufallsanordnungen, Grenzkontakte/Rotation, Rasterfallback, Index-/Cacheinvalidierung, Duplikate, Snap-Hysterese, gesperrte Regalteile, Importprofile und Vertexreihenfolge. Kein Test lädt Betriebsdaten. Ein gemeinsamer Browser-/Controller-Lastfall und eine Firmenabnahme bleiben separate nächste Schritte.
`;
await writeFile(new URL('WAREHOUSE-EVALUATION.md', import.meta.url), report);
console.log('WAREHOUSE-EVALUATION.md generated from recorded measurements.');
