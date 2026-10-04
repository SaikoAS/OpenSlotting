# Bewertung: zusätzliche Suchindizes und Ergebniscaches

Stand 2026-10-04, aktueller Ausgangscommit `59525a4`. Getrennte Entwürfe, keine
Produktivänderung oder neue Abhängigkeit. Node ist Entwicklerwerkzeug; Python
bleibt die einzige zusätzliche Nutzervoraussetzung.

## Was wird verglichen?

Die Baseline heißt `cached-linear` und enthält bereits die heutigen Caches.
Artikeltext wird mit `csv.prepareArticleSearchProjections` vorbereitet und mit
`articleMatchesNormalizedQuery` geprüft. Der Artikelcomparator stammt exakt aus
`tools/benchmark-search-sort.cjs`: Zeilenanzahl, exakte BigInt-Menge, Artikel-ID.
Das ist ein sortierter Suchview, keine neue fachliche Analyse oder vollständige
Nachbildung des speziellen Artikel-Autocomplete-Rankings.

Für Kunden/Aufträge werden der aktuelle `terminal.buildIndex` und
`terminal.rankEntities` verwendet. Ranglisten werden bei neuen Queries
wiederverwendet. Der vorhandene Watchlist-Suchtext besteht exakt aus
`label + ' ' + secondary` und wird im aktuellen Controller je neuem Query mit
Locale-Lowercase behandelt. Eine leere Suche gibt die Rangliste direkt zurück.
Ein Ein-Abfrage-Viewcache bleibt in **allen** Varianten aktiv. Daher entsteht
kein erfundener Vorsprung gegen wiederholt neu berechnete Ranglisten oder
absichtlich entfernte vorhandene Textprojektionen.

| Verfahren | Zusätzliches Verhalten |
| --- | --- |
| `cached-linear` | echte vorbereitete Artikeltexte bzw. aktuelle Terminal-Suchprojektion und ein Query-Viewcache |
| `projected-linear` | Kontrollarm: Terminal-Lowercase-Texte einmal vorbereiten, weiter linear scannen. Artikel verwenden bereits dieselbe Textprojektion wie die Baseline |
| `bigram` | zusätzliches Wörterbuch von UTF-16-Bigramm → geordnete Ordinalpositionen; Schnittmenge als Kandidatenfilter, vollständiger Substringtest bleibt |
| `bigram-lru` | gleicher Index plus bis zu 64 Queryresultate und 4096 Ergebnisreferenzen; breitere Ergebnisse werden nicht zusätzlich im LRU gehalten |

## Semantik und Verträge

- Bigramme sind notwendige Teilstücke eines Substrings, keine hinreichende
  Trefferbedingung. Alle Kandidaten werden mit der tatsächlichen vorhandenen
  Suche verifiziert. Ein Text mit verstreuten `ab`, `bc`, `ca` ist kein Treffer
  für `abca`.
- UTF-16-Codeeinheiten entsprechen der bestehenden JavaScript-Substringsemantik.
  Unicode-/Locale-Lowercase, kombinierende Zeichen, Emoji und NUL zwischen den
  Artikelprojektionsfeldern bleiben gleich. Keine neue Akzent- oder
  Sprachtransliteration wird eingeführt.
- Queries unter zwei Codeeinheiten fallen auf den linearen Weg zurück. Sehr
  breite Queries können ebenfalls viele Kandidaten liefern; ein Index garantiert
  keinen universellen Geschwindigkeitsgewinn.
- Ordinalpositionen statt Geschäftsschlüssel verhindern versehentliche
  Deduplikation. Führende Nullen bleiben erhalten. Gleiche Auftrags-ID unter zwei
  Kunden bleibt durch die vorhandene zusammengesetzte Identität getrennt.
- Sortierung verwendet die vorhandenen Comparatoren. Mengen bleiben BigInt,
  Gleichstände behalten deren Label-/Schlüsselordnung und stabile Eingabereihenfolge.
  Deren `localeCompare` verwendet wie der bestehende Comparator den Hostdefault;
  es wird keine zusätzliche länderübergreifende Collatorgarantie behauptet.
- Workspace, Datenrevision, Locale und Rangparameter ändern den Kontext und
  invalidieren Index und Caches. In-place-Mutationen benötigen ausdrücklich einen
  neuen Revisionswert. Geliehene Ergebnislisten sind nur lesend zu behandeln.

## Messmethode

[Rohdaten mit allen Samples](results/node-search.json). Zwei Größen: 1000 und
10000 Entitäten; drei Bereiche: Artikel, Kunden, Aufträge. Vier Verfahren,
24 getrennte Prozesse. CPU-/Node-/Commitangaben stehen in der Ergebnisdatei.

Der Aufbau ist eine **einmalige erstmalige Messung** im neuen Prozess und enthält
die gemeinsamen Projektionen/Ränge sowie den zusätzlichen Index. Fixtureaufbau
liegt außerhalb. Heapwerte sind eine explizite-GC-Momentaufnahme vor/nach Aufbau;
Spitzen-RSS umfasst den ganzen Prozess einschließlich späterer Referenzprüfung.
Diese Werte sind keine Edge-Speichermessung.

Querymessungen: ein Warmup und fünf Samples pro Workload; Ergebnis-Digestprüfung
außerhalb. Variantenreihenfolge rotiert zwischen den Größen.

| Workload | Umfang | Bedeutung |
| --- | --- | --- |
| Cold-distinct | 50 verschiedene Queries | Ergebnis-Caches leer, vorhandene Projektionen/Index warm; unterschiedliche Kurz-/Unicode-/unbekannte/breite/selektive Queries |
| Warm-same | 80 identische Queries | ein Query außerhalb der Messzeit vorbereiten; bereits vorhandener Ein-Querycache greift bei allen Methoden |
| Warm-alternating | 80 Queries aus acht selektiven Suchtexten | acht Queries vorher vorbereiten; zeigt einen möglichen zusätzlichen LRU-Nutzen bei Wiederholungen |

"Cold" bedeutet hier keinen Kaltstart der Anwendung oder des Dateisystems.
Die 1000/10000 beziehen sich auf Datensätze, nicht die Anzahl verschiedener Queries.
Fünf Samples und eine synthetische Namensverteilung sind keine allgemeine
statistische Effizienzgarantie. Browserbedienung/DOM/Worker/PostMessage/Persistenz
sind außerhalb dieser Node-Messung.

## Messergebnisse

<!-- measured-tables-start -->
### Cold-distinct: Median für 50 unterschiedliche Queries in ms

| Entitäten / Bereich | heutige Cached-Baseline | nur Textvorbereitung | Bigram | Bigram + LRU |
| --- | ---: | ---: | ---: | ---: |
| 1000 / article | 2,77 | 2,77 | 1,52 | 1,34 |
| 1000 / customer | 114,05 | 1,64 | 0,57 | 0,56 |
| 1000 / order | 92,30 | 1,57 | 0,58 | 0,53 |
| 10000 / article | 32,12 | 32,60 | 10,66 | 10,02 |
| 10000 / customer | 923,98 | 13,47 | 4,37 | 4,05 |
| 10000 / order | 926,53 | 13,51 | 4,08 | 3,98 |

### Erstmaliger Aufbau / zusätzlich gehaltener Heap bei 10000 Entitäten

Aufbau in ms / GC-Heapsnapshot-Differenz in MiB. Aufbau ist einmalig gemessen, kein Median.

| Bereich | Baseline | Textvorbereitung | Bigram | Bigram + LRU |
| --- | ---: | ---: | ---: | ---: |
| article | 54,67 / 2,41 | 55,66 / 2,41 | 104,26 / 7,65 | 105,29 / 7,65 |
| customer | 12,52 / 1,02 | 31,45 / 1,64 | 50,17 / 3,34 | 50,42 / 3,34 |
| order | 13,53 / 1,48 | 32,81 / 2,10 | 51,58 / 3,80 | 51,80 / 3,80 |

### Warm-alternating: Median für 80 Queries aus acht selektiven Suchtexten in ms

| Bereich / 10000 Entitäten | Baseline | Textvorbereitung | Bigram | Bigram + LRU |
| --- | ---: | ---: | ---: | ---: |
| article | 59,33 | 59,87 | 14,14 | 0,02 |
| customer | 1517,30 | 27,08 | 9,34 | 0,02 |
| order | 1547,62 | 26,92 | 9,71 | 0,02 |

Warm-same liegt über alle Größen/Bereiche/Varianten bei 0,005..0,029 ms je 80 Queries: der vorhandene Ein-Abfrage-Viewcache erledigt diesen Fall bereits. Unterschiede in dieser Größenordnung sind keine Integrationsgrundlage.

Die Artikel-Bigramme halten bei 10000 Einträgen 654549 Postingreferenzen. Der Artikelaufbau erhöht sich hier ungefähr um den Faktor zwei und der zusätzliche gehaltene Heap um rund fünf MiB. Ein einzelner Cold-Querybatch spart weniger Zeit als der zusätzliche Aufbau kostet; mehrere relevante Queryserien wären zur Amortisation nötig. Diese Abschätzung gilt nur für dieses synthetische Dataset.
<!-- measured-tables-end -->

## Bewertung für weitere Entwicklung

1. **Terminaltexte einmal vorbereiten:** die einfache Kontrolle trennt die
   heutige wiederholte Locale-Lowercase-Arbeit von einem aufwendigeren Index.
   Zuerst diesen kleinen Entwurf gegen echte Watchlist-Daten im Edge prüfen.
2. **Artikel-Bigramme nur bei ausreichend vielen unterschiedlichen Suchen:**
   die bereits vorhandene Textprojektion ist günstig. Zusätzlicher Indexaufbau
   und Postinglisten müssen sich durch spätere Queryersparnis amortisieren.
   Kurze/breite Queries und seltene Nutzung können gegen den Index sprechen.
3. **LRU für selektive wiederkehrende Queries:** Warm-alternating prüft genau
   diesen Fall. Neue einmalige Queries profitieren nicht vom Ergebnis-LRU;
   Warm-same ist bereits durch die vorhandene Viewcache schnell.
4. **Speicherbudget vor Integration:** Indexreferenzen wachsen mit Dataset und
   Anzahl verschiedener Bigramme je Text. Eine zukünftige gepackte Postingliste
   oder ein Budget mit Scanfallback ist möglich, hier nicht implementiert/gemessen.

Keiner der Entwürfe ersetzt die heutige Suche. Auswahl erfordert eine getrennte
Entscheidung mit realen, freigegebenen Namens-/ID-Verteilungen, breiten und
selektiven Queryserien, Wechsel von Workspace/Sprache sowie kompletter Edge-UI.
Das aktuelle Labor bindet keine Module in die Anwendung ein.

## Prüfungen

**Acht Tests bestanden**, jeweils vier Varianten. 1000/10000 Entitäten, beide
Sprachen und alle drei Bereiche mit vollständiger Treffer-/Ordnungsprüfung;
realer Baselinecall, führende Nullen, exakte große Mengen, doppelte Ordinalwerte,
Auftragskompositschlüssel, Workspace-/Revision-/Locale-/Rangwechsel,
Bigram-Falschpositivgegenbeispiel und begrenztes LRU. Alle gemessenen
Ergebnis-Digests stimmen mit der vorhandenen Such-/Rangbaseline überein.
