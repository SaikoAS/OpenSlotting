# Terminalsuche: vorbereitete Texte

Stand: 2026-10-04. Die produktive Terminalsuche verwendet vorbereitete
Locale-Lowercase-Texte statt diese für jedes neue Query und jede Entität erneut
zu berechnen. Artikel-, Kunden- und Auftragswatchlists behalten ihren bestehenden
Rang- und Ein-Abfrage-Viewcache.

## Vertrag und Änderung

`terminal.js` bietet `prepareEntitySearchProjections`,
`entityMatchesNormalizedQuery` und `filterEntities`. Eine private WeakMap hält
den Suchtext von `label + ' ' + secondary`, Locale und aktuelle Feldwerte.
Objekt-/Feld-/Sprachänderungen können keinen alten Suchtext wiederverwenden.
Ungenutzte Entitäten halten keinen globalen Map-Eintrag am Leben.

Suchsemantik bleibt Trim, Locale-Lowercase und vollständiger Substringvergleich.
Leere Queries liefern unmittelbar die vorhandene Liste. Rangfolge, exakte
BigInt-Mengen, führende Nullen und zusammengesetzte Auftragsidentitäten bleiben
erhalten. Weder Datenschema noch Rohwerte oder Serialisierung erhalten neue
Cachefelder. Kein Bigramindex und kein zusätzlicher Ergebnis-LRU wird eingeführt.

Der Controller behält seinen vorhandenen Viewcache und berücksichtigt dabei
auch die Sprache. Projektionen lassen sich einmal vor einer Suchserie
vorbereiten; ansonsten berechnet die API fehlende Einträge beim ersten Zugriff.

## Vergleich

```powershell
node --test tests/terminal.test.cjs tests/terminal-search.test.cjs
node tools/benchmark-terminal-search.cjs 1000,10000 5
```

[Vollständige Messreihen](results/terminal-search.json). Synthetische Daten,
Node `v24.18.1`, Windows, Intel Core i9-12900F. Pro Größe/Bereich/Verfahren
ein eigener Prozess, ein Warmup und fünf Query-Samples. Die frühere tatsächliche
Controllerexpression bildet die Baseline; vorhandene Ranglisten und der
Ein-Abfrage-Viewcache bleiben auch dort aktiv. Alle ganzen Treffer-/Ordnungsdigests
stimmen vor/nach der Änderung überein.

### 10.000 Entitäten: Queryzeiten in ms, Median

| Bereich | 46 verschiedene Queries vorher | danach | 80 wechselnde selektive Queries vorher | danach |
| --- | ---: | ---: | ---: | ---: |
| Terminal-Artikel | 850,33 | 22,73 | 1531,66 | 43,12 |
| Kunden | 854,17 | 22,97 | 1526,28 | 43,88 |
| Aufträge | 853,05 | 22,73 | 1543,96 | 44,32 |

Einmalige Vorbereitung der Texte: 19,87..20,71 ms, zusätzlicher gehaltener
Cacheheap ungefähr 1,33 MiB bei 10.000 Entitäten. Das sind einmalige
Aufbau-/GC-Snapshot-Messungen, keine Mediane. Bei 1000 Entitäten sinkt die
46-Query-Serie von 84..85 ms auf rund 2,4 ms. Identische wiederholte Queries sind
bereits vorher durch die vorhandene Viewcache schnell; beide Verfahren benötigen
hier weniger als 0,02 ms für 80 Wiederholungen. Daraus wird kein weiterer
Geschwindigkeitsgewinn abgeleitet.

Fixture-, Index- und Rangaufbau liegen außerhalb der Queryzeit. Vorbereitete
Suchtexte sind innerhalb einer Serie warm; Querycache wird für unterschiedliche
Serien geleert und für Wiederholungsserien vorher befüllt. GC und vollständige
Vertragsprüfung liegen außerhalb der Messzeit. Prozess-Spitzen-RSS enthält den
ganzen Aufbau und die Prüfungen; die Heapdifferenz ist eine vor/nach expliziter
GC erhobene Momentaufnahme.

## Prüfnachweis und Grenzen

**17 Tests bestanden:** zwölf vorhandene Terminaltests und fünf neue
Suchregressionen. Geprüft werden 1000/10000 Entitäten, drei Bereiche,
De-/En-/De-Wechsel, Unicode und kurze/leer/unbekannte Queries, private Caches
und eingefrorene Objekte, Feldänderungen, getrennte Workspaceobjekte,
Rang-/Periodenwechsel, große exakte Mengen, doppelte Schlüssel und
Original-Stringsemantik.

Dies sind Maschinenzeiten der Suchoperation, keine Edge-Bedien-/DOM- oder
vollständigen Workspacezeiten. Synthetische Verteilung und fünf Samples sind
keine allgemeine ERP-Effizienzgarantie. Bestehende Labormessungen bleiben als
historische Versuche unverändert; diese Reihe misst die tatsächlich übernommene
private Produktionsprojektion inklusive ihrer Feld-/Locale-Prüfung.
