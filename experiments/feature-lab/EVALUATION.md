# Gesamtbewertung der getrennten Funktionsvarianten

Stand: 2026-10-04. Referenzcommit `59525a4`, Branch `codex/localhost-development`.
Der [Strukturplan](../../docs/project-structure-plan.md) bleibt ein Plan.
**Keine neue Engine, kein Modul und keine UI-Variante ist produktiv eingebaut.**

## Ergebnis in einfachen Worten

Die größten gemessenen Chancen liegen bei wiederholten neuen Periodenabfragen,
Lagerkollisionen und dem Wiederverwenden sichtbarer Tabellenzeilen anhand ihres
Quellschlüssels. Größere Importblöcke, pauschale Vollindizes und ein einfacher
Zeilenpool sind keine allgemeinen Gewinner. Spaltenprofile verbessern die
Erklärung und erkennen Typkonflikte; sie können fachlich falsche Zuordnungen
nicht verhindern. Ein bestätigter Quellvertrag bleibt erforderlich.

Localhost vereinfacht feste Modul- und Worker-Pfade und die Prüfung lokaler
Browserfähigkeiten. Streaming, Indizes und Mathematik wären grundsätzlich auch
vorher möglich gewesen. Die Pause von Portable Mode wird nicht als Ursache
jedes gemessenen Vorteils ausgegeben. Das Firmenziel bleibt: Browser plus
freigegebenes Python, lokale Daten, keine zusätzlichen Pakete oder OpenSlotting-EXE.

## Funktionsmatrix: gesamter aktueller Umfang

Die Matrix ordnet die bestehenden Featurefamilien zu. **Erfasster Umfang ist
keine Behauptung, dass jede einzelne Schaltfläche einen neuen Ersatz besitzt.**
Neue Algorithmen, vollständige Adapter um vorhandene Fachlogik und reine
Entwürfe werden getrennt genannt. Bestehende mutierende Fachkerne bleiben
verantwortlich für Regeln, Datenvalidierung und Speicherung.

| Featurefamilie | Tatsächlich ausprobiert | Ergebnis-/Prüfgrenze |
| --- | --- | --- |
| Localhost-Start, Stop, Edge-App, Verknüpfungen, Runtime-Fähigkeiten, Portable-Pause | vorhandene Laufzeit erhalten; statische Modul-Worker im ersten Labor; neuer UI-Laborserver mit Host-/Pfad-/CSP-Prüfungen | kein alternativer Launcher oder Unternehmensrichtlinien-Test; Python-Start bleibt unverändert |
| Dateiannahme, Encoding, Quotes, große CSVs, Originalbytes | echter Importkernel mit 64/256-KiB, adaptiver und Volltextzufuhr; Python-Positionsparser als enger Roundtrip | Browser-Dateistream, Abbruch, Rechte und Datenträgerleistung nicht als getestete Vollimporte behauptet |
| Quelltypen, Mapping, doppelte Header, Spaltenprofile | exakte Aliasregeln und Profil-Top-K; ganze Raw-/Prepared-Ausgaben verglichen | Quellenposition und Datei bleiben Identität; nie ungeprüfte automatische Fachzuordnung |
| Aufbereitungsregeln, benannte Ausschlussfilter, Customfields, Importprofile | gleiche Regeln im Import; vorkompilierter Profilplan; neue UI zeigt doppelte Spalten und Bestätigung | keine Skript-/Regex-Regelmaschine; Zielkonflikte und ungesicherte Semantik bleiben Prüffälle |
| Artikelstamm, Register, Stammdatentypen, Konflikte, master-only/movement-only | bestehender Registerkern im ganzen Import-/Periodenadapter geprüft; indexierte Lagerzuordnung | kein neuer Resolver, der Konflikte versteckt oder historische Bewegungen umschreibt |
| Validierung, Qualitätsbefunde, Herkunft, Rohzeilen, Dateiabdeckung | vollständige Payload-/Quellreferenzgleichheit; Positionsparser; Quellnachweis neben Import/Analyse | keine stille Deduplizierung; unbekannte Daten und Quellzeilen erhalten |
| Artikelaggregation, ABC/Frequenz, genaue Mengen/Umsätze, Readiness | kompletter aktueller Fachkern hinter selektivem Tagesindex; zusätzlich Map/Dictionary/BigInt64-Versuche | enge Mengenkerne ersetzen keine vollständige Fachanalyse; XYZ/Slotting-Scores bleiben zukünftige Features |
| Kunden-/Auftrags-/Artikelsichten und Listen | Entitätspostings, selektiver Aufbau, exakte Bitsets, Suche/Sortierung und begrenzte Querycaches | Auftragsschlüssel Core und Terminal unterscheiden sich; nicht vereinheitlichen |
| Perioden A/B, Überlappung, Kalender-/Datierungsabdeckung | vollständiger indexierter Adapter gegen echten Single-Pass; Sparse-Tage, Prefixsummen und Distinct-Kerne | schmale neue Perioden gemessen; breite Perioden und hohe Kardinalität weiter prüfen |
| Charts, Granularität, Zeitraumauswahl, Summaries | aktuelle Chart-/Summary-Ausgabe im Indexadapter; genaue BigInt-Pixelverhältnisse in UI | keine Number-Mengensumme; fehlender Tag bedeutet nicht gesicherte Nullnachfrage |
| Suche, Sortierung, Artikelwahl, Watchlists | aktuelle Suchprojektionen als Baseline; CandidateIndex und begrenzter Cache; native Artikelansicht | Aufbau und Hits/Misses getrennt; Locale/Revision/Workspace invalidieren |
| Tabellen, Pagination, sichtbare Zeilen, UI-Sprache und Tastatur | Fragment, Pool, Quellschlüssel-Wiederverwendung bei identischer aktueller Virtualisierung; drei bedienbare UI-Ansichten | echte Edge-DOM-Prüfung nur im Labor; keine vollständige Bedien-/Barrierefreiheitsabnahme |
| CSV-Analyse-/Terminalexport, sichere Zellen, genaue Werte | echter Serializer bzw. bytegleicher Generator mit mehreren Chunkgrößen und SHA-Sink | Download-/Dateistreamrechte und partielle Datei bei Abbruch bleiben offen |
| Originaldateiexport, strukturierte Formate | Python JSON/NDJSON/Gzip/SQLite-Roundtrips mit unveränderten Originalbytes | reine Textprojektion; kein neues Workspace- oder Analyseformat; XLSX/Parquet nur Optionen |
| Workspace-Liste, Erstellen, Öffnen, Umbenennen, Löschen, Aktivauswahl | vorhandener Vertrag; metadataartige Projektion/Cache; TaskGate für veraltete Read-/Compute-Ergebnisse | keine alternative Datenbanktransaktion; TaskGate nicht in Labor-UI oder App eingebunden |
| Speichern, Revisionen, Mehrtabschutz, Migration, Sicherung/Restore | aktuelle Fachkerne erhalten; Raw-IDB/OPFS, Worker, Gzip/Deflate und Base64-Kandidaten im ersten Labor | Rawstore allein ist kein atomarer Ersatz des ganzen Workspace-Repositories |
| Lagerobjekte, Rezepte, Raster, Maße, Duplizieren, Drehen, Löschen, Teilcodes | vorhandenes Modell; alternative History-Darstellung um dessen Zustände | keine neuen Objekt-/Code-/Formatregeln; normale heutige Limits bleiben bestehen |
| Kollisionen, blockierte Gänge, Berührungstoleranz | Sweep, Raster und vorberechnetes SAT; alle Objektartenpaare, Grenzfälle und Reihenfolge | dichte und verteilte Layouts unterscheiden sich; 1000 Objekte nur Zukunftsstress |
| Verbinder, Einrasten, Hysterese, Sperren | räumlicher Anchorindex und ID-Set-Prüfung mit gleicher Auswahlentscheidung | kalter Aufbau teils teurer; Invalidation bei geänderten Zielobjekten |
| Undo/Redo, Auswahl, Workspacewechsel, fehlgeschlagene Speicherung | volle Layoutsnapshots gegen objektgebundene Deltas im separaten History-Labor | Speicherung/Locks bleiben beim vorhandenen Kern; keine neue Editorintegration |
| Stellplätze, Artikelbelegung, exakte Codesuche, Fokus | Slot-/Code-/Artikelindex, gleiche geordnete Treffer und fehlende Codes | keine Mutation des Layouts durch Analysemarker |
| 3D/2D-Szene, Kamera, Picking, Transparenz, Kontextverlust | Scene-Cache, exakte Box-/Vertexgleichheit, CPU-Projektion und transparentes Packing | GPU/FPS, Shadertransform, neue Kamera-/Pickinglogik und Kontextverlust nicht neu implementiert |
| Dokumentation, Paketierung, CI, Zukunftsstruktur | Strukturplan erweitert, Laborberichte/Quellhashes und vorhandene Tests | keine Releaseversion, keine Verlagerung der Produktion, kein Push/PR |

## Import und Export: verfügbare Wege

1. **CSV bleibt der kurze Betriebsweg.** Ein zustandsbehafteter Decoder und
   Parser verarbeiten Stücke, während die Originalbytes erhalten bleiben.
   Keine Decoder-/CSV-Grenze mit einer physischen LF-Zeile verwechseln.
2. **Exportgeneratoren** können Daten in einen Sink schreiben, ohne den ganzen
   Ergebnisstring aufzubauen. Bytegleichheit ist geprüft. Ein tatsächlich
   bestätigter Dateistream ist ein weiterer Browseradapter, kein schon
   getesteter Unternehmens-Dateischreibweg. Ein Save-Picker verlangt
   Benutzeraktivierung und lokale Rechte; Browser-/Firmenrichtlinien müssen
   unterstützt werden. [File System Access](https://wicg.github.io/file-system-access/).
3. **Originalquelle, normalisierte Tabelle und Analyse** brauchen eigene Namen.
   Nur die gespeicherten Originalbytes rekonstruieren eine Datei bytegenau.
   Ein sauber neu serialisiertes CSV ist nicht automatisch die Originaldatei.
4. **JSON/NDJSON/Gzip/SQLite** werden im Python-Teil als positionsgebundene
   Textprojektion verglichen. Mengen/IDs bleiben Strings, Originalbytes separat.
   Das ist kein vollständiges Workspacebackup und keine neue Daten-API.
   SQLite kann mit der vorhandenen Python-Standardbibliothek untersucht werden.
   [Python sqlite3](https://docs.python.org/3/library/sqlite3.html).
5. **Workspace-Sicherung** behält ihren heutigen versionierten Innenvertrag;
   Kompression liegt außen herum. Browserkompression benötigt keine neue
   Bibliothek, wird aber an tatsächlichen Fähigkeiten geprüft.
   [Compression Streams](https://compression.spec.whatwg.org/).
6. **XLSX und Parquet** sind noch keine geprüften Adapter. Ein einfacher
   XML-/ZIP-Leser wäre kein vollständiger Excelimport. Zusätzliche Formate
   werden nicht wegen des HTTP-Starts automatisch notwendig.

## Wie die Spalteninterpretation funktioniert

`Originalbytes → Positionskatalog → begrenztes Werteprofil → erklärbare
Kandidaten → Konflikte/Unsicherheit → Vorschau → ausdrückliche Bestätigung`.

Headeralias und Datenformat werden getrennt gewichtet. Die Engine gibt Top-K,
Originalposition, Doppelheader-Vorkommen, Gründe, Abstand zum nächsten Kandidaten
und einen Prüfstatus zurück. Sie erzwingt kein komplettes Mapping. Die
unabhängige kleine Challenge-Suite enthält acht Fälle und 18 Feldentscheidungen:
Profil-Top-K erzielt 84,6 % Precision gegenüber 63,6 % der vorhandenen Vorschläge.
Zwei starke Vorschläge bleiben fachlich falsch. Das ist kein Schätzer einer
ERP-Erfolgsquote; Punkte sind keine Wahrscheinlichkeiten.

Insbesondere beweist ein gültiges Zahlenformat weder Auftragsmenge noch
Bestandsmenge. Ein gültiges Datum beweist kein Lieferdatum. Ein bestätigtes,
versioniertes Quellprofil müsste die Bedeutung festlegen und Schemaänderungen
erneut zur Prüfung bringen. Vollprofile kosten Arbeit: bei 50.000 Zeilen
327,15 ms, das zusätzliche Scoring rund 1,27 ms. Vorhandene Spaltenprofile
wiederverwenden, statt Quellen unnötig erneut vollständig zu scannen.

## Wie die mathematische Engine funktioniert

Die exakte Basis bleibt `q ∈ BigInt` in Schritten von `10^-7`. IDs erhalten
Dictionary-Codes; die Originalreferenzen bleiben getrennt erreichbar. Für
beobachtete Tage werden dünn besetzte Mengen-/Zeilenzellen und Prefixsummen
aufgebaut. Eine reine Zeitraumssumme wird zu `P(b) − P(a−1)` mit binärer Suche.
Distinct-Kunden/Aufträge benötigen Sets oder geprüfte Bitsets; ihre Zahlen
dürfen nicht einfach addiert oder subtrahiert werden.

Der vollständige Periodenadapter sucht zunächst passende Originalindizes und
führt dann den **unveränderten Fachkern** aus. Damit bleiben exakte Umsätze,
Readiness, Registerkonflikte, Quellen und Überlappungen erhalten. Er ist nicht
konstant schnell: ausgewählte Zeilen müssen weiterhin fachlich analysiert werden.
Bei 50.000 Zeilen und 32 neuen schmalen Perioden: 5639,43 ms aktuell gegenüber
880,13 ms Abfragen plus 59,92 ms Aufbau nur des Tagesindex. Alle Sichten sofort
aufzubauen kostet dagegen rund 95 MiB zusätzlichen Heap statt rund 12 MiB nur
für Datum. Enge Prefixabfragen amortisieren einen nur dafür gebauten Index in
dieser Reihe erst nach etwa 63 Abfragen, Terminal-Summaries nach etwa 99.

Ein BigInt64-Fastpath ist nur nach `Summe |q_i| ≤ 2^63−1` sicher. Sonst muss
unbeschränkte Arithmetik übernehmen. Die typed Variante ist in der gemessenen
Serie langsamer als die unbeschränkte BigInt-Spalte. Breite Zeiträume,
ungewöhnliche Entitätsverteilungen und Browserkosten bleiben weitere Prüffälle.

## UI: konkrete Änderungen im Labor

- **Import:** Quelle, physischer Spaltenkatalog, Vorschläge und Originalbeleg
  gleichzeitig sichtbar; Positionskonflikte sperren die Laborbestätigung.
- **Artikel:** Suche und Auswahl führen zu kompakten Kennzahlen; exakte
  Tageswerte und Quellen bleiben aufklappbar. Auswahl mit Tastatur behält Fokus.
- **Vergleich:** Zeitraum, Mengenänderung und Datenabdeckung nebeneinander;
  unbekannte Tage bleiben gesondert sichtbar.
- **Tabellen:** Quellschlüssel-Wiederverwendung erhält überlappende Zeilen;
  Pool und Neuanlage werden bei derselben Sichtmenge geprüft. Kein Vorteil
  aus dem Vergleich mit einer angeblich bislang unvirtualisierten Tabelle.
- **Steuerung:** TaskGate verwirft veraltete Ergebnisse bei Workspace,
  Revision, Sprache, Ansicht oder Requestwechsel. Nur separater Modulnachweis;
  keine neue Schreib-/Transaktionsgarantie und keine UI-Integration behauptet.

Native Tabellen und Controls vermeiden eine ungeprüfte eigene Grid-Tastaturlogik.
Ein echtes interaktives ARIA-Grid würde zusätzliche Fokus-/Navigationsregeln
brauchen. [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
Bedienbarkeit wird anhand der sichtbaren Laborabläufe beschrieben, nicht als
gemessener Arbeitszeitgewinn oder abgeschlossene Accessibility-Abnahme.

Drei echte Edge-Läufe vergleichen die Tabellenverfahren. Bei 50.000 Quellzeilen
und 80 überlappenden Updates benötigt die nachgebildete Fragmentreferenz im
finalen Lauf 299,70 ms, der Zeilenpool 338,10 ms, Quellschlüssel-Wiederverwendung
159,50 ms. Große Sprünge liefern keinen stabilen Vorteil; dieselben Fenster
werden bereits heute übersprungen. [UI-Auswertung](ui/UI-EVALUATION.md).

## Weitere gemessene Alternativen

### Suche und Sortierung

Der getrennte Suchvergleich behält die vorhandenen Artikel-Suchprojektionen
und den Ein-Abfrage-Viewcache in der Baseline. Ein zusätzlicher Kontrollarm
bereitet nur Terminal-Lowercase-Texte einmal vor. Bei 10.000 Kunden und
50 neuen Queries: 923,98 ms heutiger Weg, 13,47 ms vorbereitet-linear,
4,37 ms Bigramkandidaten. Der Großteil entsteht durch einfache Vorverarbeitung.
Artikel haben diese Projektion bereits: 32,12 ms gegenüber 10,66 ms Bigram,
aber Aufbau 54,67 gegenüber 104,26 ms und zusätzlicher Heap 2,41 gegenüber
7,65 MiB. Ein identischer Query war schon vorher gecacht.

Daher zuerst die einfache Terminalprojektion prüfen. Bigram und begrenztes LRU
gezielt nach wiederholten selektiven Anfragen auswählen. Vollständige Treffer,
Reihenfolge, führende Nullen, große Mengen und Locale-/Revisionswechsel bleiben
im Vergleich gleich. [Suchauswertung](search/EVALUATION.md).

### Python-Dateiprojektionen

Bei 10.000 synthetischen Zeilen ist eine direkte CSV-Sequenz mit 10,47 ms
schneller als das Lesen einer zusätzlichen JSON-/NDJSON-/SQLite-Projektion.
SQLite mit Rohpositionsindex braucht für einen selektiven Filter 0,73 ms
gegenüber 11,15 ms bei JSON, verlangt aber 55,52 ms Aufbau und ist kein
universell schnellerer Import. NDJSON reduziert Python-Allokationen beim
Lesen; gzip verkleinert das ganze Bundle einschließlich Originalquelle um
58,4 %. `tracemalloc` enthält keine native SQLite-/gzip-Speicherspitze.
[Python-Auswertung](python-io/PYTHON-IO-EVALUATION.md).

### Lager und Editor

150 Objekte liegen innerhalb des heutigen Produktlimits. Bei verteilter
Anordnung: heutige Kollisionen 3,835 ms, Sweep 0,075 ms. Bei dichtem Layout:
10,926 ms gegenüber 1,457 ms vorbereitetem SAT, während Sweep/Raster hier
langsamer sind. Scene-Cache allein spart nur den kleinen Boxaufbau; die
vollständige CPU-Projektion bleibt der größere Grafikposten. Keine GPU-/FPS-
Aussage. [Lagerauswertung](warehouse/WAREHOUSE-EVALUATION.md).

Die Editorhistorie wird mit dem heutigen Limit von 20 Schritten untersucht,
nicht mit einem erweiterten Produktvertrag. Volle Snapshots und objektgebundene
Deltas erhalten dieselben Zustände und Auswahl, veröffentlichen Schritte erst
nach erfolgreichem Save und erhalten Sperr-/Workspacewechselregeln.
[History-Auswertung](history/HISTORY-EVALUATION.md).

Bei 150 Objekten, 50 Bearbeitungen und je 20 Undo/Redo: Snapshots 547,43 ms,
Deltas 571,09 ms. Die exakt serialisierte gehaltene Historie sinkt von
7.005.848 auf 158.416 Bytes (97,74 %), die Gesamtdauer steigt um rund 4,3 %.
Das ist eine Speicheroption und kein pauschaler Laufzeitgewinner.

## Reproduzierte Produktbefunde

1. Das frühere Labor reproduziert einen Stackfehler der heutigen gruppierten
   Base64-RegExp bei großer vollständiger Sicherung. Linearer/beschränkter
   Validator bleibt dort ein **ungewählter** Kandidat.
2. Die aktuelle Perioden-Coverage zählt `delivery_date: null` in `rowCount`
   mit, obwohl die Periodenanalyse die Zeile ausschließt. Der neue Volladapter
   bewahrt die Abweichung für Parität; der enge mathematische Kernel weist
   unbekannte Daten separat aus. Ein Test reproduziert A=1 Analysezeile/2
   Coveragezeilen, B=0/1. Keine stille Produktivkorrektur in diesem Auftrag.

## Messgrenzen und Auswahl

Alle Daten sind deterministisch synthetisch. Node, Python und Edge werden
getrennt ausgewiesen. Samples, Aufwärmung, Aufbau, Gültigkeit, Speicherart und
Hashes stehen in den Teilberichten. Node-Läufe hatten keine exklusiv reservierte
CPU; mögliche parallele Rechnerlast ist dokumentiert. Die finalen Edge-Läufe
wurden nach Abschluss der anderen Benchmarks ausgeführt. Kleine Unterschiede
sind keine statistisch gesicherte Entscheidung.

Priorität für eine **spätere eigene Integrationsentscheidung**:

1. Selektiver Tagesindex vor dem vollständigen Fachkern; Speicherbudget und
   breite Perioden in Edge prüfen.
2. Vorberechnete SAT-Geometrie bzw. Broadphase nach Verteilung; heutige Limits
   und deterministische Kollisionsausgabe erhalten.
3. Quellschlüssel-basierte Tabellenupdates bei überlappendem Scrollen;
   Sprünge, Sprache, Revision und Fokus im echten Controller prüfen.
4. CSV-Sinks und erklärbare Vorschläge als klar getrennte Adapter.
5. Such-/Slotindizes, Editorhistorie und lokale Dateiformate gezielt nach
   gemessenem Abfrage-/Speicherbedarf auswählen.

Import-Chunkgrößen, Inhalts-Hashing jedes Scene-Frames, pauschale Vollindizes
und ein einfacher Zeilenpool erhalten keine pauschale Empfehlung. Shader-/GPU-
Umbau, Dateistreamabnahme, Firmen-PC und reale ERP-Exporte sind ausdrücklich
offene Untersuchungen. Keine Installation oder Datenübertragung ist dafür
Bestandteil dieses Labors.

## Abschlussprüfung

- 248 bestehende Anwendungstests bestanden.
- 71 neue Node-Modultests und sechs neue Python-Tests bestanden; zusätzlich
  elf Node- und zwei Python-Tests des bisherigen Labors erneut bestanden.
- Drei vollständige Edge-DOM-Messungen, drei Rendererprüfungen und acht sichtbare
  UI-Abläufe erfolgreich; keine vollständige Produkt-/Firmenabnahme behauptet.
- JavaScript-Syntax: 37 Dateien; Python-Syntax: sieben Dateien, jeweils ohne Fehler.
- 37 vorhandene Anwendungs-/Startdateien bleiben gegenüber der Referenz ohne
  fachliche Änderung. Git-/Worktree-Zeilenenden werden explizit getrennt erfasst;
  es wurde keine Zeilenendennormalisierung an der Produktion ausgeführt.
- 55 Einträge der unveränderten Paketliste enthalten keine Experimente/EXE;
  die 18 HTTP-Runtime-Dateien enthalten kein Labor. Kein zusätzliches Paket.
- Lokale Dokumentverweise erfolgreich geprüft. Neue Quellen tragen SHA-256.
- Eigene UI-Testtabs geschlossen; beide Listener auf Testports 58659/57381 beendet.

[Prüfmanifest](results/validation.json),
[Umfang, Verweise und Quellenhashes](results/scope-verification.json).
Der vollständige lokale Dateiinventarbericht steht ignoriert unter
`results/project-inventory.json`; Git-Interna und Browserdaten bleiben außerhalb.

Ein eigenes synthetisches Python-Testverzeichnis konnte nach einem frühen
Handlefehler nicht aufgeräumt werden: Die automatische Prüfung blockierte die
geprüfte Löschung mit `blocked by policy` ohne weitere Begründung. Es blieb
unverändert erhalten; keine Betriebsdateien betroffen. Absoluter Pfad und
Inhalt sind im [Python-Bericht](python-io/PYTHON-IO-EVALUATION.md) dokumentiert.
