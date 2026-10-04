# Localhost-Labor: getrennte Varianten und Benchmarks

Status: **Experiment, nicht in OpenSlotting eingebunden**. Ausgangspunkt ist
Commit `23148a5` auf `codex/localhost-development`. Die Anwendung, ihr
Python-Server, ihre Workspace-Datenbank und die Release-Paketliste sind unverändert.

## Zweck und Grenzen

| Vorhandenes Feature | Varianten im Labor | Erhaltene Grundlage |
| --- | --- | --- |
| Arbeitsbereich öffnen / Import und Analyse im Worker | neuer Blob-Worker pro Vorgang; neuer statischer Modul-Worker; wiederverwendeter statischer Modul-Worker | exakt die aktuellen Workspace-Vorbereitungsfunktionen und Fachmodule |
| Originaldateien lokal speichern | IndexedDB-ArrayBuffer; OPFS über asynchronen Dateistream; OPFS über synchronen Zugriff im dedizierten Worker | vollständige Originalbytes, SHA-256-Vergleich nach jedem Lesen |
| Arbeitsbereichssicherung | unverpackte JSON-Bytes; Browser-/Node-Gzip und Deflate; Python-Standardbibliothek Gzip Stufe 1/6/9 | bestehendes Workspace-JSON als unverändertes Innenformat |
| Sicherungsparser / Base64-Validierung | bisheriger gruppierter RegExp; linearer Zeichenscan; begrenzte Zeichenklassenprüfung | dieselbe gültige Base64-Syntax und unveränderte Workspace-Migration |

Feste Modulpfade vereinfachen den Localhost-Worker und erlauben eine Struktur
ohne kopierte Factory-Quelltexte. Worker-Wiederverwendung und Kompression wären
teilweise auch früher möglich gewesen: sie sind keine neu erfundenen
Localhost-Fähigkeiten. OPFS wird an der tatsächlichen Browserfähigkeit geprüft.
Ein Python-Datenbackend, SQLite, Service Worker und SharedArrayBuffer werden
hier nicht in die Anwendung eingeführt.

## Ordner

```text
localhost-lab/
├── README.md, EVALUATION.md          # Ausführung, Bewertung und Grenzen
├── index.html, serve.py             # eigene Laboroberfläche / statischer Server
├── modules/                        # verwertbare Entwürfe mit kleinen Schnittstellen
├── workers/                        # statische Worker-Einstiegspunkte
├── benchmarks/                     # Browserlauf, Node/Python-Lauf, synthetische Daten
├── tests/                          # Labor-Logik-/Fehler-/Serverprüfungen
├── tools/                          # Inventar und unveränderte Kernel-Extraktion
├── generated/                      # ignorierter Kernel aus aktuellem app.js
└── results/                        # Messreihen und sichtbare Ergebnisnachweise
```

Der [Projektstrukturplan](../../docs/project-structure-plan.md) ordnet alle
vorhandenen Dateigruppen einem möglichen Ziel zu. Es wurden keine
Anwendungsdateien dafür verschoben.

## Browserlauf in Microsoft Edge

Aus dem Projektordner:

```powershell
python experiments/localhost-lab/serve.py
```

Dann in Edge öffnen:
`http://127.0.0.1:8876/experiments/localhost-lab/index.html`.
Der normale Anwendungsport 8765 wird nicht verwendet. `--port 0` wählt einen
freien Testport und gibt die konkrete URL aus. Der Server erzeugt vorher den
Kernel aus dem aktuellen `app.js`. Beenden mit Strg+C im zugehörigen Terminal.
Er läuft ausschließlich auf `127.0.0.1`; es gibt keine Upload-/Daten-API und
`connect-src 'none'` bleibt gesetzt.

Die Schaltfläche startet alle Vergleiche und zeigt Mediane sowie rohe Samples.
Variantenreihenfolge wird pro Wiederholung rotiert. Der erste Worker-Vorgang
und Folge-Vorgänge werden getrennt ausgewiesen. Alle Worker übertragen
Originalbuffer in beide Richtungen; der neue Adapter erfindet keinen Vorteil
gegenüber einer vermeintlich bisher kopierenden Implementierung.

Jede Prüfung nutzt deterministische synthetische Daten, darunter ungültige
Mengen/Datumswerte, mehrzeilige Quotes, Quellfilter, Aufbereitungsregeln,
Artikelstammkonflikte und Artikel ohne Bewegung. Die ganze vorbereitete
Workspace-Payload wird verglichen, nicht nur die Anzahl importierter Zeilen.
Die Sicherung enthält im aktuellen Laborstand auch normalisierte Ergebnisse,
Prüfhinweise, Spaltenprofile und Artikelregister. Der produktive Backup-Parser
wird separat gegen das erzeugte JSON geprüft. Bei einem vorhandenen Parserfehler
bleibt dieser sichtbar; ein erzeugter Laborparser mit ausschließlich ersetzter
Base64-Prüfung muss die vollständige Workspace-Struktur korrekt wiederherstellen.

## Weitere reproduzierbare Läufe

Node ist ein bereits vorhandenes Entwicklerwerkzeug, keine neue Voraussetzung
für Endnutzer. Es werden keine npm-/pip-Pakete benötigt oder installiert.

```powershell
python experiments/localhost-lab/tools/build-kernel.py
node --test experiments/localhost-lab/tests/modules.test.cjs
python -m unittest discover -s experiments/localhost-lab/tests -p "test_python.py" -v
node experiments/localhost-lab/benchmarks/run-node.cjs 20000 7
python experiments/localhost-lab/tools/audit-project.py --output experiments/localhost-lab/results/project-inventory.json
```

Der Node/Python-Benchmark startet pro Codecvariante einen eigenen Prozess,
führt einen ungemessenen Aufwärmlauf und anschließend sieben Messungen aus.
Node und Python werden getrennt ausgewiesen. Prozessstart, JSON-Erzeugung und
JSON-Vertragsprüfung liegen außerhalb der Codec-Zeit. Die Node-Spitzen-RSS
gilt für den gesamten Kindprozess inklusive Datenaufbau und Prüfung; Python-
RSS wird nicht behauptet. `OPENSLOTTING_LAB_PYTHON` kann einen bereits
vorhandenen, freigegebenen Interpreter auswählen.

## Entwurfsschnittstellen

### `modules/worker-session.mjs`

`new WorkspaceSession(variant).run(message, { timeoutMs, onProgress })`
verwendet das bestehende Worker-Nachrichtenformat (`record`, `backupText`,
`backupExport`). Eine Session verarbeitet genau einen Vorgang gleichzeitig.
`close()` bricht eine offene Aufgabe ab und beendet den Worker. Fehler und
Timeouts beenden ihn; ein späterer Vorgang kann einen neuen Worker erzeugen.
Bei Übernahme wären Workspacewechsel, Speicherfreigabe, veraltete Antworten,
Revisionen und Abbruchverhalten im Controller gesondert zu prüfen.

### `modules/source-stores.mjs`

`openIndexedDBSourceStore`, `openAsyncOpfsSourceStore` und
`openSyncOpfsSourceStore` liefern `write(bytes)`, `read()` und `cleanup()`.
Dies ist bewusst nur ein Entwurf für **Originalbytes**, keine zweite fertige
Arbeitsbereichsdatenbank. Der synchrone Adapter behält die Buffer des Aufrufers
und überträgt eine Kopie in den Worker; deren Aufwand ist in der gemessenen
Schreibzeit enthalten.

### `modules/backup-codec.mjs` / `modules/backup_codec.py`

`encodeBackup` / `decodeBackup` bzw. `encode` / `decode` arbeiten ausschließlich
auf explizit übergebenen Bytes. Decoder begrenzen die entpackte Ausgabe und
lehnen beschädigte Eingaben ab. Python liest keinen Benutzerordner; seine
Benchmarks erhalten dieselben synthetischen JSON-Bytes über eine lokale Pipe.
Eine komprimierte Datei wird vom aktuellen OpenSlotting-Restore noch nicht
erkannt. Vor einer Übernahme sind Dateityp-/Versionskennung, Bestands-JSON,
Grenzwerte, Abbruch und Wiederherstellung gemeinsam festzulegen.

### `modules/base64-validation.mjs`

`isBase64Linear(value)` und `isBase64Chunked(value)` ersetzen die unbegrenzt
wiederholte RegExp-Gruppe durch einen linearen Scan bzw. kleine Zeichenklassen-
Prüfungen. Der Kernel-Generator erzeugt einen eigenen Workspace-Parser und
ändert darin ausschließlich diesen Validator. Das bestehende `workspace.js`
bleibt unangetastet. Syntaxgleichheit, beschädigte Eingaben, gefährliche
Objektschlüssel, Originalbytes und Workspace-Vertragsprüfung werden getestet.

## Datenschutz und Bereinigung

Das Labor hat einen eigenen HTTP-Port/Origin und zufällige Speicher-Namensräume
`openslotting-lab-<uuid>`. Es öffnet **nie** `openslotting-workspaces`, greift
nicht auf Betriebsdaten zu und fordert keine Ordnerrechte an. Seine statische
Freigabe enthält nur Laborassets und vier ausdrücklich genannte Fachmodule;
`storage.js`, Anwendungscontroller, Fixtures, Dokumente, Messergebnisse und
Git-Inhalte werden nicht bedient.

Nach einem abgeschlossenen Lauf werden nur die Datenbank/OPFS-Unterordner
dieses Laufs gelöscht; Handles/Worker werden geschlossen. Bei gewaltsamem
Tab-/Browserabbruch kann ein Laborrest bleiben. Er liegt im getrennten
Labor-Origin und kann über dessen Edge-Websitedaten entfernt werden. Niemals
die Websitedaten des Anwendungsports 8765 dafür löschen.

## Lesereihenfolge

1. [Strukturplan](../../docs/project-structure-plan.md)
2. [Bewertung und Messgrenzen](EVALUATION.md)
3. `results/edge-run-*.json` und `results/backup-node-python.json`
4. Module und ihre Laborprüfungen

Eine positive Labormessung ist weder eine Integrationsentscheidung noch eine
Release-/Firmenfreigabe. Echte breite Exporte, Browserquota, Neustart-/Crash-
Verhalten, mehrere Tabs und komplette UI-Abläufe bleiben eigene Nachweise.
