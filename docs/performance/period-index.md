# Produktiver Periodenvergleich: Änderungen und Messung

Stand: 2026-10-04. Der beschränkte reine Datumsindex ist jetzt in `periods.js`
implementiert. Er verwendet weiterhin den vorhandenen vollständigen Fachkern,
kein enger Quantity-Prototyp ersetzt die bisherigen Kennzahlen.

## Änderungen

1. Zeitraumvalidierung erfolgt einmal pro Vergleich statt für jede Zeile
   erneut. Auch Aufrufer ohne Cache werden dadurch schneller.
2. Für ausdrücklich revisionierte Analysezeilen wird ab dem zweiten
   Vergleich ein Datumsindex aufgebaut. Der erste Vergleich scannt direkt.
3. Der Index enthält nur sortierte Datumsstrings, flache originale
   `Uint32Array`-Zeilenreferenzen und Tagesoffsets. Er kopiert keine Zeilen,
   erzeugt keine Entitätsindizes und hält keine fertigen Fachanalysen.
4. Schmale A/B-Kandidatensätze werden vereinigt und nach ursprünglichem
   Zeilenindex sortiert. Überlappende Zeiträume erhalten dieselbe Zeile in
   beiden Akkumulatoren; duplizierte Quellen bleiben separate Zeilen.
5. Bei mehr als 50 % Kandidaten wird direkt gescannt. Große/unerwartete
   Eingaben bleiben ebenfalls im sicheren Scanpfad.
6. Die Coverage zählt Zeilen ohne bekanntes Lieferdatum jetzt nicht mehr
   einem Zeitraum zu. Der reproduzierte `delivery_date: null`-Fehler ist
   ausdrücklich behoben; fehlende Exporttage bleiben unbekannt, kein Nullbedarf.

Alle Mengen bleiben BigInt; Umsatz, Einheitenbeziehungen, Distinct-Metriken,
Readiness, Stammnamen, Namenskonflikte, Artikelreihenfolge, CSV-Ausgabe und
`order_line_refs` werden weiterhin durch den vorhandenen Kern bestimmt.

## Revisions- und Speichervertrag

Die bisherigen fünf Argumente bleiben kompatibel und verwenden den Scan.
Die Anwendung kann einen unveränderten Analysezustand ausdrücklich markieren:

```javascript
periods.comparePeriods(rows, settings, core.analyzeRows, readiness, registry, {
  indexRevision: analysisResult
});
```

Der `WeakMap`-Schlüssel ist das Zeilenarray. Eine neue Revision oder geänderte
Arraylänge ersetzt den Cacheeintrag. Ein neu erzeugtes Worker-Ergebnis besitzt
einen neuen Analysezustand. Bei einer **In-place-Änderung von Lieferdatum oder
Zeilenreihenfolge** muss der Aufrufer ausdrücklich invalidieren oder eine neue
Revision übergeben:

```javascript
periods.invalidateComparisonIndex(rows);
```

Quantitäten, Umsatztexte, Namen und Readiness werden nicht gecacht; ihre
aktuellen Werte werden weiterhin bei jedem Vergleich gelesen. Die Anwendung
ändert ihre Analysezeilen nicht in-place. Für unrevisionierte veränderliche
Eingaben bleibt der Scan sicher. `comparisonIndexInfo(rows)` liefert reine
Status-/Speicherzahlen und keine Nutzerdaten.

Grenzen pro Analyseinput:

- unter 512 Zeilen: kein Index;
- über 250.000 Zeilen: Scan;
- über 4.096 unterschiedliche Datumsstrings: Scan;
- höchstens ungefähr 1 MiB gehaltene Referenz-/Offset-Arrays bei diesen Grenzen;
- bei einer kurzen einzelnen Abfrage kein Indexaufbau;
- keine globale Liste starker Referenzen auf alte Ergebnisse.

Ein Regressionstest mit `WeakRef` und explizitem GC zeigt, dass der Cache auch
einen Revisionszyklus `revision.rows -> rows` nicht am Leben hält. Explizite
Invalidierung und Schrumpfen unter die Mindestgröße entfernen einen Eintrag.

## Reproduzieren

```powershell
node --test tests/periods.test.cjs tests/period-index.test.cjs
node --expose-gc tools/benchmark-period-index.cjs
```

`--quick` beschränkt die Messung auf 1.000/10.000 Zeilen.
`--baseline-ref <Git-Commit>` erlaubt einen anderen vorhandenen Basisstand.
Standardbasis ist `db39ffaca31ebeddec884413c38725f4fd38a5a0` und dessen
unveränderte `periods.js`; alle Varianten nutzen denselben aktuellen CSV-Kern.

Vollständige Rohdaten:
[period-index.json](results/period-index.json).

## Messergebnisse

Windows x64, vorhandenes Node v24.18.1, Intel Core i9-12900F. Synthetische
bekannte Lieferdaten, 200 Artikel, 97 Kunden, drei Quellen und 365 Tage.
Bekannte Daten ermöglichen vollständige Gleichheit zur Git-Basis; der alte
Null-Coverage-Fehler wird separat durch Regressionstests geprüft.
Je Workload drei warme Samples, Variantenreihenfolge rotiert, GC außerhalb
der Zeitmessung. Ergebnisgleichheit ist außerhalb der Messung geprüft.
Kurze parallel ausgeführte Regressionen können die lokale Maschinenlast
beeinflusst haben. Die Serie ist kein garantierter Prozentvorteil.

32 unterschiedliche schmale, teilweise überlappende Periodenabfragen,
Mediane in Millisekunden:

| Zeilen | unveränderte Git-Basis | aktueller Scan | aktueller Index warm | adaptive kalte Gesamtfolge | Indexaufbau |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 146,04 | 41,37 | 39,47 | 40,28 | 0,28 |
| 10.000 | 1.218,77 | 221,75 | 207,92 | 211,48 | 0,34 |
| 50.000 | 5.459,12 | 487,94 | 431,14 | 436,89 | 1,59 |

Der größte Gewinn kommt aus der einmaligen Validierung der Zeitraumgrenzen.
Der Index spart bei 50.000 Zeilen danach zusätzlich etwa 12 % gegenüber dem
bereits verbesserten Scan. Er wird nicht als alleinige Ursache des gesamten
Vorteils dargestellt. Eine einzelne kalte Abfrage baut keinen Index:
bei 50.000 Zeilen 18,53 ms, gegenüber 17,76 ms ungecachetem Scan und
172,62 ms Git-Basis; kleine Unterschiede der aktuellen Pfade sind Messrauschen
und zusätzliche Cacheverwaltung.

Breite Perioden bleiben im Scan. Acht breite Vergleiche bei 50.000 Zeilen:
Git-Basis 3.057,55 ms; aktueller Scan 1.685,73 ms; warmer Cachepfad
1.679,12 ms. Dieser kleine Unterschied ist **kein Indexgewinn**, weil der
Cachepfad ausdrücklich scannt. Auch breite Vergleiche profitieren von der
einmaligen Zeitraumvalidierung, während der vollständige Fachkern dominiert.

Aufbauzeit wird durch den zweiten leeren Vergleich gemessen: Aufbau plus
geringe leere Finalisierung, ohne umfangreiche ausgewählte Fachanalyse.
Die kalte Gesamtfolge enthält dagegen alle realen Vergleiche und die
adaptive Aufbauentscheidung. Rechnerischer Break-even ist in den Rohdaten
gegen den aktuellen Scan angegeben und keine Prognose für Benutzerklicks.

Gehaltene Referenz-/Offset-Arrays:

| Zeilen | Typed-Array-Bytes | gemessener zusätzlicher Heap nach GC |
| ---: | ---: | ---: |
| 1.000 | 5.464 | ca. 5,4 KiB |
| 10.000 | 41.464 | ca. 8,1 KiB |
| 50.000 | 201.464 | ca. 8,1 KiB |

Die kleinen Heap-Deltas sind GC-abhängig. Die Typed-Array-Größe ist dagegen
direkt aus den gehaltenen Arrays ermittelt. Build-Buckets und sortierte
temporäre Kandidaten haben zusätzliche kurzzeitige Allokationen; die
Prozessspitze der Messung enthält alle Varianten und Gleichheitsprüfungen
und ist keine isolierte Indexspitze. Die 12-/95-MiB-Laborindizes mit
Snapshotkopien und Entitätssichten werden ausdrücklich nicht übernommen.

## Nachweis und Grenzen

11 neue Tests bestehen, zusätzlich die 15 vorhandenen Periodentests.
Geprüft sind unbekannte Daten, leere/reversed/disjunkte Perioden,
Überlappungen, große positive/negative BigInts, exakte große Dezimalumsätze,
Readiness und Registry, Originalreferenzen und Quellenreihenfolge,
Analyzer-Fallback, breite Scanentscheidung, Änderungen/Revision/
Invalidierung, Größen-/Datumslimits, unerwartete Datumstypen, aktuelle
Mengen/Namen/Readiness nach Indexaufbau, gleiche Arraylänge mit neuer
Reihenfolge und tatsächliche Freigabe eines Weak-Cache-Revisionszyklus.

Die Messung belegt Node-Logik und lokale synthetische Laufzeit. Firmen-PC,
Edge-Endpfade, echte Exportverteilungen und die gesamte Speicherstrecke
bleiben separate Abnahmen. Der Index ist eine optionale Beschleunigung;
die vorhandene vollständige Analyse bleibt für jedes Eingabeset verfügbar.
