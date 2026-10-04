# Workspace, Oberfläche und Localhost-Ressourcen

Stand: 2026-10-05. Baseline vor dieser Integration: `db39ffa` auf
`codex/localhost-development`. Die neuen Module sind produktiv eingebunden.
Python verwendet ausschließlich seine Standardbibliothek; alle Nutzerdaten
werden weiterhin im Browser verarbeitet und in IndexedDB gespeichert.

## Eingebaute Änderungen

| Bereich | Änderung | Erhaltener Vertrag / Kosten |
| --- | --- | --- |
| Worker | Fester Einstieg `src/workers/workspace-worker.mjs`, direkt exportierte gemeinsame Vorbereitung, eine sequentielle Session | Gleicher Parser/Fachkern; vollständige Ausgabe und Quellbytes; keine Installation oder Codegenerierung aus `toString()` |
| Lifecycle | Task-ID, Workspace-Revision, Ende bei Abbruch/Fehler, 30 Sekunden Idle, 5 Minuten seit letzter Workerantwort | Späte Antworten dürfen keinen neuen Vorgang abschließen; keine unbeschränkte Workeranzahl |
| Import und Analyse | Erste Spaltenprofile und erneute Analyse im Worker | Schutzkopie der aktiven Quellbytes vor Transfer; ursprüngliche Ansicht bleibt abbrechbar, zusätzlicher temporärer Byte-Puffer |
| Speicherung | Guard vor vollständigen/Metadaten-Saves während einer Dateilesung; Freigabe vor atomarem Commit | Datenbankschema, Chunkstores, Revisionen, Quota-/Mehrtabschutz und Sicherungsformat unverändert |
| Sprache | Hintergrundrefresh mit Rücknahme bei Abbruch/Fehler | Alte Sprache und alte Diagnostik bleiben zusammen; kein Speichern gemischter Sprachzustände |
| Tabellen | Nur sichtbare Quell-/Terminalzeilen behalten; bestehende Virtualisierung mit geordnetem DOM-Abgleich | Kein Pool für alle Zeilen; Invalidierung bei Quelle/Analyse, Regeln, Filtern, Spaltenreihenfolge und Sprache; korrekte Originalzeilen/ARIA, Fokus-Fallback |
| Sicherungen | Base64-Zeichenprüfung in begrenzten Abschnitten | Gleiche Padding-/Tag-/Schema-Prüfung; große Bytes erzeugen keinen Regexp-Stackfehler; keine neue Sicherungsvariante |
| Python-Assets | Bytes und SHA-256-ETags nur für ausdrücklich erlaubte UI-Dateien | Revalidierung mit `no-cache`; HTML/Health/Fehler `no-store`; geänderte Datei invalidiert Eintrag; keine CSVs, Backups oder Workspace-Daten im Servercache |

Beim Öffnen werden geladene Buffer direkt übertragen. Beim Profilieren und
Neuberechnen wird nur der enge Berechnungssnapshot kopiert, ohne alte große
Ergebnislisten. Es wird keine pauschale Zero-copy- oder Peak-Speicher-Zusage
für die Gesamtanwendung gemacht. Abbruch beendet Berechnung; die UI verbietet
ihn vor Beginn der atomaren Speicherung. Ein Speichern bleibt ein eigener,
bestätigter Vorgang mit sichtbaren Fehlern.

## Reproduzierbarer Browservergleich

Der getrennte Entwicklerhelper unter `tools/benchmarks/serve.py` liest die
tatsächlichen vier Baseline-Fabriken und Workerfunktionen aus Git, ohne Branch
oder Dateien dieser Basis zu verändern. Generierter Code bleibt in ignoriertem
`dist/performance-browser/`. Er stellt ausschließlich benannte UI-/Harnessdateien
auf IPv4-Loopback bereit. Sein begrenztes `connect-src 'self'` dient dem Lesen
des Quellenmanifests; die produktive CSP bleibt `connect-src 'none'`.

```powershell
python tools/benchmarks/serve.py --port 8877
```

Die Seite `http://127.0.0.1:8877/tools/benchmarks/browser-worker.html` erzeugt
synthetische Daten: Unicode, führende Nullen, Mengen jenseits sicherer Number-
Ganzzahlen, duplizierte Header, Quotes/mehrzeilige Felder, fehlende Lieferdaten
und eine explizite Ausschlussregel. Keinerlei Betriebsdaten werden geladen.
Ein erster Aufruf je Variante steht separat; nach einem Warmup folgen fünf
Proben in wechselnder Reihenfolge. Quelle kopieren, Workerstart, Transfer,
Verarbeitung und vollständige Antwort sind enthalten. Erzeugen der Fixture,
Prüfen/Hashen der Ausgabe und Fortschrittsdarstellung stehen außerhalb der Zeit.
Browser-/OS-Caches werden nicht gelöscht: frisch bedeutet neue Workerinstanz.

Die gesamte vorbereitete Ausgabe wird kanonisch als Zeichenfolge verglichen,
mit exakt getaggten BigInt-Werten und unveränderter Arrayreihenfolge. Außerdem
werden zurückgegebene Quellbytes byteweise mit der erhaltenen Vorlage verglichen.
SHA-256, Größen, erster Aufruf, alle Samples, Quellenhashes und Reihenfolge
stehen im JSON. Direkte und Worker-Profil-/Analysepfade verwenden dieselbe
Snapshotkopie; rAF-/Timer-/Long-Task-Beobachtung bewertet Reaktionsfähigkeit.
Dies ist kein Benchmark des kompletten DOM, Layouts, Datenträgers oder GPU.

Details: [BROWSER-WORKER.md](../../tools/benchmarks/BROWSER-WORKER.md).

### Gemessener nativer Edge-Lauf

Edge **154.0.4258.53**, Windows, 2026-10-05, eigene Testorigin 58666;
ein Warmup und fünf Proben je Reihe. Mediane inklusive Snapshotkopie und
vollständiger Workerantwort, Millisekunden:

| Workspace-Vorbereitung | Alter Blob-Worker, neu je Task | Modul-Worker, neu je Task | Modul-Worker wiederverwendet |
| --- | ---: | ---: | ---: |
| 1000 Zeilen | 102,3 | 110,1 | 53,9 |
| 10.000 Zeilen | 513,4 | 520,3 | 448,5 |

Wiederverwendung spart in diesen warmen Reihen rund 47 % bzw. 13 % gegenüber
dem alten Worker. Ein neuer Modul-Worker war hier etwas langsamer als der neue
Blob-Worker. Der erste Aufruf der aktuellen Session lag bei 104,7 bzw. 542,1 ms;
die Ersparnis gilt für Folgeaufgaben innerhalb der Idle-Lebensdauer. Es wird
keine allgemeine Beschleunigung jedes Kaltstarts behauptet.

| 10.000 Zeilen | Direkter Browserthread | Wiederverwendeter Worker |
| --- | ---: | ---: |
| Spaltenprofil, gesamte Operationszeit | 117,4 ms | 156,6 ms |
| Neuanalyse, gesamte Operationszeit | 205,6 ms | 292,8 ms |
| Median maximaler Timerverzögerung, Profilprobe | 116,2 ms | 16,2 ms |
| Median maximaler Timerverzögerung, Analyseprobe | 204,5 ms | 19,0 ms |

Diese Aufgaben haben Transfer-/Nachrichtenkosten und benötigen hier mehr
Gesamtzeit. Die Timerprobe beobachtete dafür deutlich weniger Verzögerung am
Browserthread. Sie enthält zwei Drainframes und ist kein Klick- oder
vollständiger Oberflächenbenchmark. Die rAF-Probe meldete trotz sichtbarem
Dokument rund 1007-ms-Abstände in beiden Verfahren. Die Ursache wurde in diesem
Lauf nicht aufgeklärt; diese Werte begründen keine Aussage über UI-Bildrate
oder flüssige Animation. Long-Task-Zähler sind ebenfalls nur Beobachtungen.

**Alle vollständigen Ergebnisvergleiche und ursprünglichen Quellbytes stimmen
überein.** Daten, Methodik, Min/Median/Max, erste Aufrufe, jede Probe und die
Quellenhashes: [browser-worker-edge.json](results/browser-worker-edge.json).
[Screenshot des abgeschlossenen nativen Laufs](results/browser-worker-edge.png).

## Tatsächliche Anwendungsabläufe

Die produktive Anwendung lief unter `http://127.0.0.1:58665/index.html` in
einem getrennten Testorigin. Das normale `127.0.0.1:8765` wurde nicht verwendet.
Der Codex-In-App-Browser wurde für folgende sichtbare Abläufe verwendet:

- Source-only-Sicherung mit 1000 Zeilen wiederhergestellt; nach zusätzlichem
  CSV-Import beide Quellen separat erhalten, 1996 gültige Zeilen und vier
  Zeilen ohne Lieferdatum sichtbar.
- Analyse und Sprachwechsel Deutsch/Englisch im neuen Worker erfolgreich;
  exakte Menge `0.1234567` und IDs mit führenden Nullen bleiben erhalten.
- Quelltabelle: Sprung zu Zeile 501 sowie im 50.000-Zeilen-Workspace zu 50.001;
  Originalwerte und `aria-rowindex` stimmen, nur 22 bzw. 16 Datenzeilen im DOM.
  Fehlerfilter zeigt die erwarteten Originalzeilen 2 und 999.
- Terminal: optionale Artikelbezeichnung gegen Kunden-ID ausgetauscht;
  gleiche Spaltenanzahl zeigt neue Überschrift und korrekte neue Zellwerte.
  Tabellenregion ist als Tastatur-Fallback fokussierbar.
- Wochenvergleich KW39/KW40: 490/70 Zeilen und Mengen 60,493783/8,641969
  für den synthetischen Doppelimport, sechs unbekannte Tage in KW40.
- Source-only-Sicherung mit 50.000 Zeilen und 7.172.803 Quellbytes erfolgreich
  wiederhergestellt: 49.949 gültige Zeilen. Dies deckt den früheren großen
  Base64-Stackfehler im Browserpfad ab.
- Beschädigte Base64-Sicherung abgewiesen; vorhandene zwei Workspaces erhalten.
  Abgebrochene erneute Wiederherstellung lässt ebenfalls zwei Workspaces und
  die zuletzt aktive Quelle unverändert; anschließende Bedienung wieder aktiv.
- Regalassistent, Undo/Redo, Draufsicht und separate lesende 3D-Auswertung
  geöffnet: 1 Objekt/18 Stellplätze; keine Stammlocations in dieser Fixture.

Der native Edge-Start zeigt Localhost und den Workspacekatalog. Die Extension
verweigert aktuell `setFiles` ohne „Zugriff auf Datei-URLs zulassen“; diese
Browserberechtigung wurde nicht geändert. Deshalb bestätigen die beschriebenen
Produktabläufe die In-App-Browserausführung, keine vollständige Firmen-Edge-
Abnahme. Der separate native Workerbenchmark erzeugt seine Fixture selbst und
benötigt keinen Dateidialog. Ein IAB-Downloadereignis ließ sich nicht zuverlässig
auslesen; es wird keine erfolgreiche manuelle Dateiexportabnahme behauptet.
Die Serializer-/Formelabsicherungs-/Backup-Tests bleiben der automatisierte
Nachweis, die Edge-Dateiausgabe ein eigener Prüfpunkt.

## Grenzen und weitere Abnahme

Automatisierte Logik-/Protokolltests prüfen Abbruch vor Dispatch, Import-Save-
Guard, Sprachrollback, gemeinsame Profil-/Analysetasks, Bounded-Rowcache/Fokus,
große Sicherungen mit 8-MiB-Quellbytes und Browserdecoder ohne Node-Buffer.
Die vollständige Produktionssuite besteht den finalen Lauf mit **294/294
Tests**, ohne ausgelassene Tests. Beide Launcher-Logiksuiten bestehen jeweils
unter PowerShell 7 und Windows PowerShell 5.1. Produktions-JS/Modulsyntax und
`git diff --check` sind geprüft. Tatsächlich ausgeführt wurde Python 3.13.14; 3.8-Kompatibilität
ist zusätzlich statisch geprüft, kein behaupteter Lauf auf einer 3.8-Installation.

Vor einer Firmenfreigabe bleibt die [Localhost-Abnahme](../acceptance-localhost.md)
am konkreten ausgepackten Git-Kandidaten offen: genehmigter Python-/Edge-Pfad,
normale Start-/Stop-/Shortcutabläufe, echte Dateidialoge und Downloads, vollständige
Mapping-/Stamm-/Mehrtab-/3D-Bedienung sowie realistische Spalten-/Dateibreiten.
Die historischen Portable-Abnahmen sind weiterhin ihrem alten Stand zugeordnet.
