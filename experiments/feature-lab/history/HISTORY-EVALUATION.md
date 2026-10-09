# Bewertung: Editor-History mit Snapshots und Objekt-Deltas

Stand 2026-10-04. **Isoliertes Labor; keine neue Historie ist in den Editor
oder die Datenbank eingebaut.** Alle Layouts und Bearbeitungen sind
synthetisch. Es gibt keine neue Benutzerabhängigkeit.

## Entscheidung

Objekt-ID-gebundene Deltas sparen in dieser Serie viel gehaltene History-Daten,
sind aber **kein allgemeiner Laufzeitgewinner**. Die gesamte gemessene Folge
aus 50 bestätigten Bearbeitungen, 20 Undo und 20 Redo ist mit Deltas etwas
langsamer. Für die derzeit erlaubten höchstens 150 Objekte und 20
Historieneinträge rechtfertigt das alleine keinen sofortigen Austausch.

Die Variante ist ein Kandidat, wenn sich Speicherbedarf als tatsächliches
Editorproblem erweist oder die erlaubte Layoutgröße künftig erhöht wird.
Eine reine Reaktion auf Localhost würde hier keine Mathematikfähigkeit neu
erfinden: beide Repräsentationen wären auch im Browser grundsätzlich möglich.
Ein separates statisches Modul vereinfacht die künftige Architektur.

## Was genau beibehalten wird

Ausgangsvertrag: `warehouse-editor.js` mit `keepRecent` und `commit`.

- Beide Stacks behalten **20 Einträge**, nicht 50. 50 ist die Zahl der
  bestätigten Bearbeitungen im Benchmark.
- `warehouse.normalizeLayout` prüft weiterhin alle vollständigen Kandidaten.
  `warehouse.lockedEditConflict` bleibt die originale Sperrprüfung.
- Historie und Objektauswahl ändern sich erst nach erfolgreichem `save`.
  Fehlgeschlagene Bearbeitung, Undo oder Redo verändern die Stacks nicht.
- Während `save` läuft, wird eine weitere Bearbeitung abgewiesen. Der
  Workspace-Scope wird nach der Bestätigung erneut geprüft.
- Eine neue bestätigte Bearbeitung nach Undo verwirft Redo. Ein fehlgeschlagener
  Versuch verwirft Redo nicht.
- Lock-Toggles erzeugen aktuell **keine** Historyeinträge. Undo/Redo übernehmen
  die aktuell vorhandenen Sperren; eine gesperrte geometrische Änderung kann
  weiterhin Undo blockieren. Es gibt keine neue Lock-/Command-Semantik.
- Die zurückgestellte Auswahl ist dieselbe **Objekt-ID** wie im aktuellen
  Commitvertrag. Kamera, Slot-, Bay- oder Level-Auswahl sind kein zusätzlich
  eingeführter Undo-Zustand.
- Bei Workspacewechsel werden beide Stacks geleert. Eine verspätete
  Speicherbestätigung des alten Workspace erzeugt keine History im neuen.

Die Laborcontrollerlogik bildet diesen Vertrag nach; sie ist kein DOM-Test
des tatsächlichen Editors. Der gemeinsame Speicherdummy bestätigt nur
synthetische lokale Zustände. IndexedDB-Latenz, Rendern und Benutzerereignisse
werden nicht gemessen.

## Varianten

### Vollständiger Snapshot

Vor jeder Bearbeitung wird das gesamte bisherige Layout durch
`JSON.parse(JSON.stringify(layout))` kopiert. Nach erfolgreicher Speicherung
kommt dieses Bild zusammen mit der Objekt-ID der Auswahl auf den Undo-Stack.
Undo/Redo tauschen entsprechend vollständige Bilder aus. Das entspricht der
vorhandenen Repräsentation; der Vergleich erfindet keine ältere schlechtere
Stackgrenze oder andere Persistenzregel.

### Objekt-ID-gebundenes Delta

Ein Eintrag enthält:

```text
rootBefore, rootAfter       alle Rootfelder außer objects
orderBefore, orderAfter     genaue Objekt-ID-Reihenfolge
changes                     ID plus vollständiges Vorher-/Nachherbild
                            jedes geänderten/hinzugefügten/gelöschten Objekts
beforeSelection,
afterSelection              Objektauswahl-IDs
```

Fehlende Objektbilder sind `null`. Unveränderte Objekte werden bei der
Rekonstruktion aus dem aktuellen Layout übernommen. Das ist ein Delta aus
Zustandsbildern, kein neuer Befehl wie „verschiebe Objekt um X“. Nested Rack-
Felder, Slot-Codes und Objekt-Reihenfolge bleiben dadurch genau wiederherstellbar.
Die anschließende originale Normalisierung erstellt den vollständigen
validierten Zielzustand. Beim Undo/Redo werden aktuelle Sperren ausdrücklich
übernommen.

Der generische Deltatest deckt zusätzliche Rootfelder ab. Der aktuelle
Warehouse-Normalisierer erzeugt weiterhin seinen aktuellen Rootvertrag;
damit wird keine neue Layout- oder Backupversion behauptet.

Für N Objekte, K veränderte Objekte und H gehaltene Einträge ist die grobe
Datenmenge:

```text
Snapshot:  O(H * Größe des ganzen Layouts)
Delta:     O(H * (N Objekt-IDs + Rootfelder + 2 * Größe der K Objektbilder))
```

Diese Aussage beschreibt die gespeicherten Daten, nicht automatisch die
Laufzeit. Der sichere Deltaversuch vergleicht alle Objekte und speichert beide
Bilder der Änderungen. Unveränderte ursprüngliche Validierung und Sperrprüfung
verarbeiten weiterhin vollständige Layouts. Wenn fast alle Objekte geändert
werden, kann der doppelte Delta-Inhalt sogar größer als ein Snapshot werden.

## Messmethode

- Windows x64, Node `v24.18.1`, Intel Core i9-12900F.
- 150 unterstützte Lagerobjekte, davon je 75 Paletten- und Fachbodenregale,
  drei Fächer und drei Ebenen; insgesamt 2.025 Positionen.
- Ein normiertes Layout ist 350.255 JSON-Bytes groß. IDs und Codes sind
  deterministisch und in beiden Varianten identisch.
- 50 neue bestätigte Edits: Code, Position, Rotation und Fachbreite,
  jeweils an einem Objekt. Danach 20 Undo und 20 Redo mit vollständigem
  Layout- und Objektauswahlvergleich.
- Beide Varianten rufen denselben originalen Warehouse-Kern auf und warten
  auf denselben synthetischen Speicherdummy. Die gemeinsame Erstellung des
  Bearbeitungskandidaten ist in der Editzeit enthalten.
- Fünf warme Messreihen pro Variante, Reihenfolge rotiert, explizite Garbage
  Collection außerhalb der Zeitmessung. Dieser Lauf erfolgte nach den anderen
  Agent-Benchmarks; er ist dennoch keine langfristige statistische Studie.
- Keine Browser-, DOM-, Kamera-, WebGL-, IndexedDB-, Firmen-PC- oder
  Nutzerdaten-Abnahme. Node bleibt ein vorhandenes Entwicklungswerkzeug.

Rohdaten und sämtliche Samples:
[results/node-benchmark.json](results/node-benchmark.json).

## Ergebnisse

Zeitangaben sind Mediane in Millisekunden. Der Gesamtmedian wird aus den
Gesamtzeiten jeder Messreihe berechnet; er muss nicht genau der Summe der
einzelnen Komponentenmediane entsprechen.

| Messung | vollständige Snapshots | Objekt-ID-Deltas |
| --- | ---: | ---: |
| Initialisierung | 1,59 ms | 1,57 ms |
| 50 bestätigte Bearbeitungen | 302,79 ms | 348,22 ms |
| 20 Undo | 118,78 ms | 111,34 ms |
| 20 Redo | 123,22 ms | 111,30 ms |
| gesamte Folge | **547,43 ms** | **571,09 ms** |
| gehaltene History als JSON | **7.005.848 Bytes** | **158.416 Bytes** |

Das Delta reduziert die serialisierte gehaltene History hier um ungefähr
97,74 %. Bearbeiten wird etwa 15 % langsamer, Undo/Redo etwas kürzer;
insgesamt ist die Folge etwa 4,3 % langsamer. Die zusätzliche Diffprüfung
und zwei Objektbilder pro Änderung erklären, warum „weniger Daten halten“
nicht automatisch „schneller bearbeiten“ bedeutet.

Nach expliziter Garbage Collection beträgt die gemessene zusätzliche
gehaltene Heap-Menge einschließlich Laborlayout und Vergleichsbildern etwa
13,42 MiB bei Snapshots und 2,50 MiB bei Deltas. Das ist eine GC-abhängige
Prozessmessung, kein exakter Speichervertrag der History. Die JSON-Bytezahl
ist dagegen eine exakte Größe der vollständig serialisierten Stacks.
Die Prozessspitze von ungefähr 244,33 MiB umfasst beide Varianten und ihre
Prüfungen; sie ist keine isolierte Produktspitze. Kleine negative RSS-Deltas
werden als Messrauschen behandelt, nicht als negative Allokation.

## Prüfung und nächste Schritte

**10 deterministische Tests bestehen.** Sie prüfen Rootfelder und Reihenfolge,
Move, Resize, Codeedit, Duplicate, Delete, vollständiges Undo/Redo mit
Objektauswahl, Lock-Toggles, geblocktes Undo, Redo mit unveränderten aktuellen
Sperren, neue Bearbeitung nach Undo, fehlgeschlagenen Edit/Undo/Redo,
No-ops, verdeckte Lockmutation, ausstehendes Save, parallelen Commitversuch,
Workspacewechsel während einer Speicherung, 50 Edits mit 20er Grenze und
Ablehnung eines 151. Objekts durch den originalen Normalisierer.

Vor einer späteren Entscheidung wären Edge mit echten Bedienpfaden,
isolierte Editor-Speicherspitzen, große strukturändernde Rack-Edits und die
tatsächliche IndexedDB-Speicherstrecke zu messen. Ein eventuell verfügbarer
„changed object ID“-Hinweis aus vorhandenen Editoraktionen könnte die
vollständige Diffprüfung verkürzen; diese zusätzliche Variante wurde hier
nicht implementiert oder als gemessener Vorteil behauptet. Die aktuelle
Sperr-, Bestätigungs- und Scopeprüfung muss dabei erhalten bleiben.

Ausführung:

```powershell
node --test experiments/feature-lab/history/tests.test.cjs
node --expose-gc experiments/feature-lab/history/benchmark.cjs
```

## Reproduktion nach Layout-Schema 2

Dieses historische Labor bleibt auf Layout-Schema 1. Seine Runner und Tests
verwenden jetzt die bereits vorhandene, hashgesicherte Warehouse-Baseline
`db39ffa` unter `tests/fixtures/warehouse-baseline.cjs`. Die damaligen Messdateien
bleiben unverändert. Sie bewerten keine neue Zonen-/Location-Historie; produktiv
bleiben vollständige, bestätigte Layout-Snapshots mit 20 Schritten maßgeblich.
