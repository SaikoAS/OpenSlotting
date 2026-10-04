# Lager-, Workspace- und Profilalternativen: Auswertung

Stand: 2026-10-04T10:02:06.303Z. Aktueller Fachkern: Commit `59525a447004396b47747f587c7ba14511357719`. Vollständige Messwerte, Streuung und SHA-256: [node-warehouse.json](results/node-warehouse.json).

## Rahmen und Aussagegrenzen

- Alle Dateien liegen im isolierten Experimentordner. Produktivdateien, Launcher, Serverfreigaben, IndexedDB, Workspace-Schema 13 und Lagerformat 1 wurden nicht verändert.
- Die heutigen Grenzen bleiben **150 Lagerobjekte und 5000 Stellplätze**. 150 verteilte und dichte Objekte sind gültige heutige Layouts. 1000 Objekte sind **Zukunftsstress außerhalb des Produktvertrags**. Die lange vertikale Anordnung testet Sweep-Degeneration; bei größeren Größen verlässt sie zusätzlich den heutigen Positionsbereich ±500000 mm.
- Fixtures sind deterministisch und synthetisch: mehrere Regalfelder und Ebenen, belegte/leere/fehlende Codes, negative Koordinaten, Rotationen, Sperren. Keine Betriebsdaten oder Fremdübertragung.
- Gemessen unter win32 10.0.26200, Node v24.18.1, 12th Gen Intel(R) Core(TM) i9-12900F, 24 logischen CPUs. Node dient ausschließlich als vorhandenes Entwicklungswerkzeug. Für Nutzer bleiben Browser und bereits freigegebenes Python; keine Installation, keine neuen Pakete, keine EXE.
- Je Variante zwei ungemessene Aufwärmungen und sieben Messungen. Tabellen: Median in Millisekunden pro Operation. Bei sehr kleinen Aufgaben werden mehrere Operationen pro Probe gemittelt; Anzahl, Minimum, Maximum und Einzelproben stehen im JSON. Die Varianten laufen in fester Reihenfolge; JIT, GC und weitere Rechnerlast können Ergebnisse beeinflussen. Keine Behauptung einer statistisch abgesicherten allgemeinen Hardwarewirkung.
- Dies ist ein vollständiger lokaler Einzellauf mit mehreren Proben, ohne reservierte CPU oder Kontrolle paralleler Entwicklungsarbeit. Unterschiede von wenigen Prozent sind damit nicht belastbar. Größere Unterschiede brauchen vor Übernahme weitere Läufe mit kontrollierter Last, realistischen Quellen und getrennt gemessenen Speicherspitzen.
- Kalte Varianten enthalten Aufbau, Validierung, Kandidatenbildung und Sortierung. Warme Varianten verlangen bereits vorhandene gültige Indizes bzw. Revisionen. Vollständige Ausgabegleichheit wird außerhalb der Zeitmessung geprüft.
- Die kumulative Prozess-Spitze für den **gesamten** Lauf beträgt 1299.1 MiB RSS, der abschließende RSS 704.6 MiB. Das ist keine getrennte Speicherbewertung einzelner Algorithmen. Der Lauf enthält dichte 1000-Objekt-Listen und vollständige CPU-Rendergeometrie. Ein großer Speedup allein belegt keine geringe Speicherspitze.
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
| 150 | spread | 3,8349 | 0,0752 | 0,0900 | 0,2186 | 0 |
| 150 | vertical | 3,8832 | 0,1443 | 0,0936 | 0,2060 | 0 |
| 150 | dense | 10,9261 | 11,2099 | 11,8610 | 1,4565 | 3554 |
| 1000 | spread | 165,2449 | 0,6945 | 0,6475 | 7,9637 | 0 |
| 1000 | vertical | 174,5103 | 3,6013 | 0,5940 | 7,7771 | 0 |
| 1000 | dense | 491,6182 | 518,2431 | 525,2738 | 52,2232 | 159046 |

Bei 150 verteilten Objekten spart Sweep in dieser Messung 98,0 % CPU-Zeit; bei 150 dichten Objekten sind es -2,6 %. Der dritte Ansatz spart dort 86,7 %. Die Anordnung beeinflusst den Nutzen stärker als die Objektzahl. Keine Variante darf anhand des verteilten Bestfalls allein gewählt werden.

## 2. Scene-Cache

| Objekte | Boxen | Heute buildBoxes | Revision kalt | Revision warm | Inhalt kalt | Inhalt warm |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 221 | 0,0106 | 0,0085 | 0,0002 | 0,0899 | 0,0906 |
| 100 | 1899 | 0,0496 | 0,0437 | 0,0002 | 1,0396 | 1,1807 |
| 150 | 2803 | 0,1335 | 0,0587 | 0,0001 | 1,9514 | 2,2982 |
| 1000 | 18701 | 0,6956 | 2,2639 | 0,0001 | 13,6318 | 15,5996 |

Der begrenzte Cache hält genau einen Scene-Snapshot. Schlüssel: workspaceId, layoutRevision, registryRevision, locale, kernelVersion. Eine andere Layout- oder Match-Objektidentität invalidiert zusätzlich. Locale und Kernversion sind konservative Verträge für spätere beschriftete Geometrie/Styleänderungen.

**Annahme:** Ein schneller Revisionscache erhält unveränderliche Snapshots oder korrekt erhöhte Revisionen. In-place-Änderungen ohne Erhöhung werden bewusst nicht automatisch erkannt; ein Test zeigt diesen Vertrag. Bei Produktübernahme müssten neue/aktive Workspaces, Ladung/Migration, jede Entwurfänderung einschließlich Undo/Redo und Sperren, Codes, Regalteile, Registry-Neuanalyse sowie Sprache invalidieren. Reines Drehen/Zoomen der Kamera benötigt keine neue Boxgeometrie. In-flight Worker-Ergebnisse dürfen nur zur passenden Workspace- und Analyserevision aktiviert werden.

Der heutige Controller erstellt beim Rendern neue Match-Objekte; unverändertes Einstecken dieses Caches ergäbe deshalb meist einen kalten Treffer. Die warme Messung setzt eine getrennte Match-/Layout-Lebensdauer voraus. Inhaltsprüfung mittels JSON ist selbst-validierender für In-place-Änderungen, kostet hier aber deutlich mehr als buildBoxes. Auch ein warmer Box-Cache spart nur Boxaufbau, nicht die erheblich teurere spätere CPU-Projection.

## 3. Stellplatz-/Artikelindex

| Objekte | Slots | Artikel | Indexaufbau | Matching heute | Matching kalt | Matching warm | Lineare Suchserie | Map-Suchserie |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 54 | 1000 | 0,0103 | 0,1175 | 0,0681 | 0,0624 | 0,0109 | 0,0008 |
| 100 | 459 | 10000 | 0,0537 | 0,8309 | 0,7224 | 0,6716 | 0,2352 | 0,0005 |
| 150 | 675 | 15000 | 0,0635 | 1,3272 | 1,1371 | 1,0684 | 0,2887 | 0,0005 |
| 1000 | 4509 | 100000 | 0,6338 | 11,3091 | 11,1997 | 10,7428 | 2,6139 | 0,0003 |

Die Suchserie fragt die letzten maximal 100 Codes ab (bei 10 Objekten nur 54). Eine Map findet exakte Codes ohne den wiederholten linearen Durchlauf. Der Indexaufbau ist getrennt ausgewiesen; einzelne einmalige Suchen amortisieren ihn nicht zwingend. Die Artikelzuordnung bleibt eine vollständige O(A)-Iteration, erhält Eingabereihenfolge, Mehrfachartikel und Reviewfälle. Damit ist der Gewinn beim gesamten Matching kleiner als bei reinen Codesuchen.

Der normale Validator weist doppelte Codes und IDs weiterhin ab. Für rohe Vorvalidierungsdaten sind **zwei** Code-Maps nötig: bestehende UI-find-Semantik nimmt den ersten Treffer, matchArticles nimmt den letzten. Keine versteckte neue Duplikatregel. Index nach jedem Code-/Teil-/Layoutwechsel neu aufbauen; Positionen für zukünftige räumliche Artikeloptimierung dürfen nicht aus uneindeutigen Quellcodes geraten werden.

## 4. Anker-Snap und Sperren

| Objekte | Snap heute | Ankerindex aufbauen | Snap kalt | Snap warm |
| --- | ---: | ---: | ---: | ---: |
| 10 | 0,0027 | 0,0047 | 0,0052 | 0,0012 |
| 100 | 0,0185 | 0,0225 | 0,0198 | 0,0007 |
| 150 | 0,0243 | 0,0246 | 0,0255 | 0,0008 |
| 1000 | 0,1592 | 0,1641 | 0,1702 | 0,0003 |

Beim Draggen wird der feste Rest der Szene einmal indexiert. Abfrage sucht um die beiden bewegten Anker; bevorzugte Verbindung verwendet weiter den Faktor 1,5. Kandidaten werden nach ursprünglichem Objekt- und Ankerindex sortiert, damit Gleichstände und Hysterese exakt bleiben. Sehr großer Toleranzbereich nimmt den ursprünglichen Kern. Der kalte Index ist für einzelne Aktionen teils teurer; Nutzen entsteht über viele Pointermoves mit unveränderten Zielobjekten. Werden Zielposition/Rotation/Maße/Typ geändert, ist er ungültig.

| Objekte | Locks-Prüfung heute | ID-Set-Variante |
| --- | ---: | ---: |
| 10 | 0,0024 | 0,0019 |
| 100 | 0,0400 | 0,0113 |
| 150 | 0,0735 | 0,0130 |
| 1000 | 2,0805 | 0,1289 |

Der Set-Ansatz ersetzt den wiederholten previous.some-Aufruf für jedes vorgeschlagene Objekt. Fachliche Sperrentscheidung und JSON-Vergleich gesperrter Regalteile bleiben gleich. Am heutigen Maximum sind absolute Kosten klein; Priorität geringer als die CPU-Projektion oder Imports großer Quellen.

## 5. Importprofile und Workspace-Projektionen

| Quellspalten | Profilplan heute | Profil vorbereiten | Plan kalt | Plan warm |
| --- | ---: | ---: | ---: | ---: |
| 39 | 0,0102 | 0,0076 | 0,0139 | 0,0064 |
| 512 | 0,0797 | 0,0374 | 0,0836 | 0,0398 |
| 4096 | 0,6516 | 0,3317 | 0,6509 | 0,3610 |

Ein Profil wird einmal durch den originalen normalizeImportProfiles validiert, inklusive Regel-/Ziel-/Headergrenzen. Vorkompilierte normalisierte Quellheader und Häufigkeiten sind schreibgeschützter Vertrag; Zielheader und aktive Customfelder werden bei jedem Plan neu geprüft. Genau gleiche Headerpositionen bleiben möglich, bei geänderter Struktur müssen Doppelheader weiter manuell geklärt werden. Kein KI-Raten und kein automatisches Anwenden. Ausgegebene Regeln werden getrennt kopiert, damit UI-Änderungen einen späteren Plan nicht verunreinigen. Quellenprofile müssen bei jeder Regel-/Mapping-/Namensänderung neu kompiliert werden.

| Quellen pro Workspace | Zusammenfassung neu berechnen | Cache kalt | Cache warm |
| --- | ---: | ---: | ---: |
| 10 | 0,0004 | 0,0004 | <0,00005 |
| 100 | 0,0013 | 0,0011 | <0,00005 |
| 1000 | 0,0100 | 0,0101 | <0,00005 |

Dies ist eine experimentelle UI-Projektion auf Grundlage der bestehenden sourceCount/sourceBytes/normalizedRowCount-Semantik plus Feld-/Profil-/Objektzählung. **Kein Vergleich zweier IndexedDB-Repositories.** Die heutige Datenbank speichert die Kernmetadaten bereits getrennt; dafür sämtliche Quellen zu laden wäre eine Verschlechterung. Die warmen Nanosekundenwerte sind nur Microbenchmarks eines vorhandenen JS-Objekts und keine relevante Benutzerzeit. Keine hohe Priorität ohne nachgewiesenen Controller-Engpass.

## 6. Transparente Geometrie zusammenpacken

| Objekte | Boxen | CPU projectScene heute | Zusätzliche Packing-Zeit | Transparenzbytes | Bestehende Drawsubmissions | Kandidat |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 221 | 2,3092 | 0,0011 | 3600 | 3 | 1 |
| 100 | 1899 | 18,6340 | 0,0153 | 45600 | 38 | 1 |
| 150 | 2803 | 26,5211 | 0,0229 | 67200 | 56 | 1 |
| 1000 | 18701 | 234,4375 | 0,1156 | 456000 | 380 | 1 |

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

```powershell
node --test experiments/feature-lab/warehouse/tests.test.mjs
node experiments/feature-lab/warehouse/run-benchmarks.mjs
node experiments/feature-lab/warehouse/write-evaluation.mjs
```

17 Labortests bestanden. Sie prüfen Vollausgaben, alle Objektartenpaare, deterministische Zufallsanordnungen, Grenzkontakte/Rotation, Rasterfallback, Index-/Cacheinvalidierung, Duplikate, Snap-Hysterese, gesperrte Regalteile, Importprofile und Vertexreihenfolge. Kein Test lädt Betriebsdaten. Ein gemeinsamer Browser-/Controller-Lastfall und eine Firmenabnahme bleiben separate nächste Schritte.
