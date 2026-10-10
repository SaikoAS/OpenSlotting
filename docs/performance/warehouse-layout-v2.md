# Lagerworkflow im Localhost-Stand

**Historischer Nachweis für Layout 2 vom 09.10.2026.** Der Arbeitsstand vom
10.10. verwendet Workspace 16 / Layout 4 mit Bauteil-/Höhenprüfung und parametrischen Kreuzungen sowie weiteren
Modellierwerkzeugen. Die Zahlen und Abnahmen dieses Berichts gelten nicht für
diese Erweiterung. Neue Messungen und fachliche/Edge-Abnahme stehen aus.

Datum: 2026-10-09. Zusammenführung von `72f992abacbe7381a6e191ae3a5d194261ec4be9`
(`codex/parametric-warehouse-editor`) in den Localhost-Ausgangsstand
`a6f2b0364e904cab91d7edc98200f8953e409cb2`.

## Integration und Datenvertrag

- Struktur, funktionale Zonen und Lagerplätze werden unabhängig bearbeitet.
  Neue Geometrie erzeugt keine impliziten Plätze. Picking und Reserve können
  innerhalb eines Regals unterschiedliche Ebenen belegen.
- Workspace-Schema 14 verwendet Lagerlayout 2. Die gemeinsame Vorbereitung
  im produktiven Modul-Worker migriert vorhandene Layouts beim Öffnen und
  Wiederherstellen. Alte Objekt-/Ebenen-/Platz-IDs und Codes bleiben erhalten;
  migrierte Zonen sind zunächst Unassigned und bestehende Plätze als Legacy markiert.
- IndexedDB-Version 3 und Sicherungsformat 1 bleiben bestehen. Originaldateien,
  Quellenzeilen, führende Nullen und exakte BigInt-Mengen bleiben erhalten.
  Eine alte Anwendung mit Schema-13-Vertrag kann neue Schema-14-Arbeitsbereiche
  nicht lesen; eine Sicherung vor dem Update ermöglicht den Rückweg zum alten Stand.
- Analyse bleibt lesend. Codes werden nach Entfernen äußerer Leerzeichen exakt
  abgeglichen. Bearbeitung, Warnungen, Sperren und Rückgängig/Wiederholen gehören
  weiterhin zum Editor.
- Die SAT-/Sweep-Kollisionsprüfung und direkte Float32-Geometrie bleiben aktiv.
  Szene und 2D-Ansicht bauen je Durchlauf einen gemeinsamen Zonen-/Platzindex auf;
  daraus wird kein gespeicherter Cache und keine zweite Datenquelle.
- Codes lassen sich gezielt für eine Ebene oder ausdrücklich für ein ganzes
  Regal ergänzen. Bestehende Codes bleiben bestehen; die Aktion erzeugt keine
  Plätze, respektiert Sperren und prüft Eindeutigkeit im gesamten Arbeitsbereich.
- Produktionsstart bleibt `http://127.0.0.1:8765`. Python stellt ausschließlich
  freigegebene statische Assets bereit. Verarbeitung und Speicherung der
  Nutzerdaten bleiben im Browser. Keine zusätzliche Installation oder EXE.
  Portable bleibt am dokumentierten Ausgangsstand pausiert.

## Neue Messungen

Synthetische Daten auf Windows, Intel Core i9-12900F, Node v24.18.1. Die
Varianten liefen nacheinander; Rohdaten enthalten Methodik, Einzelmessungen
und Quellhashes. Das sind CPU-/Prozessmessungen, keine Browser-FPS oder
allgemeinen Import-/Analysebeschleunigungen.

| Vergleich | Vorherige Variante | Optimierte Variante |
| --- | ---: | ---: |
| Kollisionen, 150 verteilte Objekte | 3,573 ms | 0,127 ms |
| Kollisionen, 150 vertikal getrennte Objekte | 4,100 ms | 0,160 ms |
| Kollisionen, 150 dicht überlappende Objekte | 11,377 ms | 1,319 ms |
| Geometrieprojektion, 150 normale Regale | 28,834 ms | 7,638 ms |
| Geometrieprojektion, 150 Regale / 5.000 Plätze | 94,298 ms | 38,227 ms |
| Zonen-/Platzabfragen, alle 1.250 Ebenen / 5.000 Plätze | 36,082 ms | 0,510 ms |
| Zonenabfragen, letzte 512 von 54.000 unkodierten Ebenen | 87,462 ms | 4,636 ms |

Der Kollisions-/Projektionsvergleich führt eingefrorene alte Algorithmen und
aktuelle Algorithmen auf **derselben aktuellen Layout-2-Szene** aus. Er misst
keinen kompletten alten Schema-13-Workflow gegen den neuen Workflow. Ergebnisse
werden verglichen; die Geometriebuffer sind exakt gleich.

Der Indexvergleich enthält Indexaufbau und Sortierung. Im großen unkodierten
Fall wird der Index für alle 54.000 Ebenen aufgebaut, aber nur die letzten 512
Ebenen abgefragt. Daraus folgt keine Zeit für das vollständige Zeichnen aller
54.000 Ebenen. Die maximal mögliche physische Struktur wird separat validiert;
die Grenze von 5.000 bezieht sich auf Lagerplätze, nicht auf unkodierte Ebenen.

Bei 38.600 Geometrieboxen sank die gemessene Spitzen-RSS des isolierten
Node-Prozesses von **974,914 MiB auf 409,301 MiB** (rund 58 %). Die finale
Buffergröße blieb mit 83.393.280 Bytes identisch. Beide Varianten verwenden
dieselbe aktuelle Szene; Buffer, Pick-Zuordnung und Framing-Digest stimmen überein.
RSS umfasst den ganzen Messprozess, keine behauptete Browser-/GPU-Speichergröße.

Rohdaten und Wiederholung:

```text
node tools/benchmark-warehouse.cjs
node tools/benchmark-warehouse-memory.cjs
node tools/benchmark-warehouse-scopes.cjs
```

- [Kollisionen und Projektion](results/warehouse-layout-v2.json)
- [Speicher und identische Geometrie](results/warehouse-memory-layout-v2.json)
- [Zonen- und Platzindex](results/warehouse-scopes-layout-v2.json)

Die Messdateien vom 2026-10-05 bleiben als historische Belege unverändert.
Das historische Editor-History-Labor und die Kernel-Extraktion verwenden
eingefrorenen alten Fachcode. Ihr Erfolg ist keine neue Messung der heutigen
Schema-14-Historie. Der aktuelle Browser-Worker-Vergleich unter
`tools/benchmarks/serve.py` verwendet für beide Strategien dieselben aktuellen
Fachmodule und nur für die Blob-Orchestrierung den historischen Code.

## Prüfungen und verbleibende Abnahme

- 310 Anwendungstests bestanden, keine Fehler oder übersprungenen Tests.
  Einschließlich tatsächlichem Worker-Öffnen eines befüllten Schema-13-Datensatzes,
  Migration, Speichern, Sicherung/Wiederherstellung und Originalbyte-Vergleich.
- 21 Tests der historischen History-/Localhost-Labormodule bestanden.
- Launcher-Logik unter Windows PowerShell 5.1 und PowerShell 7 bestanden.
  JavaScript-Syntax und Python-3.8-Grammatik geprüft; kein Lauf mit Python 3.8
  behauptet.
- Isolierter Test im Codex-Browser: zunächst null Plätze; Picking, Reserve und
  Unassigned im selben Regal; explizite Verteilung 2/1/0; regalweites Ergänzen
  von drei Codes; Neuladen behält Schema 14, Layout 2, Nutzungen und Codes.
  Der sichtbare Sicherungsvergleich meldete `backupEqual: true`.
- Der Browser-Test verwendete ausschließlich synthetische Daten und eine
  getrennte IndexedDB auf einem zufälligen Testport. Er ersetzt nicht die
  vollständige Anwendungsabnahme oder die produktive Launcherprüfung in Edge.

Microsoft Edge war für den neuen Automationslauf nicht angebunden. Die
vollständige Localhost-Abnahme auf dem Firmenrechner mit tatsächlichen
Importen, nativen Dialogen und Download-/Restore-Ablauf bleibt offen. Die
[Abnahmeanleitung](../acceptance-warehouse-workflow.md) beschreibt diese Schritte.
Diese Zusammenführung ist keine Release- oder Firmenfreigabe.
