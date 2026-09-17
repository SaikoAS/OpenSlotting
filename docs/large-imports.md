# Große CSV-Importe

OpenSlotting verarbeitet CSV-Quellen weiterhin vollständig offline im Browser.
Der Importpfad baut die normalisierten Zeilen während des Parsens auf, statt
zuerst eine zweite vollständige Liste aller Parserzeilen zu behalten. Die
Quellbytes bleiben für Wiederöffnung, Mapping-Änderungen und die
Quellzeilen-Nachvollziehbarkeit erhalten; dekodierter Text und Parserzeilen
werden nach der Vorbereitung verworfen. Auch das Zusammenführen eines Batches
kopiert normalisierte Zeilen nur noch dann, wenn die Provenienz ergänzt werden
muss.

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
node --expose-gc --max-old-space-size=4096 tools/benchmark-large-import.cjs 700000
```

Das Programm meldet Quellgröße, exakte Zeilenzahlen, Import-/Analysezeit und
den aktuellen sowie den maximal gemessenen Node-Speicherstand. Eine Messung auf
dem Entwicklungsrechner mit 700.000 schmalen, gültigen Zeilen reduzierte den
Spitzenbedarf der normalisierten Zeilen von 830,9 MB (Schema mit Raw-Arrays) auf
577,1 MB RSS (kompakte Zeilen, rund 30 % weniger). Die Messung wurde jeweils
mit demselben Benchmark und Commit-Vergleich wiederholt. Das ist ein
reproduzierbarer Node-Vergleich, kein Nachweis der manuellen
Microsoft-Edge-Akzeptanz. Die Edge-Prüfung bleibt ein eigener Abnahmeschritt
mit einer realistischen Datei- und Spaltenbreite.

Der reguläre Testlauf enthält zusätzlich einen 130.000-Zeilen-Test, der die
Zeilenzählung, Provenienz und das stack-sichere Zusammenführen prüft. Die
700.000-Zeilen-Messung bleibt bewusst ein expliziter Benchmark und belastet
nicht jeden normalen Testlauf.
