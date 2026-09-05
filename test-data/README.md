# Synthetische Testdaten

Diese Dateien enthalten ausschließlich erfundene Daten für die geplante V0.1.
Sie sind UTF-8-kodiert und semikolon-getrennt. Die kanonischen Testdateien
verwenden diese Spalten:

```text
order_id;article_id;quantity;order_date;customer_id;sales_value;location
```

## Dateien

| Datei | Zweck | Erwartete Prüfpunkte |
| --- | --- | --- |
| `basic-orders.csv` | Kleine vollständige Standardmenge | 12 Auftragszeilen, 11 Aufträge, 6 Kunden, 6 aktive Tage, Gesamtmenge 32 |
| `quantity-vs-frequency.csv` | Mengen- und Zeilenhäufigkeit vergleichen | `SKU-BULK`: 1 Zeile/500 Stück; `SKU-FREQUENT`: 8 Zeilen/8 Stück |
| `german-column-mapping.csv` | Alternative deutsche Spaltennamen und deutsche Zahlen-/Datumsformate | `AuftragsNr`, `ArtNr`, `Menge`, `Datum`, `KdNr`, `Umsatz`, `Stellplatz` müssen konfigurierbar zugeordnet werden |
| `optional-fields.csv` | Fehlende Werte in vermutlich optionalen Feldern | Leere Kunden-, Umsatz- und Lagerplatzwerte bleiben als fehlende Werte sichtbar |
| `duplicate-lines.csv` | Doppelte und wiederholte Auftragszeilen | 5 Zeilen, davon 2 exakte Duplikate; keine Zeile darf ohne definierte Regel stillschweigend verschwinden |
| `invalid-values.csv` | Inhaltsvalidierung | Fehlender Artikel, fehlende Menge, Null- und Negativmenge, ungültiges Datum und ungültiger Umsatz |
| `malformed-columns.csv` | Strukturelle CSV-Validierung | Eine Zeile hat zu wenige, eine zu viele Spalten |
| `quoted-fields.csv` | CSV-Quoting | Semikolons innerhalb von Anführungszeichen gehören jeweils zu einem Feld |

## Deutsche Spaltenzuordnung

Die Zuordnung in `german-column-mapping.csv` lautet:

| Quellspalte | Internes Feld |
| --- | --- |
| `AuftragsNr` | `order_id` |
| `ArtNr` | `article_id` |
| `Menge` | `quantity` |
| `Datum` | `order_date` |
| `KdNr` | `customer_id` |
| `Umsatz` | `sales_value` |
| `Stellplatz` | `location` |

Die erwartete Normalisierung ist beispielhaft `01.09.2026` → `2026-09-01`
und `19,98` → `19.98`. Diese Regeln sind Testannahmen und noch kein endgültiger
Importvertrag der Anwendung.

## Validierungsannahmen

`invalid-values.csv` und `malformed-columns.csv` sind absichtlich nicht
vollständig gültige Importdateien. Sie dienen dazu, Fehlermeldungen mit
Zeilennummer und Feldbezug zu prüfen. Die genaue Behandlung von Nullmengen,
Negativmengen und fehlenden optionalen Feldern muss im V0.1-Datenvertrag noch
festgelegt werden.
