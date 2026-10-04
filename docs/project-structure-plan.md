# Projektprüfung und Strukturplan

Stand: 2026-10-04. Ausgangspunkt: `codex/localhost-development`, Commit
`23148a5d2548080d6d253ee9ae66bd4cb5494f5f`.
Auf Wunsch wird dieser Plan **noch nicht als Dateiumzug ausgeführt**.
Neue Funktionsvarianten stehen ausschließlich im [Localhost-Labor](../experiments/localhost-lab/README.md).

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

## Befund zum Ausgangsstand

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
Berichtsdateien verändern die spätere Gesamtzahl. Der aktuelle Audit kann
jederzeit wiederholt werden.

## Vorgeschlagene Zielstruktur

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
│   └── localhost-lab/                # unbestätigte Varianten und eigene Ergebnisse
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
| `app.js` | `src/ui/shell`, UI-Features und `src/application`; Workspace-Worker-Vorgänge nach `src/workers`. |
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
| `docs/*` | Bedienung → `user`; Verträge → `contracts`; Architektur/Import-/Suchleistung/Plan → `development`; aktuelle `acceptance-*` → `acceptance`; versionierte Abnahmen/Release-Notes/Portable → `history`. |
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

## Reihenfolge eines späteren Umzugs

1. Pfadliste und Abhängigkeiten festlegen; Ausgangssicherung und exakten Commit erfassen.
2. Windows/Python-Interna bewegen, bekannte Benutzerbefehle/Shortcuts erhalten;
   Ownership-, Port-, Allowlist- und Start-/Stopprüfungen ausführen.
3. Unveränderte Fachmodule bewegen; Imports, HTML, Testpfade und Paketliste anpassen.
4. Workspace-Anwendungsvorgänge aus `app.js` herauslösen, direkt testbare Exporte schaffen.
5. UI/Übersetzungen nach Feature teilen; vorhandene Bedienabläufe in Edge abnehmen.
6. Dokumentation/Fixtures/Tools umziehen, lokale Links und ZIP aus dem Kandidaten prüfen.
7. Erst nach eigener Auswahl eine Laborvariante übernehmen; diese nicht nebenbei
   mit dem reinen Dateiumzug vermischen.

Jede Stufe bleibt ein separat nachvollziehbarer Commit. Ein Umzug gilt erst als
abgeschlossen, wenn Starten/Stoppen, bestehende Workspace-Sicherungen, Import/
Regeln, Analyseschreibtisch, Perioden, Lagereditor/3D und ZIP-Auslieferung auf dem
Kandidaten funktionieren. Die heutige Arbeit führt diese Stufen noch nicht aus.
