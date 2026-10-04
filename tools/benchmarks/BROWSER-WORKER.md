# Produktionsworker im Browser vergleichen

```powershell
python tools/benchmarks/serve.py --port 8877
```

Im Browser öffnen:
`http://127.0.0.1:8877/tools/benchmarks/browser-worker.html`.
Dann **Vergleich starten**, Seite im Vordergrund halten und währenddessen
keine weiteren Benchmarks ausführen. Vollständiges JSON steht sichtbar auf der
Seite; **JSON herunterladen** speichert es lokal. Der Helper öffnet keinen Browser.
`Ctrl+C` beendet den Server. Nach Produktionscodeänderungen den Helper neu starten:
Er hält einen festen Asset-Snapshot, dessen SHA-256-Werte im Ergebnis stehen.

Python-Standardbibliothek reicht für den Helper. Git wird als bereits vorhandenes
Entwicklerwerkzeug zum Lesen von `db39ffa` verwendet. Keine Installation,
kein Nutzerdatenzugriff, keine IndexedDB und kein Upload. Produktivserver und
dessen Allowlist werden nicht geändert. Der separate Server bindet ausschließlich
`127.0.0.1`; nur sieben ausdrücklich genannte Produktionsassets und die vier
Harness-/generierten Assets sind erreichbar. Unbekannte Pfade werden abgewiesen.

## Vergleich und Vertrag

1000 und 10000 deterministische synthetische CSV-Zeilen mit UTF-8/Unicode,
führenden Nullen, sehr großen BigInt-Mengen, fehlenden Datumswerten, duplizierten
Headern, Quotes/mehrzeiligen Feldern und einer expliziten Ausschlussregel.
Alle Verfahren erhalten denselben Record. Es gibt drei Workspace-Reihen:

1. Originaler Blob-Worker: Fabriken und Funktionen aus `db39ffa:app.js` samt
   damaligen Modulen. Originaler Konstruktor und Dispatch bleiben unverändert;
   der Host-Namensraum wird isoliert. Jede Aufgabe erstellt/terminiert einen Worker.
2. Aktueller statischer Modul-Worker mit tatsächlicher WorkerSession, pro Aufgabe
   eine neue Instanz einschließlich deren Beendigung.
3. Derselbe aktuelle Worker mit tatsächlicher Session-Wiederverwendung.

Pro Reihe erster Aufruf separat, ein Warmup, fünf gewertete Samples.
Die Reihenfolge wird rotiert und in jedem zweiten Durchgang umgedreht.
„Erster Aufruf“ bezeichnet den ersten Aufruf **dieser Reihe**. HTTP-/OS-Caches
werden nicht gelöscht; spätere Reihen können bereits geladene Assets verwenden.
„Frisch“ bezeichnet eine neue Workerinstanz. Das JSON enthält jede Reihenfolge,
jeden Einzelwert und Min/Median/Max. Ein Warmup/erster Aufruf gehen nicht in
die Fünf-Sample-Statistik ein.

Die Zeit umfasst die identische Fixturekopie, Workerstart, Transfer,
Verarbeitung und vollständige Antwort. Die Kopie wird zusätzlich ausgewiesen.
Ein produktives IndexedDB-Laden wird nicht nachgebildet. Die ursprünglichen
Fixtures bleiben im Browser ansprechbar; jede zurückgegebene Source wird
byteweise damit verglichen. Der gesamte vorbereitete Output wird kanonisch
serialisiert (Schlüssel sortiert, Arrayreihenfolge beibehalten, BigInt typgenau)
und als ganze Zeichenfolge verglichen. Dazu stehen UTF-8-Länge und SHA-256 im
JSON. Hashing, Prüfung und Fortschrittsdarstellung liegen außerhalb der Zeit.
Bei Abweichung stoppt der Lauf mit Fehler; er bestätigt keinen Vergleich.

## Reaktionsfähigkeit: optional, standardmäßig aktiv

Der aktuelle gemeinsame Produktionscode für Profiling und Analyse wird direkt
im Browserthread und im wiederverwendeten Worker ausgeführt. In beiden Fällen
ist der enge Berechnungssnapshot samt `ArrayBuffer.slice` enthalten. Die
Vorbereitung der Profile für die Analyse liegt separat unter `fixtureSetup`.
Die vollständigen Ergebnisse müssen wiederum übereinstimmen.

Zusätzlich beobachtet die Seite rAF-Abstände, die Verzögerung eines 16-ms-Timers
und, soweit verfügbar, Long Tasks. Zwei Frames vor und nach der Aufgabe dienen
dem Probeaufbau/Drain und liegen außerhalb der Operationszeit. Diese Beobachtung
beweist keine konkrete Tabellen-/Layout-/Anwendungsleistung und keine kontrollierte
Speicherersparnis. GC, Scheduler und Hintergrundprogramme bleiben mögliche
Streuungsquellen. Eine während eines Samples unsichtbare Seite macht den Lauf
ungültig. Die JSON-Datei wird auch nach einem Fehler/Abbruch angeboten, enthält
aber ausdrücklich keinen erfolgreichen Gesamtnachweis.

Nur Artefakte vorbereiten, ohne Serverstart:

```powershell
python tools/benchmarks/serve.py --build-only
```

Generierte Dateien liegen ausschließlich in ignoriertem
`dist/performance-browser/`. Es werden keine Laufzeitergebnisse erfunden; die
Native-Browserausführung erfolgt anschließend separat.
