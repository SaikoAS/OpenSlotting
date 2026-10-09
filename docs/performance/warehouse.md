# Lagerprüfung und CPU-Projektion

Verglichen wurden die tatsächlichen Produktionsdateien aus Commit `db39ffaca31ebeddec884413c38725f4fd38a5a0` mit den überarbeiteten Produktionsfunktionen. Die unveränderten Referenzen liegen ausschließlich in `tests/fixtures/warehouse-*-baseline.cjs`; SHA-256 nach einheitlichen LF-Zeilenenden sichert ihre Identität für Windows und CI. Vollständige Proben und Quellhashes: [warehouse.json](results/warehouse.json).

## Änderungen

- `warehouse.js`: Grundrisse und SAT-Achsen einmal pro Prüfung vorberechnen. Gleiche Achsenfolge, Projektionsarithmetik und Kontaktgrenze von 0,001 mm. Sweep wählt X oder Z nach geringerem Kandidatenumfang; kleine und dichte Layouts verwenden vorbereitete Paare ohne Kandidatenlisten. Die Ausgabe behält ursprüngliche Objektpaarreihenfolge und fachliche Kollisionskategorien. Keine dauerhaften Geometriecaches oder neuen Revisionen.
- `warehouse-webgl.js`: passend große Float32-Puffer direkt schreiben, Zwischenarrays mit JS-Zahlen vermeiden, Kameratrigonometrie und Objektrotationen/Farben nur innerhalb eines Frames wiederverwenden. Opaque-/Transparenz-/Edge-/Grid-Reihenfolge, PickMap und Framing bleiben identisch. Drawaufrufe und Shader wurden nicht geändert.

Boxaufbau und Editor-Historie bleiben erhalten: der geprüfte Inhalts-Cache war teurer als `buildBoxes`; ohne ausdrückliche Entwurfrevision wäre ein dauerhafter Cache anfällig für Änderungen am gleichen Objekt. Die geprüften Undo-Deltas benötigten weniger gespeichertes JSON, aber längere vollständige Edit-/Undo-/Redo-Läufe. Langsamere Varianten wurden nicht übernommen. Sperren, Codes, Auswahl, bestätigtes Speichern und die Grenze von 20 Historieneinträgen bleiben unverändert.

## Gemessener Vergleich

Node 24.18.1, Windows, Intel Core i9-12900F. Zwei Aufwärmungen, sieben Proben, wechselnde Reihenfolge; Tabelle: Median in ms, sämtliche Vorbereitungs-/Allokationskosten der Funktionsaufrufe enthalten. Synthetische gültige Layouts, keine Betriebsdaten. Während dieses Laufs waren die anderen Agent-Benchmarks pausiert. Datenträger-/GPU-/Browser-FPS sind nicht Bestandteil dieser CPU-Messung.

| Fall | Bisher | Überarbeitet |
| --- | ---: | ---: |
| Kollisionen: 150 räumlich verteilte Objekte | 3,624 | 0,123 |
| Kollisionen: 150 vertikal angeordnete Objekte | 4,125 | 0,139 |
| Kollisionen: 150 dicht überlappende Objekte | 11,034 | 1,314 |
| CPU-Projektion: 150 Objekte / 675 Stellplätze | 27,682 | 7,731 |
| CPU-Projektion: 150 Objekte / 5000 Stellplätze | 96,593 | 30,750 |

Die heutigen Höchstwerte **150 Objekte und 5000 Stellplätze** gelten unverändert. Selbst der überarbeitete 5000-Stellplatz-Fall benötigt hier mehr als das 16,7-ms-Budget für 60 FPS: Es wird keine 60-FPS- oder GPU-Zusage aus diesen Ergebnissen abgeleitet. Float32-Ausgabepuffer haben exakt gleiche Bytes. Im ersten JSON steht ausschließlich der kumulative Gesamtprozess-RSS; der folgende separate Vergleich misst den Prozesspeak je Variante.

## Großer gültiger Geometriefall und Speicher

5000 Stellplätze bestimmen die Boxenzahl nicht allein. Ein zweiter gültiger
Fall mit 150 Fachbodenregalen, je 30 Feldern und insgesamt 5000 Ebenen mit
je einer Position und einem Deck erzeugt **38.600 opaque Boxen**. Die erste
5000-Stellplatz-Messung verwendete 8903 Boxen und ist keine Geometrie-Obergrenze.
Der zusätzliche Fall ist ebenfalls keine behauptete vollständige Obergrenze
für jede zulässige Objekt-/Transparenzkombination.

Je Variante lief ein eigener Node-Prozess mit `--expose-gc`, einem Warmup und
drei Proben. Explizite GC vor/nach jeder Probe; Zeitwerte schließen GC aus.
Die vorige Szene bleibt bis zur Rückgabe der neuen Szene referenziert wie im
Renderer. Prozesspeak umfasst Imports, Fixture, Warmup, alle Proben und die
Digestprüfung, keine isolierte einzelne Allokation oder Browser-/GPU-Nutzung.

| Messgröße | Bisher | Überarbeitet |
| --- | ---: | ---: |
| CPU-Projektionsmedian | 460,611 ms | 117,523 ms |
| Getrennter Prozess-Spitzen-RSS | 1044,6 MiB | 406,1 MiB |
| Finale Float32-Puffer inklusive Grid | 83.393.280 Byte | 83.393.280 Byte |

Der gemessene Prozesspeak ist damit rund **61,1 % niedriger**. Sämtliche
Geometriepuffer, PickMap und Framing stimmen per vollständigem SHA-256-Digest
überein. Rohwerte, Einzelsamples, Quellenhashes und Methodik:
[warehouse-memory.json](results/warehouse-memory.json).
Große Layouts behalten ihren finalen Pufferbedarf und können beim Neuaufbau
zwei Szenengenerationen halten. Eine 60-FPS-Zusage folgt daraus weiterhin nicht.

```powershell
node tools/benchmark-warehouse-memory.cjs
```

Der Runner prüft vor jedem Child mindestens 2,5 GiB verfügbaren Speicher und
verändert keine Anwendungs- oder Nutzerdaten. Er enthält ausschließlich
synthetische Layouts; kein weiterer Benchmark lief parallel.

## Korrektheit und Ausführen

26 Lager-/Scene-/WebGL-Tests bestanden, darunter sieben neue Paritätstests. Sie prüfen alle Objektartenpaare, Rotationen/Kontaktgrenzen, kleine/Sweep-/dichte Pfade, deterministische Zufallsanordnungen, Overlay-Ausnahmen, Eingabe- und Paarreihenfolge, beide unterstützten Grenzen sowie bitgenaue Puffer, Picking und Framing. In-place-Änderungen werden im nächsten Aufruf sofort berücksichtigt, da keine frameübergreifenden Caches verwendet werden. Die vorhandene Nur-Lesen-Lagerauswertung nutzt denselben Renderer ohne Änderung ihrer Speicher-/Bearbeitungsregeln.

```powershell
node --test tests/warehouse.test.cjs tests/warehouse-scene.test.cjs tests/warehouse-webgl.test.cjs tests/warehouse-optimization.test.cjs
node tools/benchmark-warehouse.cjs
```

Der Runner schreibt standardmäßig `docs/performance/results/warehouse.json`; ein optionaler erster Parameter bestimmt einen anderen Ausgabeort. Nach dieser Messung wurde ausschließlich dieser Standardausgabeort angepasst. Der historische Runner-Hash im Messprotokoll bezeichnet den ausgeführten Runner, die gemessenen Produktionsdateien blieben danach unverändert. Weitere Vergleichsläufe bei ruhender Benchmarkarbeit durchführen. Manuelle Edge-/Geräteabnahme bleibt eine getrennte Prüfung.

## Historischer Stand und aktuelle Wiederholung

Dieser Bericht und seine JSON-Dateien beziehen sich auf die Integration vor
Layout-Schema 2. Der aktuelle Runner schreibt neue Dateien `warehouse-layout-v2.json`
und `warehouse-memory-layout-v2.json`; die früheren Daten werden nicht überschrieben.
Die erneute Prüfung und gemeinsame aktuelle Geometrie beschreibt der
[Layout-2-Bericht](warehouse-layout-v2.md).
