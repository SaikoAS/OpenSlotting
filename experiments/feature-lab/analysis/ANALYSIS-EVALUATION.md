# Bewertung: mathematische Analysevarianten

Stand: 2026-10-04. **Alle Varianten sind Laborcode. Keine neue Analyse wird in
OpenSlotting eingebaut.** Eingaben sind synthetisch, keine Betriebsdaten.

## Ergebnis und Entscheidung

Der vielversprechendste vollständige Ansatz ist ein **selektiver Tagesindex
vor dem bestehenden Fachkern**. Bei 50.000 Zeilen benötigt die gemessene Serie
für 32 unterschiedliche vollständige Periodenvergleiche 5.639,43 ms mit der
aktuellen Single-Pass-Engine. Der reine Datumsindex benötigt 880,13 ms für die
Abfragen plus 59,92 ms einmaligen Aufbau. Alle verglichenen Ergebnisfelder
bleiben gleich, einschließlich exakter Umsätze, Readiness, Artikelstammnamen,
Quellreferenzen und Überlappungen.

Eine sofortige Indexierung aller Entitäten ist erheblich teurer. Deshalb
sollte eine spätere Integration den Datumsindex und die tatsächlich benötigte
Artikel-/Kunden-/Auftragssicht getrennt aufbauen. Ein schnelleres Teilmodul
allein rechtfertigt keinen Austausch des gesamten Fachkerns.

| Ansatz | Bewertung | Grund |
| --- | --- | --- |
| nur Tagesindex + aktueller vollständiger Periodenkern | geeigneter Integrationskandidat nach Browserprüfung | gleiche Fachausgabe, deutlich weniger Kandidaten bei schmalen neuen Perioden |
| alle Entitätssichten sofort aufbauen | gezielt prüfen, kein Standardkandidat | hohe zusätzliche Speichermenge und Aufbaukosten |
| Dictionary + unbeschränkte BigInt-Spalte | guter enger Rechenkern | schneller für wiederholte gleichartige Mengenaggregation, aber deutlich weniger Fachumfang |
| bewiesene BigInt64-Spalte | derzeit kein Laufzeitgewinner gegenüber BigInt-Spalte | typed storage bringt hier keinen schnelleren BigInt-Operator |
| Dictionary + exakte Bitsets für distinct counts | gezielt für viele neue Abfragen prüfen | genaue Kardinalitäten, mit ausdrücklich verschiedenen Auftragsschlüsseln |
| Prefixsummen für reine Mengen-/Zeilenabfragen | sehr schnelle Abfrage nach amortisiertem Aufbau | Gesamtvorteil hängt stark davon ab, ob ein Index schon gebraucht wird |
| Entitätspostings für Terminal-Summary | bei bereits vorhandenem Index hilfreich | Aufbau nur für einige Auswahlvorgänge teurer als aktueller Scan |

## Messgrundlage und Annahmen

- Windows x64, vorhandenes Node `v24.18.1`, Intel Core i9-12900F,
  24 logische CPUs, ungefähr 64 GiB RAM. Node ist ein Entwicklungswerkzeug,
  keine neue Voraussetzung für Benutzer.
- Größen: 1.000, 10.000 und 50.000 normierte Bewegungszeilen; 200 Artikel,
  97 Kunden, drei Quellen und ein Zeitraum von 365 Kalendertagen.
- Mengen sind positive und negative **skalierte BigInt-Ganzzahlen**.
  Exakte Umsatztexte mit Nachkommastellen, Einheitenbeziehungen und
  Quelleninformationen sind für den vollständigen Vergleich vorhanden.
- Jede 101. Zeile hat ein unbekanntes Lieferdatum. A und B sind je 14 Tage
  lang, um sieben Tage verschoben und überlappen. 1, 8 und 32 verschiedene
  Abfragen sind bewusst Cache-Misses, keine wiederholten UI-Renderings.
- Fünf warme Samples, Variantenreihenfolge rotiert, Garbage Collection
  außerhalb der Zeitmessung. Je Größe ein eigener Prozess. Ergebnisgleichheit
  wird außerhalb der Messzeiten geprüft. Aufbauzeiten werden separat belastet.
- Dies ist eine lokale Messserie. Andere Laborarbeiten können während Teilen
  der Messung Maschinenlast erzeugt haben; keine CPU-Isolation oder langfristige
  statistische Streuungsstudie. Die Rohsamples sind vollständig enthalten.
  Die Zahlen beschreiben diese Serie und sind kein zugesicherter Prozentvorteil.
- **Keine Edge-, DOM-, Firmen-PC-, Nutzerdaten- oder vollständige
  Geräteabnahme.** Localhost macht diese Mathematik nicht erst möglich;
  stabile Modul-/Worker-Pfade vereinfachen eine spätere Architektur.

Rohdaten:
[node-benchmark.json](results/node-benchmark.json) und
[distinct-benchmark.json](results/distinct-benchmark.json).
Ausführung und Schnittstellen: [README.md](README.md).

## Mathematik und Datenvertrag

### Exakte Mengen und beweisbare Grenzen

Der aktuelle Mengenvertrag bleibt:

```text
q_i = BigInt-Ganzzahl, Menge in Basiseinheiten = q_i / 10^7
Q(S) = Summe der q_i für alle ausgewählten Zeilen i
L(S) = Anzahl ausgewählter Zeilen
```

Es wird keine Menge und kein Geldbetrag in Number umgewandelt. Zeilenzahlen
und Dictionary-Codes sind exakt ganzzahlig; die Arraygrößen liegen weit unter
der Ganzzahlgrenze von Number. Ein negativer Korrekturwert bleibt negativ.
Duplizierte Zeilen werden nicht automatisch entfernt. Artikelstammzeilen
bleiben außerhalb der Bewegungsaggregation; das Register wird im vollständigen
Adapter weiterhin übergeben.

Der BigInt64-Versuch ist nur erlaubt, wenn vorher bewiesen wurde:

```text
A = Summe aller |q_i| <= 2^63 - 1
```

Dann liegt jede mögliche Zwischen- oder Teilsumme in der 64-Bit-Grenze,
unabhängig von der Reihenfolge der Vorzeichen. Sonst verwendet der Prototyp
unbeschränkte BigInts. Er prüft vor der ersten typed-Zuweisung, weil
BigInt64Array Überläufe ohne Fehlermeldung abschneiden würde. Auch eine
Aufhebung riesiger positiver und negativer Werte genügt nicht als Beweis.

### Sparse Tagesmatrix und Prefixsummen

Für jede Entität e und jeden tatsächlich beobachteten gültigen Tag d wird
eine dünn besetzte Tageszelle aufgebaut:

```text
X[e,d] = Summe der q_i mit Entität e und Lieferdatum d
N[e,d] = Anzahl dieser Zeilen
P[e,k] = Summe der X[e,d] für sortierte Tage d <= k
Q[e,a..b] = P[e,b] - P[e,a-1]
```

Hier bezeichnet `a-1` den Vorgänger in der sortierten beobachteten Tagesliste,
nicht notwendigerweise den vorherigen Kalendertag. Binäre Suche findet beide
Grenzen in `O(log D)`. Aufbau benötigt `O(N + D log D)` für einen Tagesindex;
zusätzliche Entitätssichten benötigen ihre eigenen Zellen und Postings.
Ein Vollvergleich muss zusätzlich alle tatsächlich ausgewählten Zeilen durch
den bestehenden Kern führen: `O(log D + M + Fachaggregation(M))`, keine
unrealistische konstante Vollanalysezeit.

### Nenner, unbekannte Tage und nicht additive Kennzahlen

- `observedDays` ist die Anzahl beobachteter gültiger Daten, kein Beweis,
  dass der Export an anderen Tagen vollständig war.
- `unknownDateRows` und `invalidDateRows` sind ausdrücklich Metadaten.
  Sie werden in engen Prefixabfragen nicht einem Zeitraum zugeschlagen.
- Chartbuckets erhalten `expectedDays`, `observedDays` und `hasRows` aus
  der aktuellen Chartfunktion. Ein Tag ohne Zeile wird dadurch nicht als
  gesicherter Nullbedarf ausgegeben.
- Durchschnittsmenge pro Zeile nutzt `Q/L`, mit definiertem Fall `L=0`.
  Die bestehende genaue Rundung/Formatierung bleibt dem Fachkern überlassen.
  Der Artikelanteil der aktuellen Analyse nutzt Zeilenfrequenz/gesamte
  Zeilenfrequenz. Ein Anteil durch eine Netto-Mengensumme von null oder
  negativ ist kein geeigneter Ersatz.
- Anzahl unterschiedlicher Kunden/Aufträge ist **nicht additiv**:
  `|A vereinigt B|` ist nicht `|A| + |B|`. Ein Kunde kann an vielen Tagen
  vorkommen. Der vollständige Adapter behält die aktuellen Sets.
- Der Bitset-Prototyp setzt Dictionary-Bits und zählt ihre Einsen.
  Vereinigungen würden über bitweises OR erfolgen. Er unterscheidet explizit
  Core-Aufträge (`order_id`) und Terminal-Aufträge
  (`[customer_id, order_id]`), weil beide im aktuellen Projekt unterschiedliche
  Fachschlüssel verwenden.
- Die enge Prefix-/Quantity-API bietet keine exakten Umsatzprefixe,
  Währungsumrechnung, Einheitenkonflikte, Distinct-Fachmetriken,
  Capability-/Qualitätsbefunde oder Stammdaten-Joins. Diese Ausgabe ersetzt
  keine komplette Analyse. Exakte Umsatzwerte werden im Volladapter durch
  die bestehende Dezimalarithmetik ausgewertet, nicht durch Number-Summen.

## Messergebnisse

Alle Zeiten sind Mediane in Millisekunden. Die Quantity- und Distinct-Kernels
vergleichen jeweils **denselben engen Funktionsumfang**. Ihre Zeiten werden
nicht als Geschwindigkeitsgewinn gegenüber einer wesentlich umfangreicheren
vollständigen Analyse verkauft.

### Vollständige Periodenvergleiche: 32 unterschiedliche Abfragen

| Zeilen | aktueller Single-Pass | indexierte Abfragen, alle Sichten | nur Datumsindex: Aufbau + Abfragen | Aufbau nur Datum | Aufbau aller Sichten |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 143,79 | 48,03 | 49,59 | 1,36 | 2,55 |
| 10.000 | 1.251,15 | 289,49 | 304,72 | 12,20 | 27,67 |
| 50.000 | 5.639,43 | 864,23 | 940,05 | 59,92 | 162,50 |

Der aktuelle Algorithmus ist bereits Single-Pass für A/B und Coverage.
Der Vorteil entsteht durch einen kleineren Kandidatensatz vor diesem Kern,
nicht durch ein angeblich vorher viermal vollständig gescanntes Produkt.

Bei 50.000 Zeilen zeigen die Belastungsstufen die Aufbaukosten:

| neue Abfragen | aktueller Kern | alle Sichten: Aufbau + Abfragen | nur Datum: Aufbau + Abfragen |
| ---: | ---: | ---: | ---: |
| 1 | 188,66 | 194,54 | 93,57 |
| 8 | 1.391,13 | 378,07 | 277,08 |
| 32 | 5.639,43 | 1.026,73 | 940,05 |

Ein einmaliger Vergleich ist hier mit dem Vollindex sogar geringfügig teurer;
der selektive Datumsindex vermeidet unnötigen Entitätsaufbau. Sehr breite
Perioden, die fast alle Zeilen umfassen, können den Vorteil verlieren. Diese
Serie misst schmale Zeiträume; sie liefert keinen Beweis für breite Perioden.

### Enge Mengenaggregation: 32 Abfragen

| Zeilen | Map + BigInt | Dictionary + BigInt-Spalte | bewiesene BigInt64-Spalte | Aufbau BigInt-Spalte | ungefährer Break-even BigInt-Spalte |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 0,63 | 0,33 | 0,44 | 0,14 | 15 Abfragen |
| 10.000 | 6,89 | 3,67 | 5,41 | 0,80 | 8 Abfragen |
| 50.000 | 45,41 | 22,97 | 28,68 | 5,82 | 9 Abfragen |

Die BigInt64-Variante ist in dieser Serie langsamer als die normale
BigInt-Spalte. Exakte große Werte funktionieren durch Fallback, aber typed
storage erzeugt nicht automatisch bessere Arithmetikleistung.

### Prefix und Terminal: 32 neue Abfragen bei 50.000 Zeilen

| Funktion | gleiche Referenz ohne Index | Indexabfragen ohne Aufbau | geeigneter Aufbau | Gesamt mit Aufbau |
| --- | ---: | ---: | ---: | ---: |
| enge Zeitraumsumme und beobachtete Tage | 30,75 | 0,12 | nur Datum 59,92 | ca. 60,04 |
| vollständige ausgewählte Artikel-Terminal-Summary | 29,43 | 4,34 | Datum + Artikel 76,89 | 81,23 |

Die reine Prefixabfrage ist extrem kurz, aber 32 Abfragen amortisieren den
Neuaufbau hier noch nicht. Mit dem gemessenen gemeinsamen Prefixkernel läge
der selektive Datums-Break-even rechnerisch bei ungefähr 63 neuen Abfragen.
Der Artikel-Terminal-Aufbau amortisiert sich nach ungefähr 99 ähnlich
gewichteten neuen Auswahlabfragen. Wenn der Index bereits für eine andere
Funktion besteht, ist nur die Folgeabfrage zu belasten. Identische UI-Abfragen
werden heute bereits gecacht; daraus darf kein erneuter Gewinn abgeleitet
werden.

### Exakte distinct counts: 50.000 Zeilen, 32 unterschiedliche Zeiträume

| Fachschlüssel | Set-Kernel | Bitset-Kernel | Dictionary-Aufbau | Gesamt Bitset | ungefährer Break-even |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kunde | 24,06 | 17,01 | 3,93 | 20,95 | 18 Abfragen |
| Core-Auftrag | 27,72 | 16,86 | 2,60 | 19,46 | 8 Abfragen |
| Terminal-Auftrag mit Kundenbezug | 36,99 | 18,47 | 9,61 | 28,08 | 17 Abfragen |

Die Bitsets zählen exakt. Für 97 Kunden benötigen die Scratch-Bits 16 Bytes;
für 10.000 Core-Auftragsschlüssel 1.252 Bytes, für 50.000 Terminal-Aufträge
6.252 Bytes. Hinzu kommen Dictionary-Codes, Datumsfelder und Aufbauzeit.
Eine große tagesweise Bitsetmatrix für jede Entität wurde nicht gebaut:
deren Speicherbedarf könnte den Vorteil aufheben.

### Speicher und Break-even

Zusätzlich gehaltene Heap-Menge nach explizitem GC bei 50.000 Zeilen:

| Index | zusätzliche Heap-Menge |
| --- | ---: |
| nur Datum | ca. 12,15 MiB |
| Datum + Artikel | ca. 17,59 MiB |
| Datum + Artikel + Kunden + Aufträge | ca. 94,98 MiB |

Typed Arrays liegen zum Teil außerhalb des JS-Heaps; `externalBytes` und
`arrayBufferBytes` sind in den Rohdaten getrennt enthalten. Negative kleine
Speicherdeltas sind GC-/Messrauschen, keine negative Allokation. Die gemessene
Prozessspitze des 50.000-Zeilen-Prozesses beträgt etwa 444,42 MiB; sie enthält
**alle** Varianten, gleichzeitig gehaltene Vergleichsindizes und die
Gleichheitsprüfungen. Das ist keine isolierte Produktspitze für einen Index.

Für die rechnerische Amortisation gilt:

```text
Q_break_even = ceil(T_build / (T_current_per_query - T_indexed_per_query))
```

Das ist nur für einen positiven Zeitvorteil sinnvoll. Es nimmt eine ähnlich
gewichtete Abfrageverteilung an; es ist keine Prognose für die tatsächlichen
Benutzerklicks. Die Rohdaten enthalten die Rechnung für 1/8/32 Abfragen und
jede Variante.

## Gleichheit, bekannte Grenzen und nächster Schritt

13 deterministische Labortests bestehen. Sie prüfen unter anderem riesige
positive/negative BigInts, die 64-Bit-Grenze, identische Quellzeilen,
Originalreferenzen nach Artikelstammfilterung, A/B-Überlappung, unbekannte und
ungültige Daten, exakte große Dezimalumsätze, gesperrte Readiness-Metriken,
Stammnamen und Namenskonflikte, DE/EN-Suchprojektionen, Charts, kundenbezogene
Auftragsschlüssel, Revisionswechsel, Snapshot-Isolation und Entsorgung.

**Im aktuellen Kern reproduzierte Abweichung:** `coverageForPeriod` zählt
eine Zeile mit `delivery_date: null` über seine negativen lexikalischen
Schranken als Coverage-Zeile, während die Periodenanalyse sie nicht enthält.
Der Test mit einer gültigen und einer unbekannten Zeile ergibt für A eine
Analysezeile, aber zwei Coverage-Zeilen; B enthält keine Analysezeile, aber
eine Coverage-Zeile. Der vollständige Laboradapter bewahrt diesen aktuellen
Vertrag ausdrücklich für Ergebnisgleichheit. Die enge mathematische API
weist diese Zeile separat als unbekannt aus. Das ist ein getrennt zu
prüfender Produktbefund; der Laborauftrag ändert ihn nicht heimlich.

Bei Datenänderungen muss eine neue Revision aufgebaut werden. Die
Snapshotkopie bewahrt die von der Analyse gelesenen primitiven Felder;
verschachtelte rohe Originalobjekte sind kein neues Backupformat und werden
nicht als unabhängig geklonte Quellarchive behauptet. Locale ändert die
Mathematik nicht; Suchtexte entstehen im Fulladapter über den aktuellen Kern.
Vorhandene Anwendungs-/View-Caches bleiben gültigkeitsabhängige Mechanismen
außerhalb des Labors.

Vor einer Integrationsentscheidung fehlen mindestens: Messung auf dem
Firmen-PC in Edge, breite Perioden und höhere Entitätskardinalität, echte
gleichzeitige UI-/Worker-Anforderungen, Speicherpeak einer einzelnen gewählten
Strategie sowie Benutzerpfade mit aktuellen Betriebsdaten. Erst danach wären
gezielte statische Worker-Module, ein Import-Deltaindex oder exakte
Dezimalprefixe sinnvolle weitere Laborvarianten. SQLite, pip/npm-Pakete,
Serverdatenbanken, Uploads und neue Benutzerinstallationen werden dafür
nicht benötigt.
