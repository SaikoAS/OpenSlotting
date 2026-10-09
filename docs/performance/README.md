# Leistung: integrierte Änderungen und Nachweise

Stand: 2026-10-09. Nach der getrennten Laborphase wurden ausgewählte Änderungen
in die aktive Localhost-Anwendung übernommen. Dieser Überblick beschreibt den
aktuellen Produktionscode. Die Berichte unter `experiments/` dokumentieren ihre
damaligen Varianten und Basisstände; dortige Aussagen wie „noch nicht integriert“
oder die beiden inzwischen behobenen Produktfehler sind historische Befunde.

## Betriebs- und Datenvertrag

- Python mit Standardbibliothek bleibt die einzige zusätzliche
  Nutzerabhängigkeit. Browser und die mit Windows gelieferte PowerShell bilden
  die vorhandene Umgebung; Node dient ausschließlich Entwicklung und Messung.
- Der Server liefert freigegebene lokale Anwendungsdateien. Es gibt keine
  Backend-Daten-API, Uploads, Cloudkonten oder Übertragung von Nutzerdaten an
  Python. Import, Fachanalyse und Speicherung erfolgen weiterhin im Browser.
- `http://127.0.0.1:8765`, IndexedDB `openslotting-workspaces`, Datenbankversion 3,
  Workspace-Schema **14** migriert Lagerpläne auf Layout-Schema **2**. Der Sicherungsformat-Vertrag bleibt bei Version 1. Abgeleitete
  Caches werden nicht in Arbeitsbereichen gespeichert.
- Originalbytes, physische Quellspalten, Quellen-/Zeilenbezüge, exakte Mengen
  und Qualitätsbefunde bleiben erhalten. Die aktive Weiterentwicklung gilt
  Localhost; [Portable](../portable-mode-paused.md) ist auf unbestimmte Zeit
  pausiert und am dokumentierten Ausgangsstand zur Weiterentwicklung verfügbar.
- Neue Laufzeitmodule wurden gezielt ergänzt. Eine vollständige Verlagerung
  der vorhandenen Dateien nach `src/` wurde nicht durchgeführt.

## Funktionsmatrix

Die Matrix nennt jede vorhandene Featurefamilie, ihren aktuellen Ansatz und die
bewusste Grenze der Integration. Ein unveränderter Fachkern bedeutet, dass seine
Funktion weiter vorhanden ist; nicht jede Schaltfläche benötigt einen eigenen
neuen Algorithmus.

| Erhaltene Funktionen | Aktueller Produktionsansatz | Ausgeschlossene Varianten / begründete Grenzen |
| --- | --- | --- |
| Start, Stop, Edge-App, Verknüpfungen und Runtime-Prüfung | Vorhandene Windows-Befehle und statischer Python-Loopback-Server; ETags für erlaubte statische Assets, HTML ohne dauerhaften Cache | Kein Datenbackend, kein neuer Installer, keine EXE; Firmenrichtlinien bleiben eine eigene Abnahme |
| CSV-Annahme, Encoding, Quotes, große Dateien, Originalbytes | Bestehender zustandsbehafteter Streaming-Kern mit 64-KiB-Zufuhr; Dateiprofile über den statischen Worker | Keine pauschale Umstellung auf größere/adaptive Chunks oder vollständigen Vorabtext; kein neuer XLSX-/Parquet-Import |
| Quelltypen, positionsgebundenes Mapping, Doppelheader, Spaltenprofile | Bestehende Vorschläge und Bestätigung; gleiche Decoder-/Profilfunktionen in `workspace-preparation.js` | Profil-Top-K bleibt Labor: Formatähnlichkeit beweist keine fachliche Bedeutung und erlaubt keine automatische Zuordnung |
| Aufbereitungsregeln, benannte Quellenfilter, Customfields, Importprofile | Vorhandene Reihenfolge, Validierung und Vorschau; Neuanalyse im Worker mit demselben Importkern | Keine freie Skript-/Regex-Regelmaschine; gespeicherte Profile und Quellpositionen bleiben maßgeblich |
| Artikelstamm, Register, Stammdaten-/Bewegungstypen und Namenskonflikte | Vorhandener Register- und Konfliktkern; vollständige Analyseausgaben werden weiter erzeugt | Kein alternativer Resolver, keine verdeckte Deduplizierung oder Umschreibung historischer Bewegungen |
| Validierung, Qualitätsbefunde, Rohzeilen, Herkunft und Quellenbelege | Unveränderte Fachvalidierung und Originalreferenzen; sichtbare Quellzeilen werden wiederverwendet | Ungültige oder fehlende Werte werden nicht still in gültige Werte umgedeutet; ein Analyseexport rekonstruiert keine Originaldatei |
| Artikelaggregation, ABC/Frequenz, genaue Mengen/Umsätze und Readiness | Bestehender vollständiger Akkumulator; Worker liefert Analyse zur direkten Wiederverwendung im Controller | Enge Map-/Dictionary-/BigInt64-Kerne und Prefixsummen ersetzen keine vollständige Fachanalyse; keine neuen XYZ-/Slotting-Scores |
| Perioden A/B, Kalenderwochen, Überlappung, Abdeckung und Vergleichsexport | Datumsgrenzen einmal prüfen; optional begrenzter Datumsindex vor dem gleichen Fachkern; unbekannte Lieferdaten von Zeitraum-Coverage ausschließen | Erste Abfrage scannt; unter 512 / über 250.000 Zeilen oder über 4.096 Datumsschlüssel kein Index; mehr als 50 % Kandidaten scannen; keine Voll-/Entitätsindizes |
| Artikel-, Kunden-, Auftragslisten, Watchlists, Auswahl, Rang und Sortierung | Bestehende Sichten und Ein-Abfrage-Viewcaches; vorbereitete Terminal-Suchtexte mit Feld-/Locale-Prüfung | Kein Bigramindex oder zusätzlicher Ergebnis-LRU; vorhandene zusammengesetzte Auftragsidentitäten bleiben erhalten |
| Charts, Granularität, Zeitraumwahl, Summary und Artikeldetails | Vorhandene vollständige Terminal-/Analysefunktionen mit gleichen exakten Eingaben | Keine Number-Summen als Ersatz exakter Mengen; fehlender Tag belegt keinen Nullbedarf; enge Labor-Summaries sind kein Ersatz |
| Tabellenfenster, Pagination, UI-Sprache und Tastaturfokus | Vorhandene Virtualisierung; `windowed-dom.js` hält nur sichtbare Quell-/Terminalzeilen und gleicht deren Reihenfolge ab | Kein allgemeiner Zeilenpool, neues ARIA-Grid oder kompletter UI-Entwurf; Daten-/Darstellungssignaturen invalidieren alte Zeilen |
| CSV-Analyse-, Terminal- und Periodenexport, sichere Zellen | Bestehende Serializer und lokale Downloadabläufe; genaue Werte und Formelabsicherung bleiben erhalten | Generator/Sink und bestätigte Dateistreams bleiben Experimente; deren Node-Zeiten belegen keine Dateirechte oder Edge-Downloadabnahme |
| Originalquellen in Sicherungen und alternative Dateiformate | Vorhandene Originalbytes bleiben die verlustlose Referenz und Bestandteil der Workspace-Sicherung | Kein neuer Einzeldatei-Downloadadapter; JSON/NDJSON/Gzip/SQLite-Textprojektionen bleiben Python-Labor, kein Workspaceformat; XLSX/Parquet sind nicht integriert |
| Workspace-Liste, Erstellen, Öffnen, Umbenennen, Löschen und Aktivauswahl | Vorhandener Speichervertrag; Vorbereitung/Analyse über direkt exportierte Anwendungsmodule und einen sequentiellen Worker | Keine alternative Datenbanktransaktion; ein alter Task darf keinen neuen Workspacezustand aktivieren |
| Speichern, Revisionen, Mehrtabschutz und Migration | Chunked IndexedDB und bestätigte atomare Speicheroperationen bleiben erhalten; Workerzustände ersetzen keine Commitbestätigung | Kein Rawstore-/OPFS-Wechsel, keine Schema- oder Originmigration; Schreibfehler bleiben sichtbar |
| Sicherung, Restore, Validierung und Abbruch | Statischer Worker für Vorbereitung/Serialisierung; stapelsichere Base64-Prüfung mit gleichem gültigem Format | Keine neue Gzip-/Deflate-Sicherung; Abbruch beendet den Worker, vor atomarem Commit bleibt der bestehende Speichervertrag maßgeblich |
| Hintergrundarbeit, Fortschritt und lokale Ressourcenfreigabe | `worker-session.js`: ein Task, Task-ID und Revisionsprüfung; Wiederverwendung, Freigabe nach 30 s Leerlauf, 5-min-Timeout seit letzter Antwort | Keine unbegrenzte Workerflotte oder globale Ergebnisliste; Fehler/Abbruch entsorgen den Worker; lokaler Fallback bleibt verfügbar |
| Lagerobjekte, Rezepte, Raster, Maße, Duplizieren, Drehen, Löschen und Teilcodes | Drei Modi: Struktur, Zonen, Locations; Migration mit erhaltenen IDs/Codes; Codeerzeugung je Ebene oder ganzem Regal | Höchstens 150 Objekte / 5.000 logische Locations; physische Ebenen verbrauchen keine Location-Kapazität; abgeleitete Indizes pro Lese-/Zeichenpass |
| Kollisionen, blockierte Gänge und Berührungstoleranz | Geometrie und SAT-Achsen je Prüfung vorberechnen; adaptive Sweep-/Paarprüfung mit ursprünglicher Ausgabereihenfolge | Gleiche 0,001-mm-Kontaktgrenze; dichte Fälle nutzen vorbereitete Paare; kein über Aufrufe persistierender Geometriecache |
| Verbinder, Einrasten, Hysterese und Sperren | Vorhandene Auswahl-, Snap- und Sperrsemantik | Anchorindex bleibt Labor; kalter Aufbau und Invalidierung rechtfertigen keinen pauschalen Ersatz |
| Undo/Redo, Auswahl, Workspacewechsel und fehlgeschlagene Speicherung | Vorhandene vollständige Layoutsnapshots, 20 Historieneinträge, Historie erst nach bestätigtem Speichern | Objektgebundene Deltas sparen Labor-JSON, verlängerten dort den Gesamtlauf; Locks gelten zusätzlich für referenzierte Zonen/Locations; bestätigtes Speichern bleibt maßgeblich |
| Stellplätze, Belegung, exakte Codesuche und Nur-Lesen-Lagerauswertung | Vorhandene geordnete Treffer und lesende Artikelzuordnung; gemeinsame Szene | Slot-/Code-/Artikelindizes bleiben Labor; Analysemarker mutieren keine gespeicherten Layouts |
| 2D/3D, Kamera, Picking, Transparenz und Kontextverlust | Gleich große Float32-Puffer direkt füllen; Trigonometrie/Farben nur innerhalb eines Frames wiederverwenden | Keine neuen Shader, Drawaufrufe oder Pickingregeln; keine GPU-/60-FPS-Zusage aus CPU-Zeiten |
| Dokumentation, Tests, Paketierung und Zukunftsstruktur | Explizite Runtime-/Paketpfade für neue Module; Produktionsberichte hier, historische Varianten unter `experiments/` | Kein Komplettumzug, keine Laborquellen im Produktpaket; Release-/Geräteabnahme wird separat dokumentiert |

## Gemessene Produktionsänderungen

Die folgende Tabelle hält die Messungen vor der Layout-2-Übernahme fest (2026-10-05). Sie ist kein neuer Schema-14-Nachweis. Die aktuellen Messungen und Integrationsprüfungen stehen im [Layout-2-Bericht](warehouse-layout-v2.md).

Die folgenden Werte zitieren vorhandene Einzelberichte; hier wurde kein neuer
Benchmark ausgeführt. Synthetische Daten, Windows, Node 24.18.1 und Intel
Core i9-12900F. Zeitmediane in Millisekunden. Aufbau-, Warmzustands- und
Speicherkosten stehen im jeweils verlinkten Bericht. Die Workloads sind
unterschiedlich und dürfen nicht zu einer Gesamtdauer der Anwendung addiert werden.

| Workload | Vorher | Aktueller Ansatz | Einordnung und Quelle |
| --- | ---: | ---: | --- |
| 50.000 Zeilen, 32 schmale Periodenabfragen | 5.459,12 | Scan 487,94; warmer Index 431,14; kalte Gesamtfolge 436,89 | Grenzenprüfung ist der größte Gewinn; Indexaufbau 1,59 ms und 201.464 Byte typisierte Puffer. [Perioden](period-index.md) |
| 50.000 Zeilen, acht breite Periodenabfragen | 3.057,55 | Scan 1.685,73 | Breiter Cachepfad scannt ebenfalls; kein Indexvorteil daraus abgeleitet. [Perioden](period-index.md) |
| 10.000 Terminalartikel, 46 verschiedene Queries | 850,33 | 22,73 | Vorbereitung rund 20 ms separat; zusätzliche Suchtexte ca. 1,33 MiB je 10.000 Entitäten. [Terminalsuche](terminal-search.md) |
| 150 räumlich verteilte Lagerobjekte, Kollisionsprüfung | 3,624 | 0,123 | Alle Vorbereitungen im Aufruf enthalten; Paar-/Kategorieparität geprüft. [Lager](warehouse.md) |
| 150 dicht überlappende Lagerobjekte, Kollisionsprüfung | 11,034 | 1,314 | Verteilung entscheidet über Sweep-/Paarpfad. [Lager](warehouse.md) |
| CPU-Projektion, 150 Objekte / 5.000 Stellplätze | 96,593 | 30,750 | Keine GPU-/FPS-Messung; weiterhin über dem 16,7-ms-Budget für 60 FPS. [Lager](warehouse.md) |
| Großer gültiger Geometriefall, 38.600 Boxen | 460,611 | 117,523 | Getrennter Prozesspeak 1044,6 → 406,1 MiB; finale Puffer identisch 83.393.280 Byte. Kein vollständiger Maximalnachweis oder GPU-Test. [Lager](warehouse.md) |

Worker, Profilierung/Neuanalyse, Tabellenwiederverwendung, Base64-Korrektur und
statische HTTP-Caches werden im [Workspace-/UI-Nachweis](workspace-ui.md)
zusammengefasst. Im nativen Edge-Lauf benötigte die Vorbereitung von 10.000
Zeilen mit Workerwiederverwendung 448,5 ms statt 513,4 ms beim bisherigen
Blob-Worker. Neue Modul-Worker waren etwas langsamer; Profil/Neuanalyse
benötigten durch Übertragung mehr Gesamtzeit bei geringerer beobachteter
Timerverzögerung des Browserthreads. Die dort auffällige rAF-Probe begründet
keine Bildratenzusage. Ganze Ausgaben und Quellbytes stimmen überein;
Details, Kalt-/Warmkosten und alle Einzelsamples stehen im eigenen Bericht.

### Messgrenzen

- Die Produktionsreports prüfen ganze Ausgaben bzw. bitgleiche Puffer gegen die
  benannten Baselines. Die Anzahl ausgewählter Zeilen/Entitäten und kalte Kosten
  bleiben Teil der Bewertung. Bereits vorhandene Viewcaches werden nicht als
  neuer Gewinn verkauft.
- Eine lokale Messreihe mit wenigen Samples ist keine garantierte Ersparnis
  auf Firmen-PCs. Kurze parallele Regressionen können insbesondere die
  Periodenserie beeinflusst haben; Details stehen in den Einzelreports.
- Node-Logik, Browsersteuerung im Codex-Browser, nativer Edge-Start und vollständige
  Edge-Bedienabnahme sind verschiedene Nachweise. Erfolgreicher nativer Start
  allein bestätigt weder alle Produktabläufe noch Unternehmensrichtlinien.
- Der exakte Kandidat auf einem Firmen-PC in Edge bleibt separat offen:
  Import/Encoding/Bestätigung, Abbruch/Workspace-/Sprachwechsel, Mehrtabschutz,
  Sicherung/Restore, Tabellenfokus, 3D/Picking und Start/Stop/ZIP-Auslieferung.
  Siehe [Localhost-Abnahme](../acceptance-localhost.md) und
  [Release-Checkliste](../release-checklist.md).

## Historische Varianten weiter nutzen

- [Localhost-Labor](../../experiments/localhost-lab/EVALUATION.md): ursprüngliche
  Worker-, Rawstore-/OPFS-, Kompressions- und Base64-Vergleiche.
- [Feature-Labor](../../experiments/feature-lab/EVALUATION.md): vollständige
  Variantenmatrix zu Import/Export, Spalteninterpretation, mathematischen
  Kernen, Suche, Lager, Editorhistorie, UI und Python-Dateiformaten.
- [History-Labor](../../experiments/feature-lab/history/HISTORY-EVALUATION.md):
  150 Objekte, 50 Edits, 20 Undo/Redo; Snapshots 547,43 ms gegen Deltas 571,09 ms,
  gehaltenes JSON 7.005.848 gegen 158.416 Byte. Dies ist eine mögliche spätere
  Speicherentscheidung, kein Produktionswechsel.
- [UI-Labor](../../experiments/feature-lab/ui/UI-EVALUATION.md): echte Edge-DOM-
  Vergleiche an nachgebildeten Fenstern und getrennte Ansichtsprototypen;
  keine Abnahme des heute integrierten Controllers.

Die neuen Produktionsberichte ersetzen keine historischen Messdaten. Ein
späterer Format-, Speicher- oder UI-Wechsel braucht weiterhin seinen eigenen
Datenvertrag, Invalidierungs-/Abbruchpfad und Nachweis. Die geplante weitere
Ordnung beschreibt der [Strukturplan](../project-structure-plan.md).
