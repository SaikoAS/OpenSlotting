# Import, Export und Quellspalten im getrennten Labor

Status: **Experimente ohne Einbindung in die Anwendung**. Referenz ist der
aktuelle Projektstand `59525a4`. Fachmodule im Projektwurzelordner werden nur
gelesen. Dieses Labor startet keinen Datenserver, installiert nichts und liest
keine Betriebsdateien oder Browserdatenbanken.

## Ausführen

Vorhandenes Node ist ausschließlich ein Entwicklerwerkzeug; Python bleibt die
einzige zusätzliche Voraussetzung für Nutzer von OpenSlotting.

```powershell
node --test experiments/feature-lab/io/tests/io.test.cjs
node experiments/feature-lab/io/benchmarks/run.cjs
```

Der zweite Befehl erzeugt 36 Messreihen für 1.000, 10.000 und 50.000 Records:
jeweils ein Warmup und fünf Samples in einem eigenen Prozess pro Methode und
Größe. Andere Größen: `node experiments/feature-lab/io/benchmarks/run.cjs 2000,20000`.
Das Ergebnis liegt in `results/node-io.json` und wird bei erneutem Lauf ersetzt.

## Dateien und Schnittstellen

| Modul | Varianten / Vertrag |
| --- | --- |
| `modules/imports.cjs` | `importBytes(bytes, {variant, mapping, ...bestehendeImportOptionen})` → `{result, encoding, prepareMs}`; Varianten `baseline-64k`, `chunk-256k`, `adaptive`, `eager` |
| `modules/exports.cjs` | `terminalChunks(lines, columns, valueForColumn, {chunkRows})` und `analysisChunks(articles, {chunkRows, delimiter})` liefern Generatoren; `collectUtf8` materialisiert, `hashUtf8` modelliert einen inkrementellen Sink |
| `modules/interpretation.cjs` | `suggestByRules(catalog, sourceType)` / `suggestWithProfiles(catalog, sourceType, {topK, profileIsSample})` liefern je Zielfeld Vorschläge, Gründe, Positionsidentität und Unsicherheit; keine automatische Anwendung |
| `fixtures/interpretation-ground-truth.cjs` | unabhängig festgelegte Eingaben und Positionslabels, inklusive mehrdeutiger Spalten und bewusst nicht ableitbarer Fachsemantik |
| `benchmarks/fixtures.cjs` | synthetische UTF-8-Import-/Exportdaten mit doppelten Headers, Fehlern, Regeln und Provenienz |
| `tests/io.test.cjs` | vollständige Ergebnisgleichheit, Encoding/Quotes, Quellspalten, Fach-/Sicherheitsgrenzen |

Ein Vorschlag referenziert eine Spalte immer über **`sourceFileId` und
`position`**, ergänzt durch `occurrence` und `header`. Gleiche Namen werden nicht
zu einem Objektschlüssel zusammengeführt. Positionszahlen sind nullbasiert.

Die Generatoren sind derzeit Node-Laboradapter. Vor einer Browserübernahme
wäre der Sink z.B. durch TextEncoder/Dateistream zu ersetzen und der tatsächliche
Edge-Download separat zu prüfen. Die gemessenen SHA-256-Sinks schreiben keine
Datei; sie verhindern, dass ein erzeugter Export im Benchmark ungenutzt bleibt.

Weitere Ergebnisse und Import-/Exportoptionen:
[IO-EVALUATION.md](IO-EVALUATION.md).
