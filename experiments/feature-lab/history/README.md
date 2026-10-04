# Editor-History-Labor

**Getrennte Varianten; kein Einbau in den Editor oder die Datenbank.**

Messwerte und Entscheidung: [HISTORY-EVALUATION.md](HISTORY-EVALUATION.md).

Das Labor vergleicht die tatsächlich vorhandene JSON-Snapshot-History mit
Objekt-ID-gebundenen Deltas. Der aktuelle Editor begrenzt beide Stacks auf
**20 Einträge**. Er speichert die Historie erst nach erfolgreichem `save`.
Lock-Toggles erzeugen keine Einträge; Undo/Redo übernehmen aktuelle Sperren
und können durch `lockedEditConflict` blockiert werden. Diese Regeln werden
beibehalten, nicht durch neue Command-/Lock-Semantik ersetzt.

```powershell
node --test experiments/feature-lab/history/tests.test.cjs
node --expose-gc experiments/feature-lab/history/benchmark.cjs
```

Node bleibt ausschließlich Entwicklungswerkzeug. Der Benchmark arbeitet
mit 150 erlaubten Lagerobjekten, 50 bestätigten synthetischen Bearbeitungen,
20 Undo und 20 Redo; keine Betriebsdaten und keine echte Persistenz.

Die Deltas enthalten Rootfelder, genaue Objekt-ID-Reihenfolge vor/nach der
Änderung, vollständige Vorher-/Nachherbilder der geänderten Objekte und
Objektauswahl vor/nachher. Unveränderte Objekte werden bei der Rekonstruktion
aus dem aktuellen Layout übernommen. Die ursprüngliche
`warehouse.normalizeLayout`- und `warehouse.lockedEditConflict`-Prüfung
bleibt vor jedem bestätigten Zustand aktiv. Für Speicherbewertungen wird die
vollständig serialisierte gehaltene History in Bytes gezählt, getrennt von
GC-abhängigen Heap-/RSS-Werten.

Die Controllerlogik bildet den aktuellen `warehouse-editor.js`-Commitvertrag
nach. Sie ist **kein ausgeführter DOM-Test des tatsächlichen Editors**.
Tests prüfen Layout und Auswahl für Move, Reorder, Duplicate, Delete, Resize,
Codeedit, Sperren, Undo/Redo, neue Bearbeitung nach Undo, Workspacewechsel,
fehlgeschlagene Speicherung, ausstehende Speicherung und Validierungsgrenzen.
