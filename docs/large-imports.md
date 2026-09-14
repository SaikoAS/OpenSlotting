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
  bleiben an den Ergebniszeilen erhalten;
- Mengen werden weiterhin als skalierte Ganzzahlen verarbeitet;
- die ursprünglichen Quelldateien werden nicht an einen Dienst übertragen.

## Reproduzierbare synthetische Messung

Die Messung erzeugt keine Datei und verwendet keine Betriebsdaten:

```text
node --expose-gc --max-old-space-size=4096 tools/benchmark-large-import.cjs 700000
```

Das Programm meldet Quellgröße, exakte Zeilenzahlen, Import-/Analysezeit und
den Node-Speicherstand. Eine Messung auf dem Entwicklungsrechner mit 700.000
schmalen, gültigen Zeilen reduzierte den Spitzenbedarf des bisherigen
Parser- plus Normalisierungspfads von ungefähr 944 MB auf ungefähr 777 MB RSS.
Das ist ein reproduzierbarer Node-Vergleich, kein Nachweis der manuellen
Microsoft-Edge-Akzeptanz. Die Edge-Prüfung bleibt ein eigener Abnahmeschritt
mit einer realistischen Datei- und Spaltenbreite.

Der reguläre Testlauf enthält zusätzlich einen 130.000-Zeilen-Test, der die
Zeilenzählung, Provenienz und das stack-sichere Zusammenführen prüft. Die
700.000-Zeilen-Messung bleibt bewusst ein expliziter Benchmark und belastet
nicht jeden normalen Testlauf.
