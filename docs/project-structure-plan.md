# Projektprüfung und Strukturplan

Stand: 2026-10-04. Inventar-Ausgangspunkt: `codex/localhost-development`, Commit
`23148a5d2548080d6d253ee9ae66bd4cb5494f5f`. Die damaligen Größen und Zählungen
bleiben unten als Referenz gekennzeichnet.

Der vollständige Ordnerumzug ist weiterhin **nicht ausgeführt**. Nach der
getrennten Laborphase wurden ausgewählte Änderungen in die aktive
Localhost-Anwendung integriert: statischer Modul-Worker, exportierte
Workspace-Vorgänge, Workerwiederverwendung, Profilierung/Neuanalyse im Worker,
begrenzte Zeilenwiederverwendung, Base64-Korrektur, Periodenindex,
Terminal-Suchtexte, Lagerprüfung/-Framepuffer und statische HTTP-Caches.
Die [aktuelle Architektur](architecture.md) und
[Produktions-Funktionsmatrix](performance/README.md) beschreiben diesen Stand.

Das [Localhost-Labor](../experiments/localhost-lab/README.md) und
[Feature-Labor](../experiments/feature-lab/README.md) bewahren die getrennten
Varianten und ihre ursprünglichen Messungen. Historische „nicht integriert“-
Aussagen gelten für die damalige Laborphase. Weitere Import-/Exportformate,
Spalteninterpretation, Vollindizes, Speicher-/History-Alternativen und neue
UI-Entwürfe bleiben eigenständige Experimente.

## Umfang der Prüfung

Alle Dateien außerhalb der internen Git-Datenbank werden inventarisiert:
Pfad, Größe, SHA-256, Git-Zuordnung und Zweck. Bei versionierten Textdateien
werden zusätzlich Zeilenzahl und lokale Markdown-Verweise geprüft.
Quellcode, Browser-Skriptfolge, Worker-Erzeugung, Datenspeichervertrag,
Python-Freigabeliste, Windows-Startwege, Tests, Benchmarks, CI und
Paketdateiliste wurden als zusammenhängende Start-/Verarbeitungskette gelesen.
`dist/` und `__pycache__/` werden als erzeugte Dateien erfasst, nicht entfernt.
Browserdaten liegen außerhalb des Projektordners und werden nicht ausgelesen.

Der reproduzierbare Inventarlauf steht unter
`experiments/localhost-lab/tools/audit-project.py`; sein vollständiger lokaler
JSON-Bericht enthält auch die Dateizuordnung. Git-Interna, Browserprofile und
betriebliche Dateien außerhalb dieses Ordners gehören nicht zum Prüfumfang.
Dies ist eine Struktur- und Modulprüfung, keine abgeschlossene Sicherheitsprüfung
jeder möglichen Eingabe oder eine Freigabe aller Oberflächenabläufe.

## Befund zum inventarisierten Ausgangsstand

| Bereich | Befund | Konsequenz |
| --- | --- | --- |
| Projektwurzel | 39 Anwendungs-/Startdateien neben allgemeinen Dokumenten; Browsercode, Stile und Windows/Python-Helfer liegen zusammen. | Benutzerbefehle sichtbar lassen; interne Dateien nach Verantwortung ordnen. |
| `app.js` | 8.364 Zeilen / 430.781 Bytes im Ausgangsstand. Übersetzungen, DOM, Importsteuerung, Worker-Quellbau, Workspace-Lifecycle, Ansichten und Exporte hängen an einem Controller. | Größter Wartungsschwerpunkt; nach Funktionen und Anwendungsvorgängen teilen, nicht nur in beliebige kleine Dateien schneiden. |
| `csv.js` | 3.544 Zeilen; bestehender Decoder/Streaming-Parser und exakte Mengenlogik funktionieren bereits. | Fachvertrag bewahren; Parser, Mapping/Regeln, Profile, Registry und Aggregation später separat exportieren. |
| Arbeitsbereiche | `workspace.js` validiert/migriert Schema 13; `storage.js` speichert atomar in IndexedDB Version 3. | Datenformat und Speicheradapter getrennt behandeln. Umstrukturierung darf keine Datenmigration erzwingen. |
| Worker | Factory- und Funktionsquellen werden mit `toString()` zu einem Blob zusammengesetzt. Der Worker wird für einen Vorgang neu erstellt. | Feste Modul-Worker und kontrollierte Wiederverwendung werden durch den einheitlichen HTTP-Start einfacher. |
| Lager | Modell, Geometrie, Renderer, Editor und lesende Analyse sind schon eigene Dateien. | Diese fachlichen Grenzen beibehalten; Geometrie darf auch künftig unabhängig von DOM/WebGL getestet werden. |
| Tests | 30 Dateien in `tests/` und `test-data/`, davon auch zwei Windows-Suiten; manche Worker-Tests extrahieren Funktionen aus `app.js`. | Tests nach Verantwortung gruppieren; bei späterem Funktionsumzug direkte Exporte statt Quelltextgrenzen prüfen. |
| Benchmarks | Drei vorhandene Node-Werkzeuge. Speichervergleich nutzt eine IndexedDB-Nachbildung; Suchvergleich enthält Projektionsaufbau nicht vollständig in der schnellen Messphase. | Frühere Zahlen sind keine aktuelle Edge-Speichermessung. Aufwand, Warmzustand und Messgrenzen explizit angeben. |
| Dokumentation | 23 Markdown-Dateien im Ausgangsstand, einschließlich synthetischer Testdatenbeschreibung und historischer Abnahmen. Lokale Verweise sind erreichbar. | Aktuelle Bedienung, Verträge, Entwicklungsunterlagen und historische Nachweise unterscheiden. |
| Erzeugte Dateien | 60 Dateien in `dist/`, ca. 0,89 MiB, darunter ältere ZIPs und Prüfextraktionen; zusätzlich Python-Cache. | Keine aktuelle Produktquelle; später je Kandidat mit Commit und Prüfbericht ablegen. Historische Belege nicht pauschal löschen. |
| Abhängigkeiten | Kein npm-/pip-Paketvertrag, kein Framework/Bundler, Python-Server nur Standardbibliothek. | Struktur benötigt keinen Build-Schritt und keine zusätzliche Installation für Nutzer. |
| Auslieferung | Explizite Python-Dateifreigabe und explizite Git-Paketliste. Tests/Fixtures/Labor sind ausgeschlossen. | Umzüge müssen HTML-Verweise, Imports, Freigabe, Launcher, Paketliste und Tests zusammen ändern. |

Die Inventargrößen gehören zum genannten Commit; zusätzliche Labor- und
Produktionsmodule sowie Berichtsdateien verändern die spätere Gesamtzahl.
Insbesondere beschreibt die Blob-Worker-Zeile den früheren Aufbau; der aktuelle
Worker hat einen festen Modulpfad. Der Audit kann jederzeit wiederholt werden.

## Bereits ergänzte Produktionsstruktur

| Aktueller Pfad | Integrierte Verantwortung | Grenze des Schritts |
| --- | --- | --- |
| `src/application/workspace-preparation.js` | Profilierung, Vorbereitung/Restore und Neuanalyse als direkte Exporte; vorhandene Fachkerne gemeinsam nutzen | Keine zweite Parser-/Mengenlogik; Workspace-Vertrag bleibt im bisherigen `workspace.js` |
| `src/application/worker-session.js` | Einen Task mit Task-ID/Revision ausführen; Worker wiederverwenden und bei Leerlauf, Fehler oder Abbruch freigeben | Keine alternative Speichertransaktion oder unbegrenzte Workerflotte |
| `src/workers/workspace-worker.mjs` | Statischer, lokaler Modul-Einstieg statt aus Funktionsquellen erzeugtem Blob | Fachmodule liegen weiterhin in der Wurzel; ihre Imports sind ausdrücklich freigegeben/verpackt |
| `src/ui/shared/windowed-dom.js` | Nur sichtbare Quell-/Terminalzeilen nach Eingabe und Darstellung wiederverwenden | Bestehende Virtualisierung bleibt; keine vollständige UI-Verlagerung |
| `periods.js`, `terminal.js` | Begrenzter Datumsindex und private Locale-Suchprojektionen | Vollständige Fachkennzahlen, alte Exporte und bestehende Viewcaches erhalten |
| `warehouse.js`, `warehouse-webgl.js` | Geometrie je Prüfung und Puffer je Frame vorbereiten | Layout/Sperren/Historie unverändert; keine über Aufrufe gehaltenen Geometriecaches |
| `workspace.js`, `Start-OpenSlotting-Localhost.py` | Stapelsichere Base64-Prüfung; ETag-Revalidierung erlaubter statischer Dateien | Schema 13, IndexedDB-Version 3 und Origin unverändert; Python verarbeitet keine Nutzerdaten |
| `docs/performance/` | Aktuelle Produktionsentscheidungen, Einzelberichte und synthetische Rohmessungen | Historische Labore behalten ihre eigenen Quellen und Referenzstände |

Diese Schritte schaffen die ersten Zielgrenzen, ohne sämtliche vorhandenen
Dateien zu verschieben. `app.js` bleibt der Controller und enthält weiterhin
große UI-/Lifecycle-Bereiche. Python mit Standardbibliothek bleibt die einzige
zusätzliche Nutzerabhängigkeit; ein Framework-/Build-Schritt wurde nicht nötig.

## Vorgeschlagene Zielstruktur

Die folgende Gesamtstruktur ist das weitere Ziel. Bereits vorhanden sind
einzelne `src/application`-, `src/workers`- und `src/ui/shared`-Module sowie
`docs/performance`; die übrigen Umzüge werden dadurch nicht als erledigt markiert.

```text
OpenSlotting/
├── index.html                       # kleine Anwendungshülle; bekannte URL bleibt
├── Start-OpenSlotting.cmd            # sichtbare Benutzerbefehle
├── Stop-OpenSlotting.cmd
├── Install-OpenSlotting.cmd
├── Remove-OpenSlotting.cmd
├── OpenSlotting.ico
├── README.md, LICENSE, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md
├── src/
│   ├── domain/
│   │   ├── import/                   # Decoder, CSV, Mapping, Regeln, Profile
│   │   ├── analysis/                 # Artikel-, Kunden-, Auftrags-/Periodenlogik
│   │   └── warehouse/                # Layout, Kollisionen, Codes, Geometrie
│   ├── application/                  # Importieren, Öffnen, Speichern, Restore
│   ├── persistence/                  # Workspace-Vertrag + IndexedDB-Adapter
│   ├── workers/                      # feste lokale Worker-Einstiegspunkte
│   └── ui/
│       ├── shell/                    # Navigation, Zustand, Übersetzungen
│       ├── shared/                   # Tabellen, Dialoge, Stile
│       └── features/
│           ├── imports/
│           ├── analysis-desk/
│           ├── warehouse-editor/
│           └── warehouse-analysis/
├── runtime/
│   ├── python/                       # statischer Server, keine Nutzerdaten-API
│   └── windows/                      # interne PS-Start-/Stop-/Shortcut-Helfer
├── docs/
│   ├── user/                         # Start, Bedienung, Backup/Umzug
│   ├── contracts/                    # Daten-, Workspace-, Runtime-Verträge
│   ├── development/                  # Architektur, Benchmarks, Strukturentscheidungen
│   ├── performance/                  # aktuelle Produktionsberichte + synthetische Messwerte
│   ├── acceptance/                   # aktuelle Prüflisten
│   └── history/                      # versionierte Nachweise und Portable-Pause
├── tests/
│   ├── domain/
│   ├── application/
│   ├── persistence/
│   ├── runtime/
│   ├── ui/
│   └── fixtures/                     # synthetische CSVs und Testhilfen
├── tools/
│   ├── packaging/
│   └── benchmarks/                   # bestätigte Entwicklungsbenchmarks
├── experiments/
│   ├── localhost-lab/                # historische Worker-/Rohspeicher-/Sicherungsvarianten
│   └── feature-lab/                  # historische und noch nicht übernommene Varianten
├── dist/                            # ignorierte Kandidaten, nach Commit geordnet
└── .github/workflows/
```

**Annahme:** Funktionszuwachs betrifft zunächst dieselbe Browseranwendung.
Ein Monorepo, Plugin-Lader oder Python-Datenbackend ist dafür noch nicht nötig.
Neue Funktionen bekommen erst einen Featureordner, wenn echte UI-/Anwendungs-
Verantwortung entsteht. Gemeinsame Fachregeln bleiben in `domain/`.
Leere Verzeichnisse und vorsorgliche Frameworks werden nicht angelegt.

## Vollständige Zuordnung der vorhandenen Dateigruppen

| Heute | Geplanter Ort / Aufteilung |
| --- | --- |
| `index.html` | Bleibt als Hülle in der Wurzel; neue lokale Skript-/Stilpfade. |
| `app.js` | Weitere UI-/Lifecycle-Bereiche nach `src/ui/shell`, UI-Features und `src/application`; erste Workspace-Vorgänge und Worker-Einstieg sind bereits exportiert. |
| `src/application/*`, `src/workers/*`, `src/ui/shared/windowed-dom.js` | Bereits passende Zielgrenzen; Verantwortung ausbauen, nicht erneut für einen rein kosmetischen Umzug verlagern. |
| `app.css`, `terminal-theme.css` | `src/ui/shared` bzw. `src/ui/features/analysis-desk`. |
| `encoding.js`, `csv.js` | `src/domain/import` und `src/domain/analysis`; keine Änderung an Mengen/Provenienz. |
| `periods.js`, `terminal.js` | `src/domain/analysis`. |
| `workspace.js` | `src/persistence/workspace-contract.js`; Validierung/Migration getrennt vom Adapter. |
| `storage.js` | `src/persistence/indexeddb-repository.js`. |
| `warehouse.js`, `warehouse-scene.js` | `src/domain/warehouse`. |
| `warehouse-webgl.js` | `src/ui/features/warehouse-analysis` oder gemeinsam genutzter Renderer in `ui/shared`; nutzt gemeinsame Geometrie. |
| `warehouse-editor.js`, `warehouse-editor.css` | `src/ui/features/warehouse-editor`. |
| `warehouse-analysis.js` | `src/ui/features/warehouse-analysis`. |
| `runtime.js` | `src/application/runtime-capabilities.js`; loopback-Einstieg bleibt geprüft. |
| `Start-OpenSlotting-Localhost.py` | `runtime/python/server.py`; Root-Ermittlung/Launcher-Identitätsprüfung müssen gemeinsam angepasst werden. |
| `OpenSlotting*.psm1`, alle `.ps1` | `runtime/windows`; vier Standard-`.cmd` bleiben einfache Weiterleitungen. |
| `*-Localhost.cmd` und bekannte alte Einstiegspfade | Für bestehende Firmenverknüpfungen zunächst kompatible Weiterleitungen; erst nach dokumentierter Ablösung entfernen. |
| Root-Dokumente / Icon / Lizenz / `.gitignore` | Bleiben in der Wurzel. |
| `docs/*` | Bedienung → `user`; Verträge → `contracts`; Architektur/Import-/Suchleistung/Plan → `development`; aktuelle `acceptance-*` → `acceptance`; versionierte Abnahmen/Release-Notes/Portable → `history`; aktuelle Produktionsmessungen verbleiben in `performance`. |
| `tests/*.test.cjs`, `*.test.ps1` | Entsprechende Domain-/Application-/Persistence-/Runtime-/UI-Gruppen. |
| `tests/fake-indexeddb.cjs`, `tests/fixtures/*`, `test-data/*` | `tests/fixtures`; Nachbildung weiterhin ausdrücklich keine echte Browsermessung. |
| `tools/package-release.ps1`, `tools/benchmark-*.cjs` | `tools/packaging`, `tools/benchmarks`; relative Root-Ermittlung aktualisieren. |
| `.github/workflows/ci.yml` | Bleibt; explizite Prüfpfade/Kommandos aktualisieren. |
| `dist/*`, `__pycache__/*` | Lokale erzeugte Ausgaben; keine Quelle und keine Nutzerdatenablage. |

## Abhängigkeitsregeln für weitere Features

1. Fachmodule importieren keine DOM-, Speicher-, Netzwerk- oder UI-APIs.
2. Anwendungsvorgänge koordinieren Fachmodule und Adapter; UI ruft Vorgänge auf.
3. Worker benutzen dieselben Fachmodule wie Logiktests. Keine zweite Mengenlogik.
4. Persistenz verändert weder Originalbytes noch Quellen-/Zeilenbezüge. Abgeleitete
   Caches brauchen eine explizite Eingabeversion und Lösch-/Invalidierungsregel.
5. Python bleibt Standardbibliothek und statischer Loopback-Dienst. Ein späterer
   Datenbackend-Vorschlag braucht einen eigenen Datenvertrag und eine gesonderte
   Entscheidung; er folgt nicht automatisch aus der Ordnerstruktur.
6. Neue Laufzeitdateien werden explizit freigegeben und verpackt. `experiments/`,
   Tests, Messwerte, Dokumentquellen und Nutzerdaten werden nicht pauschal bedient.
7. `openslotting-workspaces`, Datenbankversion, Workspace-Schema und
   `http://127.0.0.1:8765` bleiben bei einem reinen Umzug unverändert.
   Die HTTP-Pfadänderung alleine benötigt keine IndexedDB-Migration.
8. Portable bleibt am dokumentierten Ausgangscommit pausiert. Der aktive Baum
   enthält keine zweite portable Featurekopie.
9. Neue Optimierungen behalten den vollständigen Fachvertrag. Eingabeidentität,
   Locale, Revision, Invalidierung und Speicherbudget gehören zur Modulgrenze;
   enge Laborkerne dürfen nicht still vollständige Features ersetzen.

Heute gelten ausdrücklich: maximal ein aktiver Workspace-Worker, Freigabe nach
30 Sekunden Leerlauf, 20 Historieneinträge, 150 Lagerobjekte und 5.000
Stellplätze. Der reine Periodenindex beginnt ab dem zweiten revisionierten
Vergleich und ist auf 512..250.000 Zeilen / 4.096 Datumsschlüssel begrenzt;
breite Abfragen scannen. Diese Grenzen und ausgeschlossene Varianten sind in
der [Funktionsmatrix](performance/README.md) begründet. Keine Änderung verlagert
Importdaten oder Arbeitsbereiche in eine Python-Daten-API.

## Reihenfolge eines späteren Umzugs

1. Pfadliste und Abhängigkeiten festlegen; Ausgangssicherung und exakten Commit erfassen.
2. Windows/Python-Interna bewegen, bekannte Benutzerbefehle/Shortcuts erhalten;
   Ownership-, Port-, Allowlist- und Start-/Stopprüfungen ausführen.
3. Unveränderte Fachmodule bewegen; Imports, HTML, Testpfade und Paketliste anpassen.
4. Weitere Workspace-/UI-Anwendungsvorgänge aus `app.js` herauslösen;
   die bereits direkt exportierten Vorbereitungs-/Worker-Module als Grenze nutzen.
5. UI/Übersetzungen nach Feature teilen; vorhandene Bedienabläufe in Edge abnehmen.
6. Dokumentation/Fixtures/Tools umziehen, lokale Links und ZIP aus dem Kandidaten prüfen.
7. Weitere Laborvarianten nur mit eigener Auswahl, vollständigem Vertrag und
   Messnachweis übernehmen; vom reinen Dateiumzug getrennt prüfen.

Jede Stufe bleibt ein separat nachvollziehbarer Commit. Ein Umzug gilt erst als
abgeschlossen, wenn Starten/Stoppen, bestehende Workspace-Sicherungen, Import/
Regeln, Analyseschreibtisch, Perioden, Lagereditor/3D und ZIP-Auslieferung auf dem
Kandidaten funktionieren. Die Gesamtverlagerung ist noch offen; die oben
genannten gezielten Module und Optimierungen sind bereits Produktionscode.
Node-/Logiktests und vorhandene Labor-Edge-Messungen ersetzen keine vollständige
Abnahme dieses Kandidaten auf Firmen-PC/Edge. Diese bleibt in den aktuellen
Abnahme-/Release-Checklisten und im [Workspace-/UI-Nachweis](performance/workspace-ui.md)
separat ausgewiesen.

## Fortschreibung: Lagerübernahme, 2026-10-09

Die Schema-13-Angaben in der ursprünglichen Bestandsaufnahme und der ersten
Optimierungsphase sind historisch. Für die Übernahme vom 09.10. galt Workspace-Schema 14 mit
Layout-Schema 2 (objects, zones, locations). Dies ist eine fachliche Migration,
kein Ordnerumzug. Die Modulpfade, Datenbankversion 3 und feste Origin bleiben
erhalten. Neue Nachweise: `docs/performance/warehouse-layout-v2.md`.

## Fortschreibung: Modellierwerkzeuge, 2026-10-10

Der aktuelle Arbeitsstand verwendet Workspace-Schema 16 / Layout 4 mit
Gruppen, Verbindungen, Durchfahrten und parametrischen Wand-/Fahrwegmodulen. Bestehende punktbasierte Fahrwege bleiben lesbar. Modell und
gemeinsame Szene bleiben an ihren bisherigen Pfaden; dies ist kein weiterer
Ordnerumzug. Die gemeinsame Bauteilbeschreibung liegt im Modell und wird von
Szene und Kollisionsprüfung verwendet. Eine spätere Aufteilung kann
Bauteilgeometrie und Modellieroperationen als eigene Module übernehmen, muss
aber den gemeinsamen Datenvertrag und die lesende Analyse erhalten.
Die zusätzlichen Funktionen sind implementiert. Automatisierte Funktions-
und Migrationsprüfungen sind im [Projektprüfbericht](project-review-2026-10-10.md)
festgehalten; neue native Edge- und Leistungsnachweise stehen noch aus.
