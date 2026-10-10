# Projektprüfung vor dem Localhost-PR

Stand: 2026-10-10, Branch `codex/localhost-development`.
Ausgangspunkt der Prüfung: `f4aa20bb618842eff8be40401a16f44fe56db784` mit
den noch nicht veröffentlichten Modellier- und Oberflächenänderungen.
Der endgültige Kandidatencommit und die CI-Ergebnisse werden im PR festgehalten.

## Umfang und Grenzen

Das vollständige versionierte Inventar umfasst zu Beginn 257 Dateien:

| Bereich | Dateien | Prüfung |
| --- | ---: | --- |
| Wurzel | 43 | Anwendungshülle, Fachmodule, Speicher, Runtime, Windows-Befehle, Verträge |
| `src/` | 4 | Worker-Einstieg, Workspace-Vorbereitung, Task-Lifecycle, Zeilenwiederverwendung |
| `docs/` | 35 | Aktuelle Verträge und Bedienung, historische Nachweise, lokale Links |
| `experiments/` | 113 | Laborgrenzen, synthetische Ergebnisse, Testbarkeit und historische Referenzen |
| `tests/` | 32 | Produktprüfungen, Testadapter, synthetische Fixtures |
| `test-data/` | 15 | Dokumentierte synthetische CSV-Eingaben |
| `tools/` | 14 | Paketierung, Benchmarks, getrennte Entwicklungsserver |
| `.github/` | 1 | PR-/Main-CI und explizite Prüfkommandos |

Alle versionierten Dateien wurden inventarisiert und gelesen bzw. als binäre
Assets erfasst. JavaScript/Python/JSON wurden syntaktisch geprüft, lokale
Markdown-Verweise aufgelöst, Modulgrenzen und geänderte Implementierungen
inhaltlich geprüft und die vorhandenen automatisierten Suiten ausgeführt.
Dies ist keine Aussage über eine manuelle Zeilenprüfung jeder unveränderten
Datei oder eine visuelle Abnahme aller Bilder und Browserzustände.

Ignorierte `dist/`-Kandidaten, Python-Caches, erzeugte Laborkerne und lokale
Prüflogs sind Ausgaben, keine aktuelle Produktquelle. Sie werden weder gelöscht
noch in den PR aufgenommen. Es wurden keine Nutzerdaten exportiert.

## Nötige Anpassungen und Ergebnis

1. **Veraltete Produktprüfungen:** Der erste Lauf hatte 288 bestandene und
   22 fehlgeschlagene Tests. Schema-14/Layout-2-Erwartungen wurden auf den
   aktuellen Vertrag umgestellt. Navigation prüft das interne Seiten-Scrolling;
   der Editor-Testadapter kennt die inzwischen verwendeten DOM-/Szenen-APIs.
2. **Kollisionsreferenz:** Die historische Footprint-Prüfung ist keine Referenz
   für tatsächliche Bauteile, Durchfahrten und unbekannte Fahrzeugmaße.
   Eine unabhängige quadratische Bauteilprüfung kontrolliert Ergebnisreihenfolge
   und Befunde gegen den optimierten Sweep. Unterschiedliche gültige zweite
   Kollisionsbauteile werden geometrisch geprüft, statt einen beliebigen
   Traversierungsfund als einzig zulässigen festzuschreiben.
3. **Neue Modellierfunktionen:** Zusätzliche Regressionen prüfen gemeinsame
   Regaltiefe und Erweiterungen, stabile Kreuzungsports, kompatible/freie
   Anschlüsse, Distanzverbindungen, unveränderte Endobjekte, Bodenhindernisse,
   unbekannte und bekannte Durchfahrtshöhen, Gruppen/Sperren, Wandöffnungen,
   Migration und Backup sowie die gemeinsame Farbpalette.
4. **3D-Auswertung und Renderer:** Der Controller-Test prüft Objektfarben als
   Standard, den Wechsel auf Nutzungsfarben und unveränderte Artikelmarker.
   Ein WebGL-Adapter prüft Stencil-Abdeckung und getrennte vollständige
   Pickingpuffer. Die historischen Projektionsreferenzen bleiben für
   unveränderte Geometrie gültig; Fahrwege werden sichtbar nur oben gezeichnet.
5. **Historisches Lagerlabor:** Seine Layout-1-Tests laden eingefrorene,
   hashgeprüfte Modell-/Szenen-/Renderer-Fixtures. Historische Zeitmessungen
   bleiben unverändert; der Runner erklärt den erforderlichen Basisstand.
   Diese Labortests belegen keine aktuelle Durchfahrtssemantik.
6. **Dokumentation und Browser-Testseite:** Abnahmecheckliste, Schema- und
   Leistungsstatus wurden aktualisiert. Die optionale Testseite berücksichtigt
   den neuen Workspace-Rahmen und blendet versteckte Ansichten zuverlässig aus.

Keine weitere Produktänderung war aus den automatisierten Ergebnissen nötig.
Die funktionalen Grenzen der neuen Modellierung bleiben ausdrücklich erhalten:
150 Objekte, 5.000 Stellplätze, 20 Historieneinträge, keine Verbindungszyklen,
begrenzte Distanzsuche und keine Fahrzeug-Schleppkurvenberechnung.

## Automatisierte Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| `node --test tests/*.test.cjs` | 320 bestanden, keine Fehler oder übersprungenen Tests |
| Alle `*.test.cjs` / `*.test.mjs` unter `experiments/` | 82 bestanden, keine Fehler oder übersprungenen Tests |
| Python: Localhost-Labor, Python-I/O-Labor, Feature-Labor-Server | 2 + 4 + 2 Tests bestanden |
| Beide Windows-Launcher-Suiten unter PowerShell 5.1 und PowerShell 7 | Alle vier Läufe bestanden |
| JavaScript-Syntax, Python-AST, JSON, lokale Dokumentationslinks | Keine Fehler |
| Git-Whitespace | Keine Fehler nach Erhalt bestehender Zeilenenden |

Launcher-Tests prüfen Logik in temporären synthetischen Umgebungen, keine
Firmen-PC-Richtlinien oder sichtbaren Edge-Start. Paketierung und GitHub-CI
werden zusätzlich am anschließend veröffentlichten Commit geprüft und im PR
erfasst. Eine Paketierungsprüfung ist keine neue Version oder Release-Freigabe.

## Lokaler Betrieb und zukünftige Struktur

- Python 3.8+ mit Standardbibliothek bleibt die einzige zusätzliche
  Nutzerabhängigkeit. Node dient ausschließlich Entwicklung und Prüfungen.
- Die feste Origin, IndexedDB-Version 3 und Backup-Format 1 bleiben erhalten;
  Workspace 16 / Layout 4 wird ausdrücklich migriert. Alte Anwendungen können
  neue Backups nicht lesen; eine Sicherung vor dem Update bleibt sinnvoll.
- Python liefert ausschließlich explizit erlaubte Assets über Loopback.
  Verarbeitung, Originalbytes und Workspace-Speicherung bleiben im Browser;
  CSP blockiert Verbindungsanfragen. Tests und Labore gehören nicht zum Runtime-
  oder Nutzerpaket.
- Portable bleibt bewusst pausiert am dokumentierten Ausgangscommit.
- Der [Strukturplan](project-structure-plan.md) bleibt ein schrittweiser Umzug.
  Für weitere Features sind kleinere UI-/Modelliermodule sinnvoll; ein großer
  Ordnerumzug ist keine Voraussetzung dieses PRs.

## Vor einer Veröffentlichung weiterhin offen

1. Native Edge-Abnahme des vollständigen Localhost-Workflows auf dem exakten
   Kandidaten: Import, Sprache, Navigation/Scrolling, Modellierung,
   Durchfahrten, Farblegende, Auswahl, Persistenz, Sicherung und Wiederherstellung.
   Die [Lagercheckliste](acceptance-warehouse-workflow.md) enthält die neuen Fälle.
2. Neue Laufzeit-/Speicher-/GPU-Messungen für Layout 4. Historische Layout-1/2-
   Zahlen dürfen keine Performancezusage für Bauteil- und Durchfahrtsprüfungen
   begründen. Große/dichte Pläne und viele physische Ebenen gezielt messen.
3. GitHub-CI und Review des endgültigen PR-Heads. Der PR bleibt offen; Merge,
   Versionswechsel, Tag und Release sind eigene Schritte.
