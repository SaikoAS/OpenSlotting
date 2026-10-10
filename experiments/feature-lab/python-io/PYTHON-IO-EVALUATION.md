# Python-IO: Ergebnisbewertung

Stand: 2026-10-04T10:18:41Z. Referenzprojekt 59525a447004396b47747f587c7ba14511357719. Vollständige Proben, Quellhashes und Umgebungswerte: [python-io.json](results/python-io.json).

## Was tatsächlich getestet wurde

Python 3.13.14 unter Windows-11-10.0.26200-SP0; SQLite der vorhandenen Python-Distribution: 3.50.4. Nur Standardbibliothek, keine Installation. SQLite bleibt eine **optionale** Werkzeugvariante; fehlendes sqlite3 ist kein Grund, weitere Pakete oder eine EXE einzuführen. Kein Pythonserver, keine Daten-API und keine Produktintegration.

Vier Formate auf zwei deterministischen UTF-8-Fixtures mit 1000/10000 Zeilen: CSV → positionsgebundene String-Zeilenarrays → JSON, NDJSON, NDJSON+gzip oder SQLite/TEXT. Doppelte Header, führende Nullen und Mengen außerhalb exakter JS-Number-Darstellung bleiben Texte. Jeder Datensatz behält rowIndex sowie physische sourceLine/sourceEndLine; mehrzeilige Quotes und leere Zeilen bleiben nachvollziehbar.

**Verlustlos ist die separat erhaltene Originalbyte-Datei**, inklusive Kodierung/BOM, Zeilenenden, Quotes und sämtlicher uninterpretierter Zeichen. Die zusätzliche Projektion ist streng dekodierter Text mit Positionen, nicht neu formatierte Original-CSV. Original und Projektion besitzen getrennte SHA-256-Werte. Noch keine Quellspalten-Interpretation, keine Zahlen-/Datumsnormalisierung, keine ERP-Zuordnung und kein vollständiger Workspaceparser. Eine Analyse wäre eine weitere abgeleitete Ebene, die diese Quelle weiter referenziert.

## Messung

Ein lokaler kompletter Lauf, eine ungemessene Aufwärmung und fünf Proben je Variante. Aufbau umfasst Originalbyte-Kopie, Original-SHA, striktes csv.reader, Projektion, eventuellen Index, Projektions-SHA und finale Verzeichnisumbenennung. Lesen und Filter verbrauchen sämtliche relevanten Zeilen; die ursprünglichen SHA-Prüfungen finden außerhalb dieser Zeitmessung statt. Originalbyte- und Vollzeilen-Digest-Gleichheit wurden separat zugesichert.

Filter ist die exakte rohe Quellposition 0 = `0000000017`: 10 Treffer bei 1000 und 100 bei 10000. JSON/NDJSON/gzip scannen; SQLite nutzt einen zusätzlichen TEXT-Index auf genau dieser Position. Unterschiedliche Zugriffsstrategie und Indexkosten sind damit sichtbar. Dieser Index ist kein semantisches Artikelfeld und gilt ausschließlich für die synthetischen Fixtures.

Keine Kontrolle kalter Datenträger-Caches oder reservierter CPUs. Windows-Dateicache ist wahrscheinlich warm. Kleine Unterschiede sind nicht belastbar; Ergebnisse belegen diesen Lauf und keine zugesagte Produktionstransferrate. Bytezahlen umfassen alle Dateien des finalen Bundles und auch die unkomprimierten Originalbytes.

**Speicher:** Peak Python in KiB stammt aus separater tracemalloc-Messung. Er enthält Python-Allokationen, **nicht** gesamte Prozess-RSS, native SQLite-/gzip-Puffer oder Betriebssystemcache. Er erlaubt deshalb keine vollständige Speichervergleichsaussage zwischen Python-, gzip- und SQLite-Implementierung.

| Zeilen | Format | Aufbau ms | Lesen ms | Filter ms | Projektionsbytes | Bundlebytes | Peak Python Aufbau KiB | Peak Python Lesen KiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | json | 40.40 | 1.20 | 1.15 | 156558 | 239700 | 732.0 | 974.2 |
| 1000 | ndjson | 17.25 | 2.04 | 1.91 | 156550 | 239696 | 680.6 | 47.2 |
| 1000 | ndjson-gzip | 19.77 | 2.32 | 2.22 | 18414 | 101568 | 606.1 | 167.1 |
| 1000 | sqlite | 17.34 | 2.17 | 0.42 | 163840 | 247039 | 687.7 | 13.0 |
| 10000 | json | 62.64 | 12.25 | 11.15 | 1603166 | 2438626 | 6847.9 | 9861.7 |
| 10000 | ndjson | 46.67 | 18.80 | 17.60 | 1603158 | 2438622 | 1039.8 | 55.1 |
| 10000 | ndjson-gzip | 104.31 | 21.20 | 19.44 | 178086 | 1013558 | 1037.5 | 333.4 |
| 10000 | sqlite | 55.52 | 18.45 | 0.73 | 1409024 | 2244541 | 1039.8 | 13.0 |

Referenz: ursprüngliche CSV direkt positionsgebunden und streng dekodieren, ohne zusätzliche Projektion oder Index. Das ist kein vollständiger OpenSlotting-Import mit Normalisierung/Profilbildung/Analyse.

| Zeilen | Originalbytes | CSV lesen ms | CSV filter ms | Peak Python Lesen KiB |
| --- | ---: | ---: | ---: | ---: |
| 1000 | 82568 | 1.16 | 1.02 | 60.7 |
| 10000 | 834884 | 10.47 | 8.78 | 60.6 |

## Bewertung

Bei 10000 Zeilen ist die direkte CSV-Sequenz mit 10.47 ms günstiger als die hier getesteten zusätzlichen Projektionen. JSON liest mit 12.25 ms schneller als NDJSON mit 18.80 ms; NDJSON benötigt dafür im separaten Read-Tracemalloc nur 55.1 statt 9861.7 KiB. Das ist eine Abwägung von Vollscan-Kosten und Python-Allokationen, kein allgemeiner Import-Speedup. gzip reduziert die 10000-Zeilen-Projektion um 88.9 %, das vollständige Bundle inklusive Originalquelle dagegen um 58.4 %.

- **JSON:** einfaches, weit kompatibles ganzes Dokument. Der Laborreferenzweg materialisiert alle Zeilen beim Schreiben und Lesen; deshalb wachsende Python-Allokationen. Kein automatisches Streaming in einem Browser durch das Format allein.
- **NDJSON:** geeignete Grundlage für sequenzielle Export-/Importpipelines und Fortschritts-/Zeilenanzeige. Export und Lesen können Datensatz für Datensatz arbeiten. Exakte Filtersuche scannt ohne separaten Index weiterhin die ganze Projektion. Ein einzelner sehr großer Datensatz begrenzt die Speichereinsparung.
- **NDJSON+gzip:** speichert die abgeleitete Projektion kleiner; kostet zusätzliche Kompression/Dekompression und verhindert direkten beliebigen Zeilenzugriff. Im getesteten Bundle bleiben Originalbytes unkomprimiert und vollständig erhalten. Eine kleine Projektion bedeutet daher nicht automatisch ebenso kleine Sicherung. gzip ist hier Standardbibliothek, kein neuer installierter Codec.
- **SQLite mit rowarray TEXT:** schneller gezielter Zugriff ist bei wiederholten Rohpositionsfiltern möglich, nachdem Tabellen und Index aufgebaut wurden. Es bleiben bewusst vollständige Stringarrays samt Quellenzeilen erhalten; keine Menge wird zu REAL konvertiert. Native Speicherkosten sind in tracemalloc nicht sichtbar. Schema, Indexwahl und weitere Positionsabfragen müssten jeweils neu bewertet werden.
- **Für OpenSlotting weiter untersuchen:** browserseitiges positionsgebundenes NDJSON als optionaler Export-/Importvertrag; gzip für große Projektionen/Sicherungen; SQLite als bewusst optionales lokales Python-Analysewerkzeug. Der heutige Server liefert ausschließlich Programmdateien: Ein neues Browser↔Python-Datenprotokoll wäre eine getrennte Projektentscheidung und wurde hier nicht eingeführt.

## Artefaktgrenze und offene Punkte

Ein vollständiger temporärer Ordner wird im selben Elternordner auf den finalen Zielnamen umbenannt; bestehende Ziele werden abgewiesen. Dadurch wird ein teilweise geschriebenes Paket nicht als fertig veröffentlicht. Es ist **keine vollständige Workspace-/Datenbanktransaktion**, kein Beweis für Crash-Durability und kein Schutz gegen gleichzeitig veränderte Quelldateien. Die Fixtures bleiben während des Aufbaus unverändert.

Vier schmale Tests bestanden, einschließlich 16 Format/Kodierungs-Kombinationen (UTF-8, Windows-1252, UTF-16 LE/BE mit BOM), Doppelheadern, Multiline-Quotes, großer Mengen als Strings, Quellenzeilen und abgewiesenen Artefakt-/Kodierungsfehlern. Kein vollständiger OpenSlotting-Restore, keine ERP-Akzeptanz, keine Datenschutz-/Firmenabnahme aus diesen Labortests abgeleitet.

Beim ersten SQLite-Test blieb nach einem inzwischen behobenen Testhandle-Fehler ein eigenes Verzeichnis mit vier synthetischen Dateien zurück: `C:\Users\saiko\AppData\Local\Temp\openslotting-python-io-test-dgk1mf8_`. Die automatische Toolprüfung lehnte seine geprüfte Löschung mit `blocked by policy` ohne konkretere Begründung ab. Es gab keinen weiteren Löschversuch; keine Betriebsdateien sind betroffen. Alle korrigierten Tests bereinigten ihre eigenen temporären Ausgaben normal.

## Reproduzieren

```powershell
python -B experiments/feature-lab/python-io/test_io_lab.py
python -B experiments/feature-lab/python-io/run_benchmarks.py
python -B experiments/feature-lab/python-io/write_evaluation.py
```

Weitere Läufe erst bei ruhender Browser-/Benchmarkarbeit. Vor Auswahl echte Größenverteilungen, ungewöhnlich große Felder, Datenkorruption, Abbruch/Wiederanlauf, Quoten, Zugriffsrechte, laufende Quelldateiänderungen und Browserunterstützung prüfen; keine Betriebsdaten ohne passende lokale Freigabe verwenden.
