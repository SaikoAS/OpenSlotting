# Analyse-Labor

Status: **getrennte Experimente, keine Einbindung in OpenSlotting**.
Alle Eingaben der Messreihen sind deterministisch erzeugte Daten. Die Dateien
`csv.js`, `periods.js`, `terminal.js`, die Anwendung und ihre Datenbank werden
nur gelesen. Python bleibt die einzige Voraussetzung für die Benutzer; Node
ist hier ausschließlich das vorhandene Entwicklungswerkzeug.

## Ausführen

```powershell
node --test experiments/feature-lab/analysis/tests.test.cjs
node --expose-gc experiments/feature-lab/analysis/benchmark.cjs
```

Der Benchmark schreibt die Rohmesswerte nach
`results/node-benchmark.json`. Er erzeugt drei getrennte Node-Prozesse für
1.000, 10.000 und 50.000 Zeilen. Fünf warme Samples pro Variante werden in
wechselnder Reihenfolge gemessen. Er vergleicht 1, 8 und 32 unterschiedliche
Abfragen und weist Aufbauzeit sowie zusätzliche gehaltene Speichermengen aus.
Der vollständige Vergleich nutzt die **aktuelle Single-Pass-Implementierung**
aus `periods.js`, keine erfundene langsamere Altimplementierung.

## Varianten

| Modul | Inhalt | Grenze |
| --- | --- | --- |
| `exact-kernel.cjs` | Map-Gruppierung; Dictionary plus BigInt-Spalte; nachgewiesene BigInt64-Spalte mit Fallback | nur exakte Mengen und Zeilenzahlen, kein Ersatz für alle Analysemetriken |
| `range-engine.cjs` | Tagespräfixsummen; Artikel/Kunden/Auftrag-Postings; vollständiger Periodenadapter | zusätzlicher unveränderlicher Index im RAM, Neuaufbau bei Datenrevision |
| `distinct-engine.cjs` | Dictionary-Codes und exakte Bitset-Kardinalität | eigene Schlüssel für Core-Aufträge und kundenbezogene Terminal-Aufträge, keine Addition von distinct counts |
| `fixtures.cjs` | synthetische Zeilen und unterschiedliche überlappende Perioden | keine Aussage über aktuelle Betriebsdaten |
| `tests.test.cjs` | Gleichheit, Grenzfälle, Provenienz, Missingness, Cache-Lebensdauer | Node-Logiknachweis, keine Edge-Abnahme |
| `benchmark.cjs` | Laufzeit, Aufbau und Speicher, vollständige Ergebnisgleichheit | keine UI-/Browser-/Gerätezeit |
| `distinct-benchmark.cjs` | identische Set-/Bitset-Abfragen mit Aufbaukosten | getrennte Mathematikmessung, keine komplette Fachanalyse |

## Schnittstelle

```javascript
const { createRangeEngine } = require('./range-engine.cjs');
const engine = createRangeEngine(normalizedRows, { revision: 'workspace-17-analysis-3' });
engine.queryRange('2025-01-01', '2025-01-31');
// { quantity: BigInt, lines: Number, observedDays: Number }
engine.queryEntity('article', 'A1', '2025-01-01', '2025-01-31');
engine.selectedSummary('article', 'A1', '2025-12-31', 14);
engine.queryChart('2025-01-01', '2025-01-31', 'week', expectedDates, observedDates);
engine.compareFull(periodSettings, featureReadiness, articleRegistry, { locale: 'de' });
engine.dispose();
```

`scopes: []` baut nur den Tagesindex für Perioden/Charts auf;
`scopes: ['article']` ergänzt nur die Artikelpostings. Ein nicht aufgebauter
Entitätsbereich wird mit einem ausdrücklichen Fehler abgewiesen. Ohne Auswahl
werden Artikel, Kunden und die kundenbezogenen Aufträge indexiert.

Die zusätzliche Distinct-Messreihe wird separat gestartet:

```powershell
node --expose-gc experiments/feature-lab/analysis/distinct-benchmark.cjs
```

`quantity` bleibt der bereits normalisierte, mit `10^7` skalierte BigInt.
`lines` zählt Eingabezeilen; duplizierte Dateien/Zeilen werden nicht still
dedupliziert. Artikelstammzeilen (`source_type: article-master`) werden getrennt
gezählt und nicht als Bewegung summiert. Quellzeilenreferenzen im vollständigen
Adapter zeigen auf die ursprünglichen Eingabepositionen.

Die Revision muss beim Aufbau ausdrücklich angegeben werden. Import,
Aufbereitungsänderung oder geänderte normierte Daten erfordern einen neuen
Index. Ein abweichender Revisionsparameter in einer Abfrage löst einen Fehler
aus. Ein entsorgter Index kann nicht erneut abgefragt werden. Die reine
Mathematik ist unabhängig von der Sprache; die aktuellen Suchprojektionen im
vollständigen Adapter werden je Abfragesprache durch den bestehenden Kern
erstellt. Vorhandene UI-Caches für identische Abfragen bleiben ein eigener
Mechanismus: ein erneutes Rendern derselben Ansicht muss nicht erneut rechnen.

Die ausführliche Bewertung und Grenzen stehen in
[ANALYSIS-EVALUATION.md](ANALYSIS-EVALUATION.md).
