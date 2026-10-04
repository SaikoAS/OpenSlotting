# Bewertung der getrennten Localhost-Experimente

Datum: 2026-10-04. Ausgangscommit: `23148a5d2548080d6d253ee9ae66bd4cb5494f5f`.
**Keine Variante ist in die Anwendung oder das Release-Paket eingebunden.**
Der [Strukturplan](../../docs/project-structure-plan.md) ist ebenfalls noch kein Dateiumzug.

## Entscheidungsvorschlag

| Entwurf | Bewertung | Sinnvoller nächster Schritt nach ausdrücklicher Auswahl |
| --- | --- | --- |
| Stapelsichere Base64-Prüfung | Höchste Priorität wegen reproduziertem Fehler im bestehenden Edge-Restore, unabhängig von Geschwindigkeit. Begrenzte Zeichenklassenprüfung ist schneller als der reine Zeichenscan. | Kleine gezielte Parseränderung mit großer Browserregression; keine Format-/Datenbankänderung nötig. |
| Wiederverwendeter Modul-Worker | Gute Grundlage für Wartung und kleine wiederholte Aufgaben. Bei größeren Importen nur mäßiger Zeitgewinn. | Workspace-Anwendungsvorgänge direkt exportieren; Abbruch, Revisionen, Sprach-/Workspacewechsel und Speicherfreigabe integrieren und in Edge prüfen. |
| Neuer Modul-Worker je Vorgang | Bessere Modulgrenze, aber kein belastbarer Geschwindigkeitsvorteil gegenüber Blob. | Architekturentscheidung nach Wartbarkeit; nicht als Importbeschleunigung verkaufen. |
| Gzip-Sicherungsumschlag | Großer Platzgewinn auf den getesteten repetitiven Workspace-JSONs; zusätzlicher Pack-/Entpackaufwand und weiterhin erhebliche RAM-Kosten. | Optionales Format neben bestehenden JSON-Dateien, mit Erkennung, Ausgabegrenze und vollständigem Restore. |
| OPFS mit synchronem Worker | Beste Byte-Lesezeiten, auch nach eingerechneter Schreibkopie. Noch kein Ersatz für atomare Workspace-Speicherung. | Nur einen Originalbyte-Adapter plus Manifest-/Journal-/Recovery-Vertrag weiter untersuchen. |
| OPFS über asynchronen Stream | Weniger Komplexität als eigener Sync-Worker, hier meist langsamer. | Vergleichs-/Fallbackkandidat; nicht pauschal übernehmen. |
| Python-Gzip | Standardbibliothek reicht; Stufe 1 schneller und größer, Stufe 9 kleiner und langsamer. | Allenfalls ausdrücklich gewähltes lokales Hilfswerkzeug; heutige Browserdaten müssen dafür nicht an Python übertragen werden. |

## Umgebung und Methodik

- Windows x64, Intel Core i9-12900F, 24 logische CPUs, ca. 63,9 GiB RAM.
- Edge meldete `Edg/154.0.0.0`; HTTPS-kompatibler sicherer Kontext auf
  `http://127.0.0.1:49450`, separater Labor-Origin; API-Quotameldung ca. 10 GiB.
- Node `v24.18.1`, Python `3.13.14`. Keine Installation, keine npm-/pip-Pakete.
- Deterministische synthetische Daten; keine Betriebsdaten. 1.000, 20.000 und
  50.000 Importzeilen sowie 1/8 MiB Originalbyte-Payloads.
- Edge-Lauf 1: fünf Wiederholungen, 20.000 Zeilen. Lauf 2: sieben,
  20.000 Zeilen. Lauf 3: fünf, 50.000 Zeilen plus vollständige analysierte Sicherung.
- Abschließender Lauf 4: sieben Wiederholungen mit 20.000 Zeilen und einer
  analysierten Sicherung auf dem finalen Modulstand.
- Reihenfolge der Varianten rotiert pro Wiederholung. Tabellen zeigen den
  Median aller Aufgaben einschließlich des ersten Auftrags. Einzelwerte,
  erster Auftrag und Folgeaufträge stehen getrennt in den JSON-Dateien.
- Das Labor misst `performance.now()`. Kein erzwungenes Browser-GC, keine
  behaupteten Browser-RSS-/Worker-Spitzenwerte, kein physisch kalter Disk-Cache.
- Beim Import ist Fixture-Klonen außerhalb der Zeit, Nachrichtentransfer,
  Worker-Erzeugung, Vorbereitung und Rückgabe innerhalb. Alle Varianten
  nutzen denselben unveränderten Fachcode und Transferbuffer.
- Ergebnisfingerprints und Originalbyte-SHA-256 werden nach jedem Auftrag
  verglichen. Das umfasst Zeilen, exakte BigInt-Mengen, Quellen/physische
  Zeilen, Aufbereitungsregeln, Filter, Hinweise, Spaltenprofile und Registry.
- Codeczeiten schließen JSON-Erzeugung, Vertragsprüfung und Prozessstart
  aus. Das ist keine Messung der ganzen Backup-Bedienaktion.
- Node/Python laufen pro Variante in getrennten Prozessen mit einem
  Aufwärmlauf plus sieben Samples. Enginewerte nicht als Edgewerte ausgeben.

Die alten drei Projektbenchmarks bleiben bestehen. Ihre früheren Zahlen sind
keine aktuellen Vergleichsbelege; insbesondere ist eine IndexedDB-Nachbildung
keine Browser-/Datenträgermessung.

## Import und Analyse: tatsächlicher Worker-Pfad

Zeit in Millisekunden, gesamte Workspace-Vorbereitung inkl. Quelle mit
Artikelstammkonflikten. Die Berechnungen wurden aus `app.js` extrahiert,
nicht vereinfacht oder durch einen anderen Mengen-/Validierungsalgorithmus ersetzt.

| Lauf / Zeilen | Blob neu | Modul neu | Modul wiederverwendet | Zeitersparnis Wiederverwendung gegenüber Blob |
| --- | ---: | ---: | ---: | ---: |
| Lauf 1 / 1.000 | 112,0 | 126,8 | 59,3 | 47,1 % |
| Lauf 2 / 1.000 | 100,0 | 113,4 | 56,3 | 43,7 % |
| Lauf 2 / 20.000 | 799,1 | 812,6 | 725,2 | 9,2 % |
| Lauf 3 / 1.000 | 103,5 | 108,5 | 52,0 | 49,8 % |
| Lauf 3 / 50.000 | 1.918,6 | 1.911,4 | 1.798,5 | 6,3 % |
| Lauf 4 / 1.000 | 100,6 | 111,9 | 54,6 | 45,7 % |
| Lauf 4 / 20.000 | 808,8 | 814,4 | 720,6 | 10,9 % |

Alle vorbereiteten Payloads und Originalbytes waren identisch. Die größeren
Läufe zeigen, dass Berechnung und Datentransfer weiterhin dominieren. Ein
einzelner 50.000-Zeilen-Lauf ohne diese Schlussfolgerung könnte den geringen
Unterschied zwischen frischem Blob- und Modul-Worker überbewerten.
Statische Imports alleine machen die gleiche Fachlogik nicht automatisch schneller.

**Offen:** über lange Sitzungen gebundener Speicher, mehrere Dateibreiten/
Encodings, 700.000 Zeilen, Abbruch während Datenübertragung, zweite Tabs,
Revision-/Antwortverwechslung und komplette Workspace-/UI-Abläufe. Eine
Session ohne diese Lebenszyklusregeln wird nicht zur Produktivlösung.

## Originalbytes: echte Browser-Speicheroperationen

Lauf 3, Median in Millisekunden; SHA-256 nach jedem Lesen gleich.

| Größe | IndexedDB schreiben / lesen | OPFS async schreiben / lesen | OPFS Sync-Worker schreiben / lesen |
| --- | ---: | ---: | ---: |
| 1 MiB | 4,7 / 1,7 | 4,2 / 1,5 | 1,8 / 0,3 |
| 8 MiB | 26,4 / 9,1 | 14,4 / 5,0 | 10,4 / 2,3 |

Im wiederholten 20.000-Zeilen-Lauf lagen die 8-MiB-Werte bei 21,3/9,2 ms
für IndexedDB und 7,7/2,2 ms für den Sync-Worker. Richtung bestätigt,
absolute Schreibwerte schwanken. Der erste Lauf war bei mehreren Varianten
langsamer; sämtliche Samples bleiben einsehbar.

**Messgrenze:** verglichen wird ein `ArrayBuffer`-Quellrecord, nicht die ganze
bestehende Workspace-Datenbank. Der IndexedDB-Vorgang endet mit dem
Standard-Commit; der OPFS-Stream mit `close()`, der Sync-Zugriff mit `flush()`.
Es ist kein Powerloss-/Datenträger-Durabilitätsvergleich. Der Sync-Worker hält
sein exklusives Handle für die Laufreihe offen. Sein Initialisieren wird
separat als `openMs` ausgewiesen; die Bufferkopie beim Schreiben ist gemessen.

Die aktuelle Anwendung schreibt Quellen, Manifest, Zeilen, Hinweise und
Artikelregister in **einer IndexedDB-Transaktion**. OPFS + IndexedDB wären
zwei Speicherbereiche ohne solche gemeinsame Transaktion. Vor einer Auswahl
braucht es atomare Veröffentlichungsregeln, unveränderliche Source-IDs,
Journal/Recovery, Verwaistenbereinigung, Revisionen, Migration, Quota-/Crash-
Tests und sicheren Backup-/Restore. Die schnellste Byteoperation allein
rechtfertigt diesen Aufwand noch nicht.

OPFS bleibt im Browserprofil und Origin; es ist kein frei sichtbarer Firmen-
oder Serverordner. Es gibt keinen automatisch haltbaren Datensicherungsgewinn.

## Sicherungen: Größe, Zeit und tatsächlicher Wiederherstellungsfehler

Lauf 3 benutzt ein analysiertes synthetisches Workspace mit 50.000 Zeilen.
Das JSON enthält Originalbytes, normalisierte Zeilen, Fehler-/Filterhinweise,
Spaltenprofile, Aufbereitungsregeln und Artikelregister.

| Umschlag | Bytes | Anteil des JSON | Packen ms | Entpacken ms |
| --- | ---: | ---: | ---: | ---: |
| Unverpacktes JSON | 80.023.683 | 100 % | 15,6 | 20,8 |
| Browser Gzip | 2.036.751 | 2,55 % | 353,1 | 77,1 |
| Browser Deflate | 2.036.739 | 2,55 % | 357,7 | 78,9 |

Identity misst lediglich Bytekopien, da das heutige Format keinen Codec
benötigt. Der Gzip-Platzgewinn liegt hier bei ca. **97,5 %**. Das sind
repetitive synthetische JSONs. Zwei frühere, nicht fertig analysierte
Workspace-Fixtures lagen bei ca. 87,4 % Ersparnis; deren Zahlen dürfen nicht
mit der vollständigen Sicherung gleichgesetzt werden. Eine Zufallsbyte-
Regression bestätigt, dass Kompression bei hohem Informationsgehalt nahezu
keinen Platzgewinn haben kann.

Gzip bietet gegenüber Deflate einen geläufigen Datei-Umschlag bei hier nur
12 Bytes Mehrgröße. Kompression ist keine Verschlüsselung und macht sensible
Originaldateien in einer Sicherung nicht anonym.

Im abschließenden 20.000-Zeilen-Edge-Lauf schrumpften 32.276.141 Bytes auf
826.965 Bytes Gzip; Packen 145,3 ms, Entpacken 36,0 ms. Hier akzeptierten sowohl
der bestehende als auch der Kandidatenparser die Sicherung. Der gesonderte
große Base64-Validatorvergleich reproduzierte weiterhin den Stackfehler des
bisherigen Validators. Der Befund ist damit größenabhängig und wird nicht
pauschal für jede Sicherung behauptet.

### Befund am aktuellen Parser

Im ersten großen Lauf brach das bestehende `workspace.js` bei `parseBackup()`
ab: `RangeError: Maximum call stack size exceeded` in `base64ToBuffer`, Zeile
1344. Quelle: 3.485.721 Bytes Auftragsdatei (zusammen mit Artikelstamm
3.485.845 Bytes); Base64-Prüfstring: 4.647.628 Zeichen. Der gruppiert wiederholte
RegExp überfordert in diesem Edge-Lauf den Stack. Import/Analyse waren bereits
bei allen Varianten korrekt abgeschlossen. Dieser fehlgeschlagene Lauf bleibt
als `edge-run-3-failed.json` erhalten; er wird nicht als erfolgreicher Volltest gezählt.

Die Laboralternative ersetzt **nur die Base64-Syntaxprüfung** im erzeugten
Workspace-Modul. JSON-Sicherheitsprüfung, typisierte Werte, Schema-Migration
und vollständige Workspace-Validierung bleiben aus dem bestehenden Modul.
Die komplette entpackte Struktur stimmt mit der aktuellen
`validateWorkspace()`-Struktur überein. Auch im erfolgreichen Laborlauf wird
der bestehende Parserfehler separat ausgewiesen, statt ihn zu verdecken.

| Validator / 4.647.628 Zeichen | Ergebnis | Median ms, gültiger + beschädigter String |
| --- | --- | ---: |
| Bisheriger gruppierter RegExp | Stackfehler | keine gültige Vergleichszeit |
| Linearer Zeichenscan | angenommen / abgelehnt korrekt | 41,6 |
| Begrenzte Zeichenklassenprüfung | angenommen / abgelehnt korrekt | 24,8 |

Das ist ein Robustheitsbefund, kein sinnvoller Geschwindigkeitsfaktor
gegenüber einem abstürzenden Ausgangspfad. 4.013 begrenzte Syntaxfälle wurden
gegen den bestehenden RegExp verglichen; zusätzlich beide Kandidaten mit
8 MiB Quellbytes, beschädigten Eingaben und unsicheren Objektschlüsseln geprüft.
Eine spätere gezielte Produktkorrektur wäre unabhängig von Kompression sinnvoll.

### Python-/Node-Vergleich für eine analysierte 20.000-Zeilen-Sicherung

Identischer Eingang: 32.276.141 JSON-Bytes. Sieben Samples nach Aufwärmlauf.

| Engine / Codec | Ausgangsbytes | Packen ms | Entpacken ms |
| --- | ---: | ---: | ---: |
| Node Gzip | 826.965 | 90,50 | 70,02 |
| Node Deflate | 826.953 | 86,47 | 69,74 |
| Python Gzip 1 | 1.274.640 | 52,96 | 89,92 |
| Python Gzip 6 | 828.019 | 129,46 | 88,45 |
| Python Gzip 9 | 703.396 | 295,73 | 90,49 |

Node-Spitzen-RSS: ca. 597 MiB beim Identity-Prozess, 731 MiB bei Gzip und
723 MiB bei Deflate. Darin stecken Fixture-Erzeugung, vollständige JSON-
Validierung und Codec; daraus lässt sich **keine reine Codec-Spitzenspeicher-
Ersparnis** ableiten. Python-Speicher wurde nicht gemessen. Diese Zahlen sind
kein Browservergleich und begründen keinen Wechsel zu einer Python-Daten-API.

## Prüfungen und Nachweise

- Bestehende Anwendungssuite: **248/248** Node-Tests bestanden.
- Labor: **11/11** Node-Tests; Python-Codec-/Serverprüfungen **2/2** bestanden.
- Beide Windows-Launcher-Suiten unter PowerShell 5.1 und 7 bestanden.
- Edge: zwei abgeschlossene Ausgangsreihen (20.000) und ein vollständiger
  Kandidatenlauf (50.000) sowie eine abschließende 20.000-Zeilen-Reihe mit
  analysierter Sicherung, jeweils Byte-/Payloadgleichheit geprüft.
- Gesonderter großer Ausgangslauf scheiterte an der dokumentierten Base64-
  Prüfung; seine Import-/Speicherteilergebnisse sind als Teilresultate erkennbar.
- Module: Fehler-/Timeout-/Abbruchverhalten, Syntax, beschädigte/zu große
  Sicherungen, kleine Syntaxgleichheit und unveränderte Produktionsanbindung geprüft.
- Laborserver: fremder Host abgelehnt; nicht freigegebene Anwendungs-/Git-/
  Ergebnisdateien 404; POST/PUT/DELETE 501; CSP-Verbindungsblock erhalten.

Rohdaten: `results/edge-run-1.json`, `edge-run-2.json`, `edge-run-3.json`,
`edge-run-3-failed.json`, `edge-run-4.json`, `backup-node-python.json`. Frühere nur auf Quellbytes
basierende Codecwerte bleiben in `backup-source-only-node-python.json`.
Die Screenshots der abgeschlossenen Laufreihen zeigen die sichtbaren Ergebnisse.
Die lokale vollständige Datei-Inventur ist reproduzierbar und wird nicht
als automatisch aktuelle Messdatei in Git gespeichert.

Keine dieser Prüfungen ist eine vollständige Firmen-/Releasefreigabe.
Insbesondere noch offen: breite echte Exporte, Edge auf dem Zielrechner mit
Firmenrichtlinien, Langzeitverbrauch, Quota/Powerloss/Crash, mehrere Tabs,
Legacy-Workspace-Restore und sämtliche produktiven Bedienpfade.

## Technische Quellen

API-Verträge wurden am 2026-10-04 nachgelesen; Projekt- und Messergebnisse
stammen aus dem lokalen Code bzw. den genannten Rohdaten:

- [Worker-Konstruktor und Moduloption](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker)
- [OPFS-Sync-Handle: dedizierter Worker und exklusiver Zugriff](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle)
- [CompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)
- [Python gzip Standardbibliothek](https://docs.python.org/3/library/gzip.html)
