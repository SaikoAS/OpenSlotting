# Python-IO-Labor

Isolierte Format-/Werkzeugalternativen unter der schon vorhandenen Python-Voraussetzung. Python-Standardbibliothek, kein Server, keine Daten-API, keine Pakete. `sqlite3` ist eine optionale Standardbibliotheksfunktion der vorhandenen Python-Distribution; fehlt sie, bleibt SQLite als Variante unverfügbar. Für dieses Labor wird nichts installiert.

- `io_lab.py`: positionsgebundene CSV-Zeilen nach JSON, NDJSON, NDJSON+gzip oder SQLite mit TEXT-Zeilenarrays projizieren.
- `test_io_lab.py`: Originalbyte-/SHA-, Spaltenpositions-, Text-, Quellenzeilen-, Kodierungs- und Artefaktgrenztests.
- `run_benchmarks.py`: deterministische 1000-/10000-Zeilen-Fixtures, Aufbau/Lesen/Filter und getrennte Python-Allokationsspitze.
- `results/python-io.json`: Einzelproben und Quellhashes nach Benchmark.
- `PYTHON-IO-EVALUATION.md`: Ergebnisbewertung.

```powershell
python -B experiments/feature-lab/python-io/test_io_lab.py
python -B experiments/feature-lab/python-io/run_benchmarks.py
```

Benchmarks erst starten, wenn parallele Browser-/CPU-Messungen abgeschlossen sind. `-B` vermeidet zusätzliche Bytecode-Dateien im Projekt.

Ein vollständiges Paket enthält `source.bin` mit unveränderten Originalbytes, SHA-256 und Manifest plus getrennte Projektion. Die Originalquelle ist die verlustlose Autorität; Textfelder und Zahlen bleiben Strings. Originalbytes werden nicht aus CSV-/JSON-Feldern rekonstruiert. Doppelte Header werden als Liste erhalten; die Quelle wird anhand numerischer Positionen adressiert. Die Zeilen speichern CSV-Datensatzindex und physische Quellzeilenspanne, inklusive mehrzeiliger Quotes.

Die Veröffentlichung nutzt eine Umbenennung eines vollständigen temporären Verzeichnisses im selben Elternordner. Das ist eine lokale Sichtbarkeitsgrenze für **ein Artefakt**, keine Browser-/Workspace-Transaktion, kein Crash-Durability-Beweis und kein Schutz gegen parallel veränderte Quelldateien. Bestehende Ausgaben werden abgewiesen. Fehlversuche bereinigen nur das eigene temporäre Verzeichnis.

SQLite hält das vollständige rohe Feldarray in TEXT. Ein zusätzlicher Index auf Rohposition 0 dient ausschließlich dem synthetischen Filtervergleich. Er interpretiert weder ERP-Feldnamen noch Mengen. Keine Übernahme in `storage.js`, keine Datenbankmigration, keine automatische Browserkommunikation.
