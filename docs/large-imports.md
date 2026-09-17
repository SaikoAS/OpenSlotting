# Große CSV-Importe

OpenSlotting verarbeitet CSV-Quellen weiterhin vollständig offline im Browser.
Der Importpfad dekodiert und parst die Quellbytes jetzt in begrenzten Chunks;
der Parser behält nur den aktuellen Datensatz, Quote-Zustand und Zeilennummern.
Normalisierte Zeilen werden während des Parsens aufgebaut, statt zuerst eine
zweite vollständige Liste aller Parserzeilen oder einen vollständigen
dekodierten Quelltext zu behalten. Die Quellbytes bleiben für Wiederöffnung,
Mapping-Änderungen und die Quellzeilen-Nachvollziehbarkeit erhalten; dekodierter
Text und Parserzeilen werden nach der Vorbereitung verworfen. Auch das
Zusammenführen eines Batches kopiert normalisierte Zeilen nur noch dann, wenn
die Provenienz ergänzt werden muss.

Damit bleiben insbesondere diese Eigenschaften erhalten:

- jede gültige Zeile wird genau einmal normalisiert und gezählt;
- `source_file_id`, `source_file_name`, `source_file_label` und `source_line`
  bleiben an den kompakten Ergebniszeilen erhalten;
- Originale Quellfelder werden bei Bedarf aus Quellbytes und Quellzeile rekonstruiert,
  statt in jeder Ergebniszeile doppelt gespeichert zu werden;
- Mengen werden weiterhin als skalierte Ganzzahlen verarbeitet;
- die ursprünglichen Quelldateien werden nicht an einen Dienst übertragen.

## Chunked Workspace-Persistenz

Beim Speichern werden Quellen, Originalbytes, normalisierte Zeilen und
Validierungshinweise getrennt abgelegt. Zeilen und Hinweise werden in stabilen
Chunks mit höchstens 5.000 Einträgen gespeichert. Änderungen an Sprache,
Perioden oder Workspace-Namen schreiben deshalb nur Metadaten; unveränderte
Quelldaten und Chunks bleiben bestehen. Ein einzelner IndexedDB-Read/Write-
Vorgang umfasst weiterhin Manifest, Metadaten und alle betroffenen Chunks, so
dass Quota- und Absturzfehler keine halbfertige Workspace-Version hinterlassen.

Der Persistenz-Benchmark kann mit synthetischen Daten wiederholt werden:

```text
node tools/benchmark-workspace-storage.cjs 50000
```

Die Messung weist die Chunk-Anzahl, die größte einzelne Chunk-Größe, die
Wiederherstellungszeilen und `metadataOnlyPayloadUnchanged: true` aus. Bei
50.000 Zeilen entstehen zehn Zeilen-Chunks; ein Perioden-/Sprach-Update lässt
die Payload-Stores unverändert. Die Messung ist ein reproduzierbarer Node-
Vergleich und kein Nachweis der manuellen Microsoft-Edge-Akzeptanz.

## Reproduzierbare synthetische Messung

Die Messung erzeugt keine Datei und verwendet keine Betriebsdaten. Sie gibt
zusätzlich die vom Betriebssystem gemeldete maximale RSS-Nutzung über
`process.resourceUsage().maxRSS` sowie Momentaufnahmen je Verarbeitungsschritt
aus:

```text
node --expose-gc --max-old-space-size=4096 tools/benchmark-large-import.cjs 700000 chunked
node --expose-gc --max-old-space-size=4096 tools/benchmark-large-import.cjs 700000 baseline
```

Das Programm meldet Modus, Quellgröße, exakte Zeilenzahlen, Import-/Analysezeit
und den aktuellen sowie den maximal gemessenen Node-Speicherstand. Der
`chunked`-Modus dekodiert und parst inkrementell; `baseline` dekodiert den
vollständigen Quelltext vor dem Parsen. Beide Läufe müssen in getrennten
Prozessen ausgeführt und anhand von `memory.peakRssMb` verglichen werden. Das
ist ein reproduzierbarer Node-Vergleich, kein Nachweis der manuellen
Microsoft-Edge-Akzeptanz. Die Edge-Prüfung bleibt ein eigener Abnahmeschritt
mit einer realistischen Datei- und Spaltenbreite.

Die Analyse verwendet während der Normalisierung einen inkrementellen
Accumulator. `timingsMs.analyzeIncremental` misst dessen Abschluss; der
zusätzliche `analyzeBatchCompatibility`-Wert zeigt separat die weiterhin
verfügbare Kompatibilitätsberechnung über `analyzeRows()`.

Beispielmessung mit 700.000 schmalen Zeilen auf dem Entwicklungsrechner:
Der inkrementelle Analyseabschluss lag bei rund 8 ms; der separate
Kompatibilitätsdurchlauf über `analyzeRows()` benötigte rund 578 ms. Die
Spitzen-RSS lag in diesem Lauf bei 576,1 MB im `chunked`- und 526,5 MB im
`baseline`-Modus. RSS hängt stark von Node-Version, Garbage Collection,
Betriebssystem und Ergebnisbreite ab; der belastbare Vorteil dieses Issues ist
die vermiedene redundante Analysepassage.

Die frühere Messung auf dem Entwicklungsrechner mit 700.000 schmalen, gültigen
Zeilen reduzierte den Spitzenbedarf der normalisierten Zeilen von 830,9 MB
(Schema mit Raw-Arrays) auf 577,1 MB RSS (kompakte Zeilen, rund 30 % weniger).
Die Messung wurde jeweils mit demselben Benchmark und Commit-Vergleich
wiederholt.

Der reguläre Testlauf enthält zusätzlich einen 130.000-Zeilen-Test, der die
Zeilenzählung, Provenienz und das stack-sichere Zusammenführen prüft. Die
700.000-Zeilen-Messung bleibt bewusst ein expliziter Benchmark und belastet
nicht jeden normalen Testlauf.
