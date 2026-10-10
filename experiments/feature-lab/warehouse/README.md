# Lager-, Workspace- und Profil-Labor

Getrennte Alternativen für heutige Features. **Keine Produktivdatei wurde hier verändert.** Aktueller Produktvertrag: höchstens 150 Lagerobjekte und 5000 Stellplätze. 1000-Objekt-Fixtures sind ausschließlich Zukunftsstress.

**Historischer Stand:** Die Lageralgorithmen dieses Labors vergleichen Layout 1
am Basiscommit `db39ffaca31ebeddec884413c38725f4fd38a5a0`. Die Tests laden dafür
unveränderte, hashgeprüfte Modell-, Szenen- und Renderer-Dateien aus
`tests/fixtures/`; Profilprüfungen verwenden weiterhin den aktuellen
Workspace-Profilvertrag. Sie belegen keine Parität der heutigen Bauteil- und
Durchfahrtsprüfung. Der Benchmark-Runner verlangt Layout 1 und bricht bei einem
neueren Fachkern mit einer Erklärung ab. Für historische Zeitmessungen den
Basiscommit separat auschecken; gespeicherte Resultate bleiben unverändert.

## Dateien

- `modules.mjs`: browser-kompatible Funktionen ohne Node-Import oder externe Abhängigkeiten.
- `fixtures.mjs`: deterministische synthetische Layouts, Artikel und Profile.
- `tests.test.mjs`: Gleichheits-/Grenztests mit eingefrorenem Layout-1-Fachkern als Lagerreferenz.
- `run-benchmarks.mjs`: kalte/warme Node-CPU-Messungen, sieben Proben, Quellhashes und Gesamtprozess-RSS.
- `write-evaluation.mjs`: erzeugt Bericht aus tatsächlichen Messwerten.
- [WAREHOUSE-EVALUATION.md](WAREHOUSE-EVALUATION.md): Bewertung und offene Grenzen.
- [results/node-warehouse.json](results/node-warehouse.json): vollständige Einzelproben und Hardware-/Quellstand.

## Ausführen

```powershell
node --test experiments/feature-lab/warehouse/tests.test.mjs
node experiments/feature-lab/warehouse/run-benchmarks.mjs
node experiments/feature-lab/warehouse/write-evaluation.mjs
```

Node ist ein vorhandenes Entwicklungswerkzeug, keine Nutzerabhängigkeit. Nutzerruntime weiterhin Browser und freigegebenes Python. Keine Pakete, Installation oder EXE.

## Im Browser-Labor wiederverwenden

Nach Laden der unveränderten UMD-Dateien `warehouse.js`, `warehouse-scene.js` und bei Profiltests `workspace.js`:

```javascript
import { createAlternatives } from './warehouse/modules.mjs';
const lab = createAlternatives(
  window.OpenSlottingWarehouse,
  window.OpenSlottingWarehouseScene,
  window.OpenSlottingWorkspace
);
const actual = lab.collisionSweep(layout);
// actual.collisions: gleiche Reihenfolge/Objekt-IDs/Kategorien wie findCollisions.
// actual.stats: Broadphase-/SAT-Zähler für genau diese Eingabe.
```

Scene-Cache-Schlüssel muss alle Felder enthalten: `workspaceId`, `layoutRevision`, `registryRevision`, `locale`, `kernelVersion`. Caches/Indizes sind abgeleitete flüchtige Daten; keine Änderung des Workspace-Schemas oder Datenbankformat nötig. Indizes nach Entwurf-/Quellenwechseln neu bilden. Revisionscache setzt unveränderliche Snapshots oder zuverlässige Revisionserhöhung voraus; der Bericht beschreibt alle offenen Controller-Anforderungen.

Der aktuelle Produktserver darf das Labor weiterhin nicht ausliefern. Eine separate Laborfreigabe ist ausschließlich für synthetische Messungen vorgesehen. Dieses Teil-Labor öffnet selbst keinen Server und liest keine Nutzerdateien.
