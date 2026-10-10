# Getrenntes Such- und Sortierlabor

Keine Integration, Installation, Nutzerdaten oder Browserdatenbankzugriffe.
Die Module lesen die aktuelle CSV-/Terminal-Fachlogik.

[Bewertung und Messergebnisse](EVALUATION.md) ·
[Vollständige Samples](results/node-search.json)

```powershell
node --test experiments/feature-lab/search/tests/search.test.cjs
node experiments/feature-lab/search/benchmarks/run.cjs
```

## Schnittstellen

`new SearchSession({scope, variant, maxQueries, maxReferences})`

- `scope`: `article`, `customer`, `order`.
- `variant`: `cached-linear`, `projected-linear`, `bigram`, `bigram-lru`.
- `setData({articles, rows}, {workspaceId, revision, locale, rankDays, metric, latestDate})`
  bereitet Rangfolge/Projektionen vor. Gleiche Datenidentität und derselbe Kontext
  werden wiederverwendet. Änderungen am Objektbestand brauchen eine neue Revision.
- `query(text)` liefert vollständige Treffer in derselben Reihenfolge.
- `clearQueryCache()` leert die Ergebnis-Caches, behält Projektionen/Index.

Die echte Baseline behält bereits den Ein-Abfrage-Viewcache. Artikel verwenden
den vorhandenen `search_text` inklusive Varianten, Masterwerten und Customfields.
Sortierung ist exakt der vorhandene Comparator aus
`tools/benchmark-search-sort.cjs`: Zeilenanzahl, exakte BigInt-Menge, Artikel-ID.
Terminalbereiche verwenden `terminal.rankEntities`; ein bestehender Rang wird
pro neuem Suchtext nicht neu berechnet. Die aktuelle Terminalsuche verarbeitet
`label + ' ' + secondary` mit Locale-Lowercase.

Der additive Index speichert Bigramme der normalisierten UTF-16-Projektion und
verifiziert Kandidaten immer mit dem wirklichen `includes`-/CSV-Suchtest.
Es ist ein Kandidatenfilter, kein Ersatz der Substringsemantik. Kurze Suchtexte
mit weniger als zwei UTF-16-Codeeinheiten verwenden den linearen Weg.
Ordinalpositionen erhalten auch doppelte Schlüssel. Führende Nullen und
zusammengesetzte Auftragsidentität bleiben erhalten.

Der Kontrollarm `projected-linear` bereitet nur die Terminal-Lowercase-Texte
einmal vor und scannt weiter linear. So wird die Wirkung dieser einfachen
Vorbereitung von der Wirkung des Kandidatenindex getrennt. Für Artikel ist es
dieselbe bereits vorhandene Projektion wie in der Baseline.

Der LRU behält höchstens 64 Suchtexte und 4096 Ergebnisreferenzen; breitere
Resultate werden nur vom weiterhin vorhandenen Ein-Abfrage-Viewcache gehalten.
Workspace-/Revision-/Sprach-/Rangkontextwechsel leert alle zusätzlichen Caches.

Die Tests vergleichen 1000/10000 Entitäten mit 50 verschiedenen Suchtexten
je Dataset, nicht 1000/10000 verschiedene Suchtexte. De-/En-Locale, Unicode,
kurze/leere/unbekannte Queries, NUL-Projektionsgrenzen, exakte Mengen, stabile
Gleichstände und Kontextwechsel sind enthalten.

Benchmark: ein Warmup + fünf Samples, pro Variante/Größe/Bereich eigener
Prozess. Aufbau und explizite GC-Heapsnapshots werden separat ausgewiesen.
Cold = 50 verschiedene Suchtexte ohne Querycache, vorhandene Projektionen/Index
bleiben warm. Warm-same = 80 identische Suchtexte nach Priming. Warm-alternating
= 80 Abfragen aus acht vorher vorbereiteten selektiven Suchtexten. Dieselbe
Baseline-Viewcache bleibt in allen Fällen aktiv. Ergebnisprüfung liegt außerhalb
des Zeitfensters. Keine Edge- oder vollständige Anwendungszeit wird behauptet.

Aufbau ist der erstmalige, einmal gemessene Aufbau im neuen Prozess; Queryzeiten
sind Mediane aus fünf Samples. Ein leeres Query gibt wie im aktuellen Terminal
direkt die vorhandene Rangliste zurück. Zurückgegebene Listen/Objekte sind
geliehene, nur lesend zu behandelnde Ansichten. In-place-Datenänderungen brauchen
einen neuen Revisionswert; der Prototyp errät keine Objektmutation.
