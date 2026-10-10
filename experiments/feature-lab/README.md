# Feature-Labor für die Localhost-Fortsetzung

Stand: 2026-10-04. Referenz: `59525a447004396b47747f587c7ba14511357719`
auf `codex/localhost-development`.
**Alle neuen Module bleiben Experimente. Keine Einbindung in OpenSlotting.**
Es werden keine Anwendungsdateien verschoben. Python bleibt die einzige
zusätzliche Voraussetzung für Benutzer; alle Python-Werkzeuge verwenden die
Standardbibliothek. Node ist ein bereits vorhandenes Entwicklerwerkzeug.

## Lesen und ausprobieren

- [Gesamtbewertung und Funktionsmatrix](EVALUATION.md)
- [Import, Export und Interpretation](io/IO-EVALUATION.md)
- [Mathematische Analyse](analysis/ANALYSIS-EVALUATION.md)
- [Lager, Profile und Workspace-Projektionen](warehouse/WAREHOUSE-EVALUATION.md)
- [UI und Steuerung veralteter Ergebnisse](ui/UI-EVALUATION.md)
- [Python-Dateiformate](python-io/PYTHON-IO-EVALUATION.md)
- [Suche und Sortierung](search/EVALUATION.md)
- [Editorhistorie](history/HISTORY-EVALUATION.md)
- Bereits vorhandene Varianten für Worker, Originalbytes, Sicherungen:
  [Localhost-Labor](../localhost-lab/EVALUATION.md)
- [Strukturplan](../../docs/project-structure-plan.md)

```text
feature-lab/
├── README.md, EVALUATION.md     # Zusammenhang, Entscheidungen, Grenzen
├── serve.py                    # nur statische Labor-UI, explizite Freigabe
├── io/                         # Import, Export, Spalteninterpretation
├── analysis/                   # genaue Kerne, Index und Periodenadapter
├── warehouse/                  # Geometrie, Zuordnung, Profile, Projektionen
├── search/                     # Suche/Sortierung und Indexkosten
├── python-io/                  # Dateiroundtrips; kein Datenserver
├── history/                    # Snapshots/Deltas, bestätigte Undo-/Redo-Schritte
├── shared/                     # isolierte Steuerungsbausteine
├── ui/                         # native HTML-Ansichten und echte DOM-Messung
├── tests/                      # statischer Laborserver
└── results/                    # Gesamtvalidierung und Quellenhashes
```

## Browserlauf

```powershell
python experiments/feature-lab/serve.py
```

In Edge öffnen: `http://127.0.0.1:8877/experiments/feature-lab/ui/index.html`.
`--port 0` nutzt einen freien Port und gibt die genaue URL aus. Beenden mit
Strg+C. Der normale Anwendungsport 8765 wird nicht verwendet.

Die UI bietet drei Ansichten: Quellspalten prüfen, einen Artikel untersuchen
und Zeiträume vergleichen. Alle Daten sind synthetisch. Mappingbestätigung
ändert nur Labor-Arbeitsspeicher. Es gibt keine Dateiannahme, Upload-/Daten-API,
Arbeitsbereichsdatenbank, Installation oder Verbindung zu externen Diensten.
Der Server bindet ausschließlich `127.0.0.1`, prüft den Host und lässt nur die
aufgezählten UI-Dateien sowie das unveränderte `terminal.js` zu. Die CSP behält
`connect-src 'none'` bei. Die Ergebnisdateien werden nicht über HTTP angeboten.

Die Benchmarkschaltfläche vergleicht drei Verfahren mit derselben aktuellen
Virtualisierung, sieben Spalten und 10.000/50.000 synthetischen Quellzeilen.
Fixtureaufbau bleibt außerhalb; Erstaufbau und Folgeupdates sind getrennt.
Ein Aufwärmlauf und fünf rotierte Samples enthalten jeweils 80 Updates mit
Tabellen-Layoutlesung. Keine FPS- oder vollständige Anwendungszeitmessung.
Die Ergebnisse erscheinen als JSON; gespeicherte Läufe stehen in `ui/results`.

## Prüfungen

Keine Pakete installieren. Im Projektordner:

```powershell
node --test tests/*.test.cjs
node --test experiments/feature-lab/io/tests/io.test.cjs
node --test experiments/feature-lab/analysis/tests.test.cjs
node --test experiments/feature-lab/warehouse/tests.test.mjs
node --test experiments/feature-lab/shared/task-gate.test.mjs experiments/feature-lab/ui/table-model.test.mjs experiments/feature-lab/ui/data-fixture.test.cjs
node --test experiments/feature-lab/search/tests/search.test.cjs
node --test experiments/feature-lab/history/tests.test.cjs
python -m unittest discover -s experiments/feature-lab/tests -p test_server.py -v
python -m unittest discover -s experiments/feature-lab/python-io -p test_io_lab.py -v
```

Weitere Befehle stehen in den Teilordnern. Benchmarks **nacheinander** ausführen:
Indexaufbau, Cache-Misses, Cache-Hits und Dateiroundtrips sind unterschiedliche
Operationen. Ergebnisse verschiedener Engines werden nicht zu einer einzigen
Rangliste vermischt. Ein schneller enger Kernel ersetzt keinen vollständigen
Fachvertrag.

Das sichtbare Interpretationsbeispiel lässt sich mit
`node experiments/feature-lab/ui/data/generate.cjs` aus derselben getesteten
Fixture/Engine erneut erzeugen. `python experiments/feature-lab/tools/verify.py`
prüft Produktionsumfang, Paketliste, Dokumentverweise und Quellhashes.

## Gemeinsame Verträge

Originalbytes, physische Spaltenposition, doppelte Header, Datei-/Zeilenbezug,
führende ID-Nullen, unbekannte Daten und negative Korrekturen bleiben erhalten.
Mengen werden in Schritten von `10^-7` mit BigInt bzw. unveränderten Texten
gehalten. Keine automatische Deduplizierung, ERP-Auslegung oder Profilübernahme.
Indizes sind abgeleitete, wegwerfbare Zustände mit expliziter Gültigkeit.
Workspace-Migration, Revisionen und atomare Speicherung bleiben Aufgabe der
vorhandenen Anwendung. Der TaskGate schützt ausschließlich synchrone Übernahme
von Berechnungsergebnissen; er ist keine Datenbanktransaktion.
