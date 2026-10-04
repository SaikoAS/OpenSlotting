# Bewertung: Import, Export und Quellspalten

Stand: 2026-10-04, Ausgangscommit `59525a4`. Alle Entwürfe liegen nur in diesem
Labor. `csv.js`, `encoding.js`, `terminal.js`, `workspace.js`, der
Anwendungscontroller und die Workspace-Datenbank wurden dafür nicht geändert.

## Ergebnis und Auswahl

1. **Import:** Die vorhandene Streaming-Normalisierung bleibt die Referenz.
   Andere Chunkgrößen helfen bei 10.000 Zeilen, liefern bei 50.000 Zeilen
   keinen stabilen Vorsprung. Ein Volltext-Import ist hier langsamer.
2. **Export:** Ein CSV-Generator ist sinnvoll als Grundlage für einen
   Dateistream. Der Terminal-Prototyp ist bei 50.000 Zeilen rund 11 % schneller.
   Analyse-CSV mit 32er-Batches gewinnt nur rund 2 %; das reicht noch nicht für
   eine belastbare Geschwindigkeitsentscheidung. Bytegleichheit ist bewiesen.
3. **Quellspalten:** Profilgestützte, erklärbare Top-K-Vorschläge erkennen
   Typkonflikte besser. Sie lösen keine unsichtbare Fachsemantik. Nutzer müssen
   jedes Mapping bestätigen; ein gespeicherter Quellvertrag wäre der nächste
   getrennte Entwurf.

**Annahme:** Ergebnisse sollen zunächst auf identischem Fach- und
Dateivertrag vergleichbar sein. Deshalb wird keine Mengenregel, kein
Filterstandard und keine fachliche Datumsauslegung verändert.

## Was wurde wirklich verglichen?

### Import

Die Baseline ruft tatsächlich
`encoding.decodeBufferChunksDetailed(bytes, 'auto', {chunkSize: 65536})`
und `csv.importCsvStreamingChunks(...)` auf. Alle Alternativen verwenden
denselben vorhandenen Importkernel, nicht einen verkürzten Ersatzparser:

| Variante | Veränderung | Kosten / Nutzen |
| --- | --- | --- |
| `baseline-64k` | bestehende 64-KiB-Zufuhr | echte aktuelle Referenz |
| `chunk-256k` | 256-KiB-Zufuhr | weniger Decoder-/Parseraufrufe, größere temporäre Strings |
| `adaptive` | 16..512 KiB nach physischer Zeilendichte, Ziel 2048 LF/Chunk | zusätzlicher Zeichenscan; LF ist ausdrücklich kein CSV-Recordtrenner |
| `eager` | ganze Datei zuerst dekodieren, ein Parserchunk | zweiter vollständiger Text im Speicher möglich; keine neue Fachlogik |

Ein einziger zustandsbehafteter Decoder behält Zeichen über Bytegrenzen. Quotes,
mehrzeilige Zellen und physische Quellzeilen bleiben Aufgabe des echten Parsers.
Automatische Encoding-Erkennung prüft weiterhin die komplette Bytefolge. Auch
der bestehende Weg hält Originalbytes und normalisierte Ergebnisse: Streaming
der Decoderzufuhr bedeutet derzeit **keinen konstanten Gesamtspeicher**.

### Export

Die Baselines sind tatsächlich `terminal.exportLinesCsv(...)` und
`csv.exportAnalysisCsv(...)` plus UTF-8-Encoding und SHA-256-Sink.

| Variante | Veränderung | Vertrag |
| --- | --- | --- |
| `baseline` | ein vollständiger CSV-String, dann Bytes | aktueller Export |
| `sink-32` | Generator mit 32 Records/Chunk, sofortiger Sink | kein gesamter Ergebnisstring/-buffer im Adapter |
| `sink-512` | Generator mit 512 Records/Chunk, sofortiger Sink | größere, seltener erzeugte Chunks |
| `collect-512` | gleiche Chunks, danach `Buffer.concat` | bewusst vollständiges Ergebnis; zeigt Kopier-/Sammelkosten |

Terminal-CSV verwendet dieselbe kleine Zellschutzregel wie die Baseline und
erhält BOM, CRLF, Semikolon, Quotes, führende Formelzeichen und numerische
Ausnahmen. Analyse-CSV ruft den vorhandenen Fachserializer für jeden Batch
auf und entfernt ausschließlich die wiederholte Kopfzeile. BigInt-Skalierung,
exakter Verkaufswert, verschachtelte Customfields und Quelltextschutz bleiben
damit im vorhandenen Serializer. Die Tests vergleichen die **ganze Bytefolge**,
die Messungen zusätzlich den ganzen SHA-256-Digest und die Bytezahl.

## Messmethode und Rohdaten

[Vollständige JSON-Messreihen](results/node-io.json), 36 Methoden-/Größenpaare.
Windows, Node `v24.18.1`, Intel Core i9-12900F. Synthetische Daten, ein Warmup und
fünf Samples. Pro Variante/Größe startet ein eigener Prozess. Die Reihenfolge
wird über Größen rotiert. Fixtureaufbau, vorbereitende Analyse, Prozessstart,
Garbage Collection und Gleichheitsprüfungen liegen außerhalb der gemessenen
Operation. UTF-8-Encoding und derselbe SHA-Sink liegen bei allen Exportvarianten
innerhalb. Encoding-Erkennung/Volltextdekodierung des Imports liegen innerhalb
und werden als Vorverarbeitung separat ausgewiesen.

Das ist eine **Node-Maschinenmessung**, keine Edge-Bedienprüfung. Dateiauswahl,
Datenträger, Dateisystemrechte, Workerübergabe, UI-Fortschritt und IndexedDB/OPFS
werden hier nicht mitgemessen. Die getrennten Prozesse werden nicht auf einen
exklusiven Prozessorkern festgelegt; Betriebssystem-/Hintergrundlast und JIT/GC
bleiben Einflüsse. Fünf Samples begründen keine statistische Signifikanz.

### Import: Gesamtzeit in ms, Median

| Records | 64 KiB | 256 KiB | adaptiv | Volltext |
| ---: | ---: | ---: | ---: | ---: |
| 1.000 | 23,07 | 26,89 | 30,02 | 26,54 |
| 10.000 | 212,52 | 191,50 | 197,58 | 206,91 |
| 50.000 | 927,85 | 939,83 | 940,64 | 1075,93 |

50.000 Records = 5.448.039 UTF-8-Bytes. Jede Variante liefert identisch
46.931 gültige, 2.941 ungültige und 128 explizit gefilterte Rows plus alle
Hinweise, Quellzeilen, Mappings, Raw-/Prepared-Profile und Customfields.

| Variante bei 50.000 | Vorverarbeitung ms | restliche Verarbeitung ms | Samples gesamt min..max ms | Spitzen-RSS MiB |
| --- | ---: | ---: | ---: | ---: |
| 64 KiB | 27,03 | 900,82 | 913,4..946,7 | 299,1 |
| 256 KiB | 26,00 | 915,09 | 918,8..953,8 | 354,0 |
| adaptiv | 26,53 | 911,92 | 928,0..979,3 | 353,6 |
| Volltext | 29,66 | 1046,27 | 937,3..1132,2 | 309,4 |

Spitzen-RSS gilt für den **gesamten Kindprozess**, einschließlich Datenaufbau,
Referenzresultat, warmem Lauf und Vertragsprüfungen. Das ist kein isoliertes
Modulbudget. Vorverarbeitungs- und Restmediane werden separat berechnet und
müssen sich deshalb mathematisch nicht exakt zum Gesamtmedian addieren.

### Exporte: Gesamtzeit in ms, Median

| Typ / Records | Baseline | Sink 32 | Sink 512 | Sammeln 512 |
| --- | ---: | ---: | ---: | ---: |
| Terminal / 1.000 | 1,95 | 2,24 | 1,34 | 1,35 |
| Terminal / 10.000 | 12,07 | 9,79 | 10,20 | 11,60 |
| Terminal / 50.000 | 56,70 | 50,33 | 52,83 | 54,23 |
| Analyse / 1.000 | 4,18 | 4,05 | 4,27 | 4,40 |
| Analyse / 10.000 | 38,96 | 36,09 | 39,71 | 40,16 |
| Analyse / 50.000 | 178,67 | 174,78 | 182,91 | 187,74 |

50.000 Terminalrecords erzeugen 4.207.549 Bytes, Analyseartikel
9.170.168 Bytes. Terminal 32er-Sink: 48,3..50,7 ms gegen Baseline
55,5..65,3 ms. Analyse 32er-Sink: 171,3..177,5 ms gegen Baseline
176,8..183,8 ms; diese geringe Differenz ist keine Integrationsfreigabe.

Spitzen-RSS bei 50.000: Terminal Baseline 339,4 MiB, Sink32 331,1 MiB;
Analyse Baseline 386,8 MiB, Sink32 362,0 MiB. Der große Fixture-/Analyseaufbau
und Referenzexport sind darin enthalten. Die Werte beweisen keine entsprechende
Browser-Speicherersparnis. Der inkrementelle Adapter vermeidet nachprüfbar den
ganzen CSV-Ausgabebuffer; für einen tatsächlichen Download braucht es einen
Dateistream-Sink und eine eigene Peak-Memory-Messung.

## Quellspalten-Interpretations-Engine

### Aufbau

1. **Unveränderte Quelle:** Bytes, Encoding, Dateikennung und physische Quellzeile
   behalten. Original und vorbereitete Werte getrennt ausweisen.
2. **Positionskatalog:** `(sourceFileId, position)` als Identität, Originalheader,
   normalisierter Header und Vorkommen behalten. Zwei Spalten `Menge` bleiben zwei.
3. **Profil:** Leeranteil, Zahlen-/Datumsformate, Beispiele und begrenzte
   Häufigkeiten verwenden. Stichproben ausdrücklich kennzeichnen. Führende Nullen
   in IDs bleiben Text; numerische Kompatibilität macht eine ID nicht zur Menge.
4. **Kandidaten:** echte vorhandene Alias-/Tokenregeln plus separat sichtbare
   Profilunterstützung. Hier +25 für passende Zahl-/Datumsformate bei nicht exakt
   erkanntem Header, -55 bei weniger als 80 % Typkompatibilität. Keine
   Wahrscheinlichkeiten, sondern deterministische Rangpunkte.
5. **Unsicherheit:** Rang <90, Abstand <15, Gleichstände, leerer Befund oder
   fehlende semantische Headerevidenz bleiben Prüffälle. Top-K statt erzwungenem
   Komplettmapping, alle Alternativen mit Gründen und Positionsidentität.
6. **Bestätigung:** `requiresUserConfirmation: true`,
   `automaticApplicationSafe: false` auch bei starken Vorschlägen. Eine zukünftige
   Version kann ausdrücklich bestätigte, versionierte Quellverträge anbieten und
   Schemaabweichungen erneut zur Prüfung geben. Dieser Teil ist noch kein Modul.

**Wichtige Grenze:** Der Name `Menge` und gültige Zahlen beweisen nicht, ob eine
Spalte Bestandsmenge, Auftragsmenge, Gesamtmenge oder Colli enthält. Das gilt auch
für Datum, netto/brutto und Korrektur-/Gutschriftkennzeichen. Dafür braucht es
einen bestätigten Quellvertrag; keine Interpretation erfindet ERP-Regeln.

### Qualitätsvergleich

Ground Truth steht getrennt in
`fixtures/interpretation-ground-truth.cjs`: acht absichtlich schwierige Fälle,
18 ausgewertete Feldentscheidungen, davon elf fachlich bekannte Positionen und
sieben ohne gesicherte Auswahl. Labels werden nicht aus Scoring abgeleitet.

"Definitiv" bedeutet in der Auswertung nur, dass ein Verfahren seinen eigenen
starken Vorschlag liefern würde. Auch solche Vorschläge werden im neuen Modul
nie angewendet. Precision = korrekte starke Vorschläge / alle starken Vorschläge;
Recall = korrekte starke Vorschläge / elf bekannte Ziele; Abstention = Prüffälle /
18. Top-1-Treffer betrachten zusätzlich den ersten Rang auch bei Unsicherheit.

| Verfahren | Precision | Recall | Prüffälle | Top-1 bei bekannten Zielen | Falsche starke Vorschläge |
| --- | ---: | ---: | ---: | ---: | ---: |
| vorhandene Vorschläge mit Profil | 63,6 % | 63,6 % | 38,9 % | 81,8 % | 4 |
| exakte deterministische Aliase | 63,6 % | 63,6 % | 38,9 % | 63,6 % | 4 |
| erklärbares Profil-Top-K | 84,6 % | 100 % | 27,8 % | 100 % | 2 |

Die zwei falschen starken Profilvorschläge stammen aus einem bewusst enthaltenen
Gegenbeispiel: vollständig gültige Werte unter `Menge`/`Datum`, obwohl der
Quellvertrag Bestand/Rechnungsdatum meint. Alle Verfahren können das aus den
Zellen nicht erkennen. Diese kleine Challenge-Suite ist kein Schätzer einer
ERP-Erfolgsquote und die Rangpunkte sind keine kalibrierte Konfidenz.

### Profilkosten separat in ms, Median

| Records / zehn Spalten | vollständiges Profil erstellen | Aliasscoring | Profil-Top-K-Scoring |
| --- | ---: | ---: | ---: |
| 1.000 | 7,06 | 1,50 | 1,60 |
| 10.000 | 68,33 | 1,37 | 1,35 |
| 50.000 | 327,15 | 1,23 | 1,27 |

Das vorhandene Importresultat enthält schon Profile. Wiederverwendung vermeidet
diesen zusätzlichen Dateidurchlauf. Frühe Vorschläge aus einer Stichprobe können
die UI früher nutzbar machen, müssen nach Vollprofil erneut geprüft werden;
Stichprobenlauf und Übernahme bestätigter Vorlagen wurden hier nicht gebenchmarkt.

## Weitere Import-/Exportmöglichkeiten

| Möglichkeit | Stand / Datenschutz und Aufwand |
| --- | --- |
| CSV / TSV mit explizitem Dialekt | vorhandener CSV-Kernel unterstützt einen einstellbaren Einzeichen-Trenner; die Labortests fokussieren aktuellen Semikolonvertrag. Encoding, Quotes und Spaltenpositionen sichtbar halten |
| Browser-Dateistream / OPFS-Rohquelle | nächster Adapter um unveränderten Parser; Rawbytes separat behalten, Backpressure/Abbruch/Encoding-Erkennung vollständig klären. Vollständige Dateistream-Importmessung steht aus |
| Transfer in statischen, wiederverwendeten Worker | mit Localhost einfacher feste Modulpfade; vorhandenes Worker-Labor ist separater Nachweis. Fach- und Decoderresultate bleiben gleich |
| CSV-Generator zum bestätigten Dateistream | hier vorbereitet; Browser-Dateirechte, partielle Datei bei Abbruch und Edge-Bedienpfad noch offen. Lokaler Schreibzugriff wird ausdrücklich vom Nutzer gewählt |
| Bestehende Workspace-JSON-Sicherung | aktueller verlustloser Vertrag inklusive Originalbytes und BigInt-Kodierung; Parser/Migration weiter prüfen. Kompression gehört zum vorhandenen separaten Sicherungslabor |
| Versioniertes NDJSON für einzelne Records | denkbar für inkrementelle Übertragung/Analyse; explizite BigInt-/Dezimal-/Provenienz-Tags nötig. Noch kein Ersatz des Workspaceformats, nicht implementiert/gemessen |
| Originaldatei wieder ausgeben | vorhandene unveränderte Rawbytes sind die verlustlose Referenz. CSV nach Normalisierung kann sie nicht rekonstruieren; Quellexport und Analyseexport müssen benannt werden |
| XLSX | Office-Datei ist kein CSV. ZIP/XML ist mit Python-Standardbibliothek technisch bearbeitbar, aber Sharedstrings, Zelltypen, Datumsserien, Styles und Formeln brauchen einen eigenständigen, getesteten Importvertrag. Kein Paket installiert, kein XLSX-Prototyp/Benchmark behauptet |
| Parquet / Arrow | mögliches spätes Analyseformat, derzeit kein Standardbibliotheks-/Browseradapter im Projekt; zusätzliche Formate und Abhängigkeiten widersprechen dem aktuellen einfachen Betriebspfad. Nicht implementiert/gemessen |
| Python als lokales Import-/Datenbackend | würde Rohdaten aus dem Browser in einen neuen Prozess-/Serververtrag bringen. Der aktuelle Server bleibt statisch. Nicht in diesem Labor eingeführt |

Localhost erleichtert statische Modul-Worker und capability-geprüfte sichere
Browserfunktionen. Chunking, Generatoren und deterministische Profilregeln waren
grundsätzlich auch vorher möglich; sie werden nicht als exklusiv neue
Localhost-Fähigkeiten dargestellt.

## Testabdeckung und offene Punkte

**11 Laborprüfungen bestanden:** vollständige Importpayload statt nur Counts,
raw/prepared Profile, Quellfilter, Aufbereitung, typisierte Customfields,
Artikelstammkonflikte, UTF-8/UTF-16LE/BE/Windows-1252, große Multiline-Quotes,
Fehler-/Negativmengenkontrakt, führende Nullen, sehr große exakte BigInt,
Formel-/CSV-Sicherheit, Bytegleichheit beider Exporte, leere Eingaben,
duplizierte Headers, Unsicherheit, unbekannte/leer/fachlich täuschende Quellen.

Eine Firmenfreigabe, reale ERP-Vielfalt, XLSX/Parquet-Tests,
Browser-Download-/Abbruchtests, Webworker-/Speicherkosten und unternehmensseitige
Dateirechte sind keine Ergebnisse dieser Reihe. Vor Auswahl einer Integration
sind reale, freigegebene Exportbeispiele und vollständige Edge-Abläufe nötig.
