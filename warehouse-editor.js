(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseEditor = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LABELS = {
    en: {
      structure: 'Structure', zones: 'Zones', locations: 'Locations', usage: 'Functional use',
      unassigned: 'Unassigned', picking: 'Picking', reserve: 'Reserve', modeled: 'Modeled', assigned: 'Zone assigned',
      palletFrameColor: 'Pallet rack: upright frames', palletBeamColor: 'Pallet rack: beams', palletDeckColor: 'Pallet rack: decks',
      structureHelp: 'Build the physical warehouse. Classify levels and create locations when each scope is ready.',
      zonesHelp: 'Classify each level. Picking and reserve may coexist in one rack; floor areas do not determine functional use.',
      locationsHelp: 'Create locations explicitly for the selected classified level, then enter or generate unique codes.',
      scopeProgress: 'Progress of selected level', configured: 'locations configured', needsCodes: 'locations need codes',
      noLocations: 'No locations in this level.', gotoZones: 'Classify this level in Zones',
      classificationNeeded: 'Assign a functional use before creating or resizing locations. Existing locations are retained.',
      legacyHint: 'Migrated locations keep their IDs and codes. You can edit their codes while classification is pending.',
      spatialHint: 'This is a physical area. Functional zones are assigned to rack levels.',
      topZonesHint: 'Floor-plan bands show levels from bottom to top; they do not represent separate floor areas.',
      inspectHint: 'Click a level to select it · drag empty space to pan · wheel to zoom',
      impactWarning: 'This change affects {{locations}} existing locations, {{codes}} codes and {{articles}} current article matches. {{removed}} locations will be removed. Retained IDs and codes stay attached to their scopes. Continue?',
      deleteStructureWarning: 'Delete this physical object?', duplicate: 'Duplicate structure',
      applyUsageBay: 'Apply to this bay', applyUsageRack: 'Apply to this rack', bulkUsage: 'Use for multiple levels',
      add: 'Add recipe', pallet: 'Pallet rack', shelf: 'Shelf rack', wall: 'Wall', gate: 'Gate', door: 'Door', exit: 'Emergency exit',
      aisle: 'Aisle / road', goodsIn: 'Goods in', goodsOut: 'Goods out', addButton: 'Add object', objects: 'Objects',
      recipeRacks: 'Racks', recipeBuilding: 'Building & access', recipeAreas: 'Routes & functional areas', recipeOther: 'Other recipes',
      recipeWalls: 'Wall modules', recipeRoutes: 'Route modules', corner: 'Corner', tee: 'T-junction', cross: 'Crossroads',
      port: 'Port', armLength: 'Arm length', junctionHint: 'Position is the junction center. Arm lengths begin at the edge of the central square. Rotate the whole module to orient its branches.',
      portAlignment: 'Align ports automatically', wallThickness: 'Wall thickness (mm)',
      occupiedPort: 'in use', connectionWidthHint: 'Snap and connection require matching route widths or wall thicknesses. Only free ports are available.',
      previewBridge: 'Preview distance connection', bridgeName: 'Connection', bridgeCourse: 'Connection course', bridgeAuto: 'Automatic', bridgeStraight: 'Straight only', bridgeLeft: 'First turn left', bridgeRight: 'First turn right',
      bridgeReserve: 'Detour reserve (mm)', bridgeModules: 'new modules', bridgeHint: 'Keep both end objects in place and add straight/corner modules between the chosen ports. Apply saves the entire connection in one edit.',
      bridgeCompatible: 'Choose two route modules or two wall modules with matching width/thickness and elevation.', bridgeSeparate: 'Choose ports in separate assemblies. Persistent connection loops are not supported.',
      bridgePorts: 'Choose two valid free ports.', bridgeTouching: 'Distance connections need at least 100 mm between ports. Use direct Connect for closer endpoints.',
      bridgeOrientation: 'Port orientations must be parallel or at right angles. Rotate the existing module explicitly first.', bridgeWidth: 'The required vehicle width plus side reserves exceeds the lane width.',
      bridgeCapacity: 'The generated connection exceeds the 150-object or 149-connection limit.', bridgeNoFit: 'No suitable connection found within the bounded search. Check lane width, posts and obstacles, choose another course or change the detour reserve.',
      bridgeDimensions: 'Enter a required width of 100–50,000 mm and height of 100–15,000 mm, or leave unknown dimensions blank.',
      bridgeDimensionsHint: 'Dimensions apply to new pieces; known endpoint dimensions are minimum requirements. Blank dimensions remain unverified. Inherited reserves: {{width}} mm per side, {{height}} mm above the vehicle. Passage height is not inferred as vehicle height.',
      bridgeBlockedDetail: 'One checked course is blocked by {{object}}: {{reason}}.', bridgeHeightDetail: 'Clear height: {{available}} mm; required including reserve: {{required}} mm.',
      passage: 'Passage through selected bay', passageHeight: 'Clear passage height (mm)', passageWidth: 'Clear width',
      passageRoute: 'Assigned route', noRoute: 'No route assigned', previewPassage: 'Preview passage', removePassage: 'Remove passage assignment',
      routeWidth: 'Route width (mm)', requiredWidth: 'Required width (mm)', requiredHeight: 'Required height (mm)',
      widthMargin: 'Side reserve per side (mm)', heightMargin: 'Height reserve (mm)', routeClear: 'Modeled passage space is clear',
      routeHint: 'Enter both required dimensions to complete the geometry check. Marking thickness is independent of clearance.',
      'unverified-route': 'Route not fully checked: required dimensions missing', 'route-too-low': 'Passage too low', 'route-too-narrow': 'Passage too narrow',
      partBeam: 'Beam', partDeck: 'Deck', partUpright: 'Upright', partFrame: 'Frame', partHeader: 'Header', partBase: 'Base', partBody: 'Body', partLeaf: 'Door leaf',
      assembly: 'Connect and align', target: 'Target object', ownAnchor: 'Own endpoint', targetAnchor: 'Target endpoint',
      start: 'Start', end: 'End', previewConnect: 'Preview connection', previewAlign: 'Preview alignment', disconnect: 'Disconnect object',
      groups: 'Move together', groupName: 'Group name', groupCreate: 'Group selected objects', ungroup: 'Ungroup',
      extendStart: 'Add bay at start', extendEnd: 'Add bay at end', continuePassage: 'Continue passage', targetBay: 'Target bay (1-based)',
      wallOpening: 'Insert wall opening', openingType: 'Opening type', openingOffset: 'Offset from wall start (mm)',
      openingWidth: 'Opening width (mm)', openingHeight: 'Opening height (mm)', previewOpening: 'Preview wall opening',
      elevation: 'Base elevation (mm)', doorOpen: 'Door open', previewTitle: 'Preview — not saved', applyPreview: 'Apply changes', cancel: 'Cancel',
      previewImpact: 'Affected: {{locations}} locations, {{codes}} codes, {{articles}} article matches; {{removed}} locations removed.', routeLength: 'Route length (mm)', markingHeight: 'Marking thickness (mm)',
      growFrames: 'Raise adjacent frames if required', groupHint: 'Groups move together. Connections retain shared endpoints and can be disconnected separately.',
      keepDirection: 'Keep current direction', planningHint: 'Geometry check only; loads, stored goods and traffic suitability are not assessed.',
      empty: 'No objects yet. Add a recipe to start the layout.', properties: 'Properties', selected: 'Select an object to edit it.',
      name: 'Name', x: 'X position (mm)', z: 'Z position (mm)', rotation: 'Rotation (°)', width: 'Width (mm)',
      depth: 'Depth / length (mm)', rackDepth: 'Rack row depth (mm)',
      rackDepthHint: 'Shared by all bays and upright frames in this rack row.',
      mixedDepth: 'This saved rack has different depths. Enter a common row depth to align all bays and upright frames.',
      height: 'Height (mm)', bays: 'Bays', levels: 'Levels in this bay',
      positions: 'Locations in this level', applyCounts: 'Apply bay count', applyBayLevels: 'Apply levels in this bay',
      applyLevelPositions: 'Apply location count', bay: 'Bay', level: 'Level', upright: 'Upright',
      clearHeight: 'Level clear height (mm)', thickness: 'Beam / shelf thickness (mm)', deck: 'Add shelf deck',
      deckThickness: 'Shelf deck thickness (mm)', code: 'Location code', codes: 'Codes for selected level',
      codePrefix: 'Code prefix', generate: 'Fill empty codes in this level', generateRack: 'Fill empty codes in this rack', delete: 'Delete object',
      copyName: 'Copy of', rotateLeft: 'Rotate left 90°', rotateRight: 'Rotate right 90°',
      undo: 'Undo', redo: 'Redo', lock: 'Lock', unlock: 'Unlock', locked: 'Locked',
      lockedHint: 'This object is locked. Select levels and positions to inspect them, or unlock it to make changes.',
      lockedEdit: 'Unlock the object before changing it or using undo/redo on it.',
      checks: 'Layout checks', collision: 'collision', collisions: 'collisions',
      overlap: 'Objects overlap', 'blocked-aisle': 'Aisle obstructed', moreCollisions: 'more collisions',
      view: '3D layout', planView: 'Floor plan', fit: 'Fit view', focus: 'Focus object', top: 'Top view', orbit: '3D view',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomSensitivity: 'Zoom speed', zoomSlow: 'Fine', zoomNormal: 'Normal', zoomFast: 'Fast',
      zoomKeyboard: 'With the view focused: + / − zoom, 0 fits the view. Ctrl+wheel retains browser zoom.',
      hint: 'Left drag: rotate · right or middle drag / Shift+drag: pan · wheel: zoom · double-click: focus object',
      hintTop: 'Drag an object to move it · drag empty space to pan · wheel to zoom · 100 mm grid',
      magnet: 'Magnetic snap', magnetTitle: 'Align compatible object endpoints in the floor plan',
      magnetHint: 'Magnetic snap is on: nearby compatible endpoints align before the grid. Persist links with Connect.',
      snapTo: 'Connect to',
      noSelection: 'Choose a rack level to edit its positions.', saved: 'Layout saved locally.',
      removeWarning: 'Reducing counts removes positions with codes. Continue?', deleteWarning: 'Delete this object and its location codes?',
      slotSummary: 'locations ·', coded: 'coded', missing: 'without code', exact: 'Codes are matched exactly after trimming outer spaces. Leading zeros remain significant.',
      choose: 'Choose a recipe',
      wizardCreate: 'Build rack', wizardEdit: 'Edit rack structure', wizardBasics: '1 · Basics',
      wizardBays: '2 · Bays and uprights', wizardLevels: '3 · Levels and preview',
      wizardIntro: 'Configure the rack before adding it to the floor plan. Changes are saved only when you finish.',
      wizardName: 'Rack name', wizardType: 'Rack type', wizardBayCount: 'Number of bays',
      wizardDefaultLevels: 'Levels per bay to start with', wizardBayTable: 'Bays', wizardUprightTable: 'Uprights',
      wizardLevelTable: 'Levels in bay', wizardBaySelect: 'Edit bay', wizardFront: 'Schematic front view',
      wizardTotalWidth: 'Total width', wizardMaxDepth: 'Maximum depth', wizardMaxHeight: 'Maximum height',
      wizardPositionCount: 'Positions', wizardCodedCount: 'coded', wizardBack: 'Back', wizardNext: 'Next',
      wizardCancel: 'Cancel', wizardInsert: 'Add rack', wizardApply: 'Apply changes',
      wizardEditButton: 'Edit structure in table', wizardCheck: 'Check these dimensions before applying.',
      wizardUprightNumber: 'Upright', wizardLevelNumber: 'Level', wizardBayNumber: 'Bay',
      wizardHeightError: 'The levels in bay {{bay}} are taller than an adjacent upright.',
      wizardTooManyPositions: 'The layout can contain at most 5,000 positions.',
      wizardTooManyObjects: 'The layout can contain at most 150 objects.',
      wallSolid: 'Walls: solid', wallTransparent: 'Walls: transparent', wallHidden: 'Walls: hidden',
      wallModeHelp: 'Change wall display in the 3D view', webglUnavailable: '3D is unavailable in this browser context. The floor plan remains available.'
    },
    de: {
      structure: 'Struktur', zones: 'Zonen', locations: 'Lagerplätze', usage: 'Funktionale Nutzung',
      unassigned: 'Nicht zugewiesen', picking: 'Kommissionierung', reserve: 'Reserve', modeled: 'Modelliert', assigned: 'Zone zugewiesen',
      palletFrameColor: 'Palettenregal: Ständerrahmen', palletBeamColor: 'Palettenregal: Traversen', palletDeckColor: 'Palettenregal: Fachböden',
      structureHelp: 'Baue das physische Lager auf. Weise Ebenen eine Nutzung zu und lege Lagerplätze an, sobald der jeweilige Bereich bereit ist.',
      zonesHelp: 'Klassifiziere jede Ebene. Kommissionierung und Reserve können im selben Regal liegen; Bodenflächen bestimmen die Nutzung nicht.',
      locationsHelp: 'Lege Lagerplätze ausdrücklich für die gewählte klassifizierte Ebene an und vergib eindeutige Codes.',
      scopeProgress: 'Fortschritt der gewählten Ebene', configured: 'Lagerplätze konfiguriert', needsCodes: 'Lagerplätze benötigen Codes',
      noLocations: 'Keine Lagerplätze in dieser Ebene.', gotoZones: 'Diese Ebene unter Zonen klassifizieren',
      classificationNeeded: 'Weise eine Nutzung zu, bevor du Lagerplätze anlegst oder ihre Anzahl änderst. Bestehende Lagerplätze bleiben erhalten.',
      legacyHint: 'Migrierte Lagerplätze behalten IDs und Codes. Du kannst ihre Codes bereits vor der Klassifizierung bearbeiten.',
      spatialHint: 'Dies ist eine physische Fläche. Funktionale Zonen werden Regalebenen zugewiesen.',
      topZonesHint: 'Die Bänder im Grundriss zeigen Ebenen von unten nach oben; sie sind keine getrennten Bodenflächen.',
      inspectHint: 'Ebene anklicken: auswählen · freie Fläche ziehen: Ansicht bewegen · Mausrad: zoomen',
      impactWarning: 'Diese Änderung betrifft {{locations}} bestehende Lagerplätze, {{codes}} Codes und {{articles}} aktuelle Artikelzuordnungen. {{removed}} Lagerplätze werden entfernt. Erhaltene IDs und Codes bleiben ihren Bereichen zugeordnet. Fortfahren?',
      deleteStructureWarning: 'Dieses physische Objekt löschen?', duplicate: 'Struktur duplizieren',
      applyUsageBay: 'Für dieses Fach übernehmen', applyUsageRack: 'Für dieses Regal übernehmen', bulkUsage: 'Nutzung für mehrere Ebenen',
      add: 'Rezept hinzufügen', pallet: 'Palettenregal', shelf: 'Fachbodenregal', wall: 'Wand', gate: 'Tor', door: 'Tür', exit: 'Notausgang',
      aisle: 'Gang / Straße', goodsIn: 'Wareneingang', goodsOut: 'Warenausgang', addButton: 'Objekt hinzufügen', objects: 'Objekte',
      recipeRacks: 'Regale', recipeBuilding: 'Gebäude & Zugänge', recipeAreas: 'Wege & Funktionsflächen', recipeOther: 'Weitere Rezepte',
      recipeWalls: 'Wandmodule', recipeRoutes: 'Fahrwegmodule', corner: 'Ecke', tee: 'T-Kreuzung', cross: 'Kreuzung',
      port: 'Anschluss', armLength: 'Armlänge', junctionHint: 'Die Position bezeichnet die Mitte der Kreuzung. Armlängen beginnen am Rand des mittleren Quadrats. Drehe das gesamte Modul, um seine Abzweige auszurichten.',
      portAlignment: 'Anschlüsse automatisch ausrichten', wallThickness: 'Wandstärke (mm)',
      occupiedPort: 'belegt', connectionWidthHint: 'Magnet und Verbinden benötigen gleiche Fahrwegbreiten beziehungsweise Wandstärken. Nur freie Anschlüsse sind verfügbar.',
      previewBridge: 'Verbindung über Distanz vorschauen', bridgeName: 'Verbindung', bridgeCourse: 'Verbindungsverlauf', bridgeAuto: 'Automatisch', bridgeStraight: 'Nur gerade', bridgeLeft: 'Erste Kurve links', bridgeRight: 'Erste Kurve rechts',
      bridgeReserve: 'Umwegreserve (mm)', bridgeModules: 'neue Module', bridgeHint: 'Beide Endobjekte bleiben stehen. Zwischen den gewählten Anschlüssen werden gerade Stücke und Ecken ergänzt. Übernehmen speichert die gesamte Verbindung in einem Schritt.',
      bridgeCompatible: 'Wähle zwei Fahrwegmodule oder zwei Wandmodule mit gleicher Breite beziehungsweise Stärke und Unterkante.', bridgeSeparate: 'Wähle Anschlüsse in getrennten Verbünden. Geschlossene Anschlussringe werden noch nicht unterstützt.',
      bridgePorts: 'Wähle zwei gültige freie Anschlüsse.', bridgeTouching: 'Distanzverbindungen benötigen mindestens 100 mm Abstand zwischen den Anschlüssen. Für nähere Endpunkte nutze direkt Verbinden.',
      bridgeOrientation: 'Die Anschlussrichtungen müssen parallel oder rechtwinklig zueinander sein. Drehe das vorhandene Modul vorher ausdrücklich.', bridgeWidth: 'Die benötigte Fahrzeugbreite einschließlich seitlicher Reserven überschreitet die Fahrwegbreite.',
      bridgeCapacity: 'Die erzeugte Verbindung überschreitet die Grenze von 150 Objekten oder 149 Verbindungen.', bridgeNoFit: 'In der begrenzten Suche wurde keine passende Verbindung gefunden. Prüfe Fahrwegbreite, Ständer und Hindernisse, wähle einen anderen Verlauf oder ändere die Umwegreserve.',
      bridgeDimensions: 'Gib eine benötigte Breite von 100–50.000 mm und Höhe von 100–15.000 mm ein oder lasse unbekannte Maße leer.',
      bridgeDimensionsHint: 'Maße gelten für neue Stücke; bekannte Endpunktmaße sind Mindestanforderungen. Leere Maße bleiben ungeprüft. Übernommene Reserven: {{width}} mm je Seite, {{height}} mm über dem Fahrzeug. Die Durchfahrtshöhe wird nicht als Fahrzeughöhe übernommen.',
      bridgeBlockedDetail: 'Ein geprüfter Verlauf wird blockiert durch {{object}}: {{reason}}.', bridgeHeightDetail: 'Lichte Höhe: {{available}} mm; benötigt einschließlich Reserve: {{required}} mm.',
      passage: 'Durchfahrt im gewählten Fach', passageHeight: 'Lichte Durchfahrtshöhe (mm)', passageWidth: 'Lichte Breite',
      passageRoute: 'Zugeordneter Fahrweg', noRoute: 'Kein Fahrweg zugeordnet', previewPassage: 'Durchfahrt vorschauen', removePassage: 'Durchfahrtzuordnung entfernen',
      routeWidth: 'Fahrwegbreite (mm)', requiredWidth: 'Benötigte Breite (mm)', requiredHeight: 'Benötigte Höhe (mm)',
      widthMargin: 'Seitliche Reserve je Seite (mm)', heightMargin: 'Höhenreserve (mm)', routeClear: 'Modellierter Durchfahrtsraum ist frei',
      routeHint: 'Beide benötigten Maße eingeben, um die Geometrieprüfung zu vervollständigen. Die Markierungsstärke ist unabhängig von der Durchfahrtshöhe.',
      'unverified-route': 'Fahrweg nicht vollständig geprüft: benötigte Maße fehlen', 'route-too-low': 'Durchfahrt zu niedrig', 'route-too-narrow': 'Durchfahrt zu schmal',
      partBeam: 'Traverse', partDeck: 'Fachboden', partUpright: 'Ständer', partFrame: 'Rahmen', partHeader: 'Oberer Rahmen', partBase: 'Fußrahmen', partBody: 'Bauteil', partLeaf: 'Türblatt',
      assembly: 'Verbinden und ausrichten', target: 'Zielobjekt', ownAnchor: 'Eigener Endpunkt', targetAnchor: 'Ziel-Endpunkt',
      start: 'Anfang', end: 'Ende', previewConnect: 'Verbindung vorschauen', previewAlign: 'Ausrichtung vorschauen', disconnect: 'Objektverbindungen lösen',
      groups: 'Gemeinsam bewegen', groupName: 'Gruppenname', groupCreate: 'Gewählte Objekte gruppieren', ungroup: 'Gruppe auflösen',
      extendStart: 'Fach am Anfang ergänzen', extendEnd: 'Fach am Ende ergänzen', continuePassage: 'Durchfahrt fortsetzen', targetBay: 'Zielfach (ab 1)',
      wallOpening: 'Wandöffnung einsetzen', openingType: 'Art der Öffnung', openingOffset: 'Abstand vom Wandanfang (mm)',
      openingWidth: 'Öffnungsbreite (mm)', openingHeight: 'Öffnungshöhe (mm)', previewOpening: 'Wandöffnung vorschauen',
      elevation: 'Unterkante über Boden (mm)', doorOpen: 'Tür geöffnet', previewTitle: 'Vorschau — noch nicht gespeichert', applyPreview: 'Änderungen übernehmen', cancel: 'Abbrechen',
      previewImpact: 'Betroffen: {{locations}} Lagerplätze, {{codes}} Codes, {{articles}} Artikelzuordnungen; {{removed}} Lagerplätze werden entfernt.', routeLength: 'Fahrweglänge (mm)', markingHeight: 'Markierungsstärke (mm)',
      growFrames: 'Benachbarte Rahmen bei Bedarf erhöhen', groupHint: 'Gruppen werden gemeinsam bewegt. Verbindungen erhalten gemeinsame Endpunkte und lassen sich separat lösen.',
      keepDirection: 'Aktuelle Richtung behalten', planningHint: 'Geometrieprüfung; Lasten, eingelagertes Gut und Verkehrseignung werden nicht bewertet.',
      empty: 'Noch keine Objekte. Füge ein Rezept hinzu.', properties: 'Eigenschaften', selected: 'Wähle ein Objekt zur Bearbeitung.',
      name: 'Name', x: 'X-Position (mm)', z: 'Z-Position (mm)', rotation: 'Drehung (°)', width: 'Breite (mm)',
      depth: 'Tiefe / Länge (mm)', rackDepth: 'Tiefe der Regalzeile (mm)',
      rackDepthHint: 'Gemeinsam für alle Fächer und Ständerrahmen dieser Regalzeile.',
      mixedDepth: 'Dieses gespeicherte Regal hat unterschiedliche Tiefen. Gib eine gemeinsame Zeilentiefe ein, um alle Fächer und Ständerrahmen auszurichten.',
      height: 'Höhe (mm)', bays: 'Fächer', levels: 'Ebenen in diesem Fach',
      positions: 'Lagerplätze in dieser Ebene', applyCounts: 'Fachanzahl übernehmen',
      applyBayLevels: 'Ebenenzahl dieses Fachs übernehmen', applyLevelPositions: 'Lagerplatzanzahl übernehmen',
      bay: 'Fach', level: 'Ebene', upright: 'Ständer',
      clearHeight: 'Lichte Fachhöhe (mm)', thickness: 'Traverse / Regalboden (mm)', deck: 'Fachboden hinzufügen',
      deckThickness: 'Fachbodenstärke (mm)', code: 'Stellplatzcode', codes: 'Codes der gewählten Ebene',
      codePrefix: 'Code-Präfix', generate: 'Leere Codes dieser Ebene füllen', generateRack: 'Leere Codes dieses Regals füllen', delete: 'Objekt löschen',
      copyName: 'Kopie von', rotateLeft: '90° links drehen', rotateRight: '90° rechts drehen',
      undo: 'Rückgängig', redo: 'Wiederholen', lock: 'Sperren', unlock: 'Entsperren', locked: 'Gesperrt',
      lockedHint: 'Dieses Objekt ist gesperrt. Ebenen und Stellplätze bleiben einsehbar; zum Bearbeiten entsperren.',
      lockedEdit: 'Objekt vor Änderungen oder Rückgängig/Wiederholen entsperren.',
      checks: 'Planprüfung', collision: 'Kollision', collisions: 'Kollisionen',
      overlap: 'Objekte überlappen', 'blocked-aisle': 'Gang blockiert', moreCollisions: 'weitere Kollisionen',
      view: '3D-Lagerplan', planView: 'Grundriss', fit: 'Einpassen', focus: 'Objekt fokussieren', top: 'Draufsicht', orbit: '3D-Ansicht',
      zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', zoomSensitivity: 'Zoomtempo', zoomSlow: 'Fein', zoomNormal: 'Normal', zoomFast: 'Schnell',
      zoomKeyboard: 'Bei fokussierter Ansicht: + / − zoomen, 0 passt ein. Strg+Mausrad bleibt für den Browserzoom verfügbar.',
      hint: 'Links ziehen: drehen · rechts oder mittig ziehen / Umschalt+ziehen: verschieben · Mausrad: zoomen · Doppelklick: Objekt fokussieren',
      hintTop: 'Objekt ziehen: verschieben · freie Fläche ziehen: Ansicht bewegen · Mausrad: zoomen · 100-mm-Raster',
      magnet: 'Magnet', magnetTitle: 'Passende Objektendpunkte im Grundriss ausrichten',
      magnetHint: 'Magnet aktiv: Nahe passende Endpunkte rasten vor dem Raster ein. Verbindungen über Verbinden speichern.',
      snapTo: 'Verbinden mit',
      noSelection: 'Wähle eine Regalebene, um die Stellplätze zu bearbeiten.', saved: 'Lagerplan lokal gespeichert.',
      removeWarning: 'Beim Verkleinern werden Stellplätze mit Codes entfernt. Fortfahren?', deleteWarning: 'Objekt und seine Stellplatzcodes löschen?',
      slotSummary: 'Lagerplätze ·', coded: 'codiert', missing: 'ohne Code', exact: 'Codes werden nach Entfernen äußerer Leerzeichen exakt abgeglichen. Führende Nullen bleiben erhalten.',
      choose: 'Rezept wählen',
      wizardCreate: 'Regal aufbauen', wizardEdit: 'Regalaufbau bearbeiten', wizardBasics: '1 · Grunddaten',
      wizardBays: '2 · Fächer und Ständer', wizardLevels: '3 · Ebenen und Vorschau',
      wizardIntro: 'Konfiguriere das Regal vor dem Einfügen in den Grundriss. Erst mit Übernehmen werden Änderungen gespeichert.',
      wizardName: 'Regalname', wizardType: 'Regaltyp', wizardBayCount: 'Anzahl Fächer',
      wizardDefaultLevels: 'Ebenen je Fach zum Start', wizardBayTable: 'Fächer', wizardUprightTable: 'Ständer',
      wizardLevelTable: 'Ebenen in Fach', wizardBaySelect: 'Fach bearbeiten', wizardFront: 'Schematische Vorderansicht',
      wizardTotalWidth: 'Gesamtbreite', wizardMaxDepth: 'Maximale Tiefe', wizardMaxHeight: 'Maximale Höhe',
      wizardPositionCount: 'Stellplätze', wizardCodedCount: 'codiert', wizardBack: 'Zurück', wizardNext: 'Weiter',
      wizardCancel: 'Abbrechen', wizardInsert: 'Regal einfügen', wizardApply: 'Änderungen übernehmen',
      wizardEditButton: 'Aufbau tabellarisch bearbeiten', wizardCheck: 'Prüfe diese Maße vor dem Übernehmen.',
      wizardUprightNumber: 'Ständer', wizardLevelNumber: 'Ebene', wizardBayNumber: 'Fach',
      wizardHeightError: 'Die Ebenen in Fach {{bay}} sind höher als ein angrenzender Ständer.',
      wizardTooManyPositions: 'Der Lagerplan kann höchstens 5.000 Stellplätze enthalten.',
      wizardTooManyObjects: 'Der Lagerplan kann höchstens 150 Objekte enthalten.',
      wallSolid: 'Wände: massiv', wallTransparent: 'Wände: transparent', wallHidden: 'Wände: ausgeblendet',
      wallModeHelp: 'Wanddarstellung in der 3D-Ansicht ändern', webglUnavailable: '3D ist in diesem Browserkontext nicht verfügbar. Der Grundriss bleibt nutzbar.'
    }
  };
  const TYPE_LABELS = {
    'pallet-rack': 'pallet', 'shelf-rack': 'shelf', wall: 'wall', gate: 'gate', door: 'door',
    'emergency-exit': 'exit', aisle: 'aisle', 'goods-in': 'goodsIn', 'goods-out': 'goodsOut'
  };
  const COLORS = {
    'pallet-rack': '#6c849b', 'shelf-rack': '#7a91a7', wall: '#647184', gate: '#cb9e54', door: '#b5a56d',
    'emergency-exit': '#42bd8a', aisle: '#336372', 'goods-in': '#477f88', 'goods-out': '#825d7e'
  };
  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function numberField(label, field, value, min, max) {
    return '<label class="wh-field"><span>' + esc(label) + '</span><input type="number" data-field="' + field +
      '" value="' + esc(value) + '" min="' + min + '" max="' + max + '" step="1"></label>';
  }
  function textField(label, field, value) {
    return '<label class="wh-field"><span>' + esc(label) + '</span><input type="text" data-field="' + field +
      '" value="' + esc(value) + '" maxlength="120"></label>';
  }
  function selectField(label, field, count, chosen) {
    return '<label class="wh-field"><span>' + esc(label) + '</span><select data-select="' + field + '">' +
      Array.from({ length: count }, function (_, index) {
        return '<option value="' + index + '"' + (index === chosen ? ' selected' : '') + '>' + (index + 1) + '</option>';
      }).join('') + '</select></label>';
  }
  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function distanceToSegment(x, y, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lengthSquared = dx * dx + dy * dy;
    const fraction = lengthSquared ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared)) : 0;
    return Math.hypot(x - a[0] - fraction * dx, y - a[1] - fraction * dy);
  }

  function create(options) {
    const model = options.model;
    const root = options.root;
    root.classList.add('wh-editor-root');
    const camera = { yaw: -0.62, pitch: 0.62, zoom: 1, target: null, baseScale: null, mode: 'orbit' };
    const topView = { ready: false, centerX: 0, centerZ: 0, scale: 1, zoom: 1 };
    const choice = { objectId: null, bay: 0, level: 0, upright: 0, slotId: null };
    let codePrefix = 'R01';
    let recipeType = model.RACK_TYPES[0] || model.AREA_TYPES[0];
    let mode = 'structure';
    let message = '';
    let pickFaces = [];
    let canvas = null;
    const glCanvas = document.createElement('canvas');
    glCanvas.className = 'wh-canvas wh-webgl-canvas';
    glCanvas.setAttribute('role', 'img');
    const wiredCanvases = new WeakSet();
    let webglRenderer = null;
    let wallMode = 'solid';
    let historyWorkspaceId = null;
    let undoStack = [];
    let redoStack = [];
    let saving = false;
    let magnetEnabled = false;
    let snapPreview = null;
    let rackWizard = null;
    let zoomSensitivity = 1, zoomFrame = null, sizeFrame = null;
    let lastRenderedObjectId = null, lastRenderedScope = null;
    let preview = null;
    let currentFindings = [], focusedPart = null;
    const groupSelection = new Set();
    const boxesFor = function (warehouse, matches) {
      return window.OpenSlottingWarehouseScene.buildBoxes(model, warehouse, matches, {
        colorMode: mode === 'structure' ? 'structure' : 'usage'
      });
    };

    function colorLegend(warehouse, t) {
      const materialColors = mode === 'structure' && camera.mode === 'orbit';
      const palette = window.OpenSlottingWarehouseScene.PALLET_PART_COLORS;
      const entries = materialColors ? [
        [palette.upright, t.palletFrameColor], [palette.beam, t.palletBeamColor], [palette.deck, t.palletDeckColor]
      ] : [];
      if (!materialColors || warehouse.objects.some(function (object) { return object.type === 'shelf-rack'; })) {
        model.USAGES.forEach(function (usage) { entries.push([model.USAGE_COLORS[usage], t[usage]]); });
      }
      return entries.map(function (entry) {
        return '<span><i style="background:' + entry[0] + '"></i>' + esc(entry[1]) + '</span>';
      }).join('');
    }

    webglRenderer = window.OpenSlottingWarehouseWebGL && window.OpenSlottingWarehouseWebGL.create(glCanvas, {
      onLost: function () { camera.mode = 'top'; message = labels().webglUnavailable; render(); },
      onRestored: function () { message = ''; render(); }
    });
    if (!webglRenderer) { camera.mode = 'top'; message = LABELS[options.getLanguage() === 'de' ? 'de' : 'en'].webglUnavailable; }

    function labels() { return LABELS[options.getLanguage() === 'de' ? 'de' : 'en']; }
    function layout() { return options.getLayout(); }
    function viewLayout() {
      return preview ? preview.layout : layout();
    }
    const scrollSelectors = ['.wh-sidebar', '.wh-main', '.wh-objects', '.wh-collision-list', '.wh-properties .wh-card',
      '.wh-group-members', '.wh-wizard', '.wh-wizard-table-wrap'];
    const focusAttributes = ['data-field', 'data-select', 'data-tool', 'data-zone', 'data-location', 'data-object',
      'data-group-member', 'data-action', 'data-wizard-field', 'data-wizard-action', 'data-focus-object', 'data-scope-bay',
      'data-zoom-sensitivity', 'data-mode', 'data-ui-key'];
    function captureUi() {
      const active = root.contains(document.activeElement) ? document.activeElement : null;
      const attributes = active ? Array.from(active.attributes).filter(function (attribute) {
        return attribute.name === 'id' || attribute.name === 'data-index' || attribute.name === 'data-focus-part' ||
          attribute.name === 'data-scope-level' || focusAttributes.includes(attribute.name);
      }).map(function (attribute) { return [attribute.name, attribute.value]; }) : [];
      const focus = active && (attributes.length || active.classList.contains('wh-canvas')) ? {
        canvas: active.classList.contains('wh-canvas'), attributes: attributes,
        contextual: active.closest('.wh-properties, .wh-wizard') !== null,
        start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection
      } : null;
      return { workspace: historyWorkspaceId, objectId: lastRenderedObjectId, scope: lastRenderedScope, focus: focus,
        rootTop: root.scrollTop, rootLeft: root.scrollLeft,
        scrolls: scrollSelectors.flatMap(function (selector) { return Array.from(root.querySelectorAll(selector)).map(function (element, index) {
          return { selector: selector, index: index, top: element.scrollTop, left: element.scrollLeft };
        }); }),
        details: Array.from(root.querySelectorAll('.wh-properties details')).map(function (element) { return element.open; }),
        drafts: Array.from(root.querySelectorAll('[data-tool], [data-field^="count."]')).map(function (element) {
          return { attribute: element.hasAttribute('data-tool') ? 'data-tool' : 'data-field',
            key: element.getAttribute(element.hasAttribute('data-tool') ? 'data-tool' : 'data-field'), value: element.value, checked: element.checked };
        }) };
    }
    function restoreUi(state, scope) {
      if (state.workspace !== historyWorkspaceId) return;
      const sameObject = state.objectId === choice.objectId, sameScope = state.scope === scope;
      if (sameObject) Array.from(root.querySelectorAll('.wh-properties details')).forEach(function (element, index) {
        if (state.details[index] !== undefined) element.open = state.details[index];
      });
      if (sameScope) state.drafts.forEach(function (draft) {
        const element = Array.from(root.querySelectorAll('[' + draft.attribute + ']')).find(function (item) { return item.getAttribute(draft.attribute) === draft.key; });
        if (element && !element.disabled && (element.tagName !== 'SELECT' || Array.from(element.options).some(function (option) { return option.value === draft.value && !option.disabled; }))) {
          element.value = draft.value; if (element.type === 'checkbox') element.checked = draft.checked;
        }
      });
      const focus = state.focus;
      if (focus && (!focus.contextual || sameScope)) {
        const target = focus.canvas ? (camera.mode === 'top' ? canvas : glCanvas) : Array.from(root.querySelectorAll('button, input, select, textarea, [tabindex]')).find(function (element) {
          return focus.attributes.every(function (attribute) { return element.getAttribute(attribute[0]) === attribute[1]; });
        });
        if (target && !target.disabled && !target.closest('[inert]')) {
          target.focus({ preventScroll: true });
          if (focus.start !== null && focus.start !== undefined && typeof target.setSelectionRange === 'function') {
            try { target.setSelectionRange(focus.start, focus.end, focus.direction || 'none'); } catch (_) { /* Number/select controls have no text selection API. */ }
          }
        }
      }
      state.scrolls.forEach(function (saved) {
        if (!sameObject && ['.wh-properties .wh-card', '.wh-group-members'].includes(saved.selector)) return;
        if (!sameScope && ['.wh-wizard', '.wh-wizard-table-wrap'].includes(saved.selector)) return;
        const element = root.querySelectorAll(saved.selector)[saved.index];
        if (element) { element.scrollTop = saved.top; element.scrollLeft = saved.left; }
      });
      root.scrollTop = state.rootTop; root.scrollLeft = state.rootLeft;
    }
    function scheduleSize() {
      if (sizeFrame !== null) return;
      sizeFrame = window.requestAnimationFrame(function () {
        sizeFrame = null;
        const active = camera.mode === 'top' ? canvas : glCanvas;
        if (active && active.isConnected && active.clientWidth > 0) paint(viewLayout(), null, currentFindings);
      });
    }
    function fitView() {
      if (camera.mode === 'orbit') { camera.zoom = 1; camera.target = null; camera.baseScale = null; }
      else { topView.zoom = 1; topView.ready = false; }
    }
    function zoomBy(amount) {
      if (camera.mode === 'orbit') ensureOrbitAnchor();
      const view = camera.mode === 'orbit' ? camera : topView;
      view.zoom = Math.max(0.25, Math.min(4, view.zoom * Math.exp(amount)));
      const output = root.querySelector('[data-zoom-value]');
      if (output) output.textContent = Math.round(view.zoom * 100) + '%';
      if (zoomFrame === null) zoomFrame = window.requestAnimationFrame(function () {
        zoomFrame = null;
        if (root.getClientRects().length) paint(viewLayout(), null, currentFindings);
      });
    }
    function scrollParent(element) {
      for (let parent = element.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
        if (/auto|scroll/.test(window.getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) return parent;
      }
      return null;
    }
    function wheelDistance(event, height) {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      return { x: event.deltaX * unit, y: event.deltaY * unit };
    }
    function syncHistoryScope() {
      const workspaceId = options.getWorkspaceId();
      if (workspaceId !== historyWorkspaceId) {
        historyWorkspaceId = workspaceId;
        undoStack = [];
        redoStack = [];
        rackWizard = null;
        preview = null; focusedPart = null; groupSelection.clear();
        mode = 'structure';
        camera.yaw = -0.62; camera.pitch = 0.62; camera.zoom = 1;
        camera.target = null; camera.baseScale = null;
        topView.ready = false; topView.zoom = 1;
      }
    }
    function keepRecent(stack, value) {
      stack.push(value);
      if (stack.length > 20) stack.shift();
    }
    function selected() { return layout().objects.find(function (object) { return object.id === choice.objectId; }) || null; }
    function objectName(object, t) { return object.name || t[TYPE_LABELS[object.type]]; }
    function ensureOrbitAnchor() {
      const view = webglRenderer && webglRenderer.view();
      if (!view) return null;
      if (!camera.target) camera.target = Object.assign({}, view.fitTarget);
      if (!Number.isFinite(camera.baseScale) || camera.baseScale <= 0) camera.baseScale = view.fitScale;
      return view;
    }
    function focusObject(objectId, partId) {
      if (camera.mode !== 'orbit' || !objectId) return false;
      const targetBoxes = boxesFor(viewLayout())
        .filter(function (item) { return item.object.id === objectId && (!partId || item.partId === partId); });
      if (!targetBoxes.length) return false;
      const view = window.OpenSlottingWarehouseWebGL.projectScene(targetBoxes,
        { yaw: camera.yaw, pitch: camera.pitch, zoom: 1 },
        Math.max(1, glCanvas.clientWidth), Math.max(1, glCanvas.clientHeight),
        null, null, new Set(), 'solid').view;
      camera.target = Object.assign({}, view.fitTarget);
      camera.baseScale = view.fitScale;
      camera.zoom = 1;
      return true;
    }
    function selectSlot(slot) {
      focusedPart = null;
      choice.objectId = slot.objectId;
      choice.bay = slot.bayIndex;
      choice.level = slot.levelIndex;
      choice.slotId = slot.slotId || null;
      message = '';
      render();
    }

    async function commit(next, historyAction, selectionAfter, toggleLockId, closeWizardOnSuccess, assemblyPose) {
      if (saving) return;
      syncHistoryScope();
      const scope = historyWorkspaceId;
      const before = clone(layout());
      const beforeSelection = choice.objectId;
      let normalized;
      let completed = false;
      try {
        if (historyAction === 'undo' || historyAction === 'redo') {
          const currentLocks = new Map(before.objects.map(function (object) { return [object.id, object.locked === true]; }));
          next.objects.forEach(function (object) { object.locked = currentLocks.get(object.id) || false; });
        }
        if (!historyAction && !toggleLockId) model.applyAssemblyChanges(before, next, assemblyPose);
        normalized = model.reconcileLayout(next);
        if (model.lockedEditConflict(before, normalized, toggleLockId)) {
          message = labels().lockedEdit; render(); return false;
        }
        if (JSON.stringify(normalized) === JSON.stringify(before)) { render(); return false; }
        const impact = model.layoutImpact(before, normalized, options.getRegistry ? options.getRegistry() : []);
        if (impact.locations) {
          const warning = labels().impactWarning.replace(/\{\{(locations|codes|articles|removed)\}\}/g,
            function (_, key) { return impact[key]; });
          if (!window.confirm(warning)) { render(); return false; }
        } else if (impact.removedObjects && !window.confirm(labels().deleteStructureWarning)) {
          render(); return false;
        }
        saving = true;
        root.setAttribute('aria-busy', 'true');
        root.classList.add('is-saving');
        await options.save(normalized);
        preview = null;
        syncHistoryScope();
        if (scope === historyWorkspaceId) {
          if (historyAction === 'undo') {
            undoStack.pop(); keepRecent(redoStack, { layout: before, selectionId: beforeSelection });
          } else if (historyAction === 'redo') {
            redoStack.pop(); keepRecent(undoStack, { layout: before, selectionId: beforeSelection });
          } else if (!toggleLockId) {
            keepRecent(undoStack, { layout: before, selectionId: beforeSelection }); redoStack = [];
          }
        }
        if (selectionAfter !== undefined) choice.objectId = selectionAfter;
        message = labels().saved;
        if (closeWizardOnSuccess) rackWizard = null;
        completed = true;
      } catch (error) {
        message = error && error.message ? error.message : String(error);
      } finally {
        saving = false;
        root.removeAttribute('aria-busy');
        root.classList.remove('is-saving');
      }
      render();
      return completed;
    }

    function openRackWizard(object, type) {
      const rack = object ? clone(object) : model.createRack(type, { name: labels()[TYPE_LABELS[type]] });
      if (!object) {
        const previous = layout().objects[layout().objects.length - 1];
        rack.x = previous ? previous.x + 1800 : 0;
        rack.z = previous ? previous.z + 1200 : 0;
      }
      rackWizard = { mode: object ? 'edit' : 'create', draft: rack, step: 0, activeBay: 0, error: '', saveError: '' };
      render();
      const first = root.querySelector('.wh-wizard [data-wizard-field="name"]');
      if (first) first.focus();
    }
    function wizardLayout() {
      const next = clone(layout());
      if (rackWizard.mode === 'edit') {
        const index = next.objects.findIndex(function (item) { return item.id === rackWizard.draft.id; });
        if (index < 0) throw new Error(labels().selected);
        next.objects[index] = clone(rackWizard.draft);
      } else next.objects.push(clone(rackWizard.draft));
      return next;
    }
    function wizardValidation() {
      if (model.rackDepth(rackWizard.draft) === null) return labels().mixedDepth;
      try { model.reconcileLayout(wizardLayout()); return ''; }
      catch (error) {
        const detail = error && error.message ? error.message : String(error);
        const height = /The levels exceed the height of an adjacent upright in bay (\d+)\./.exec(detail);
        if (height) return labels().wizardHeightError.replace('{{bay}}', height[1]);
        if (detail === 'A layout can contain at most 5000 locations.') return labels().wizardTooManyPositions;
        if (detail === 'A layout can contain at most 150 objects.') return labels().wizardTooManyObjects;
        return detail;
      }
    }
    function wizardNumber(value, min, max) {
      const number = Number(value);
      if (!Number.isInteger(number) || number < min || number > max) {
        throw new Error(min + '–' + max);
      }
      return number;
    }
    function wizardInput(field, value, min, max, index) {
      return '<input type="number" data-wizard-field="' + field + '"' +
        (index === undefined ? '' : ' data-index="' + index + '"') + ' value="' + esc(value) +
        '" min="' + min + '" max="' + max + '" step="1">';
    }
    function rackDiagram(rack, t) {
      const totalWidth = rack.bays.reduce(function (sum, bay) { return sum + bay.width; }, 0) +
        rack.uprights.reduce(function (sum, upright) { return sum + upright.width; }, 0);
      const maxHeight = Math.max.apply(null, rack.uprights.map(function (upright) { return upright.height; }));
      const scaleX = 760 / Math.max(totalWidth, 1), scaleY = 180 / Math.max(maxHeight, 1);
      let x = 20;
      const shapes = ['<line x1="16" y1="218" x2="784" y2="218" stroke="#71909b" stroke-width="2"/>'];
      rack.bays.forEach(function (bay, index) {
        const upright = rack.uprights[index];
        const uprightWidth = Math.max(2, upright.width * scaleX);
        shapes.push('<rect x="' + x + '" y="' + (216 - upright.height * scaleY) + '" width="' +
          uprightWidth + '" height="' + upright.height * scaleY + '" fill="#80a5b5"/>');
        x += upright.width * scaleX;
        const bayWidth = bay.width * scaleX;
        let height = 0;
        bay.levels.forEach(function (level) {
          height += level.clearHeight;
          shapes.push('<rect x="' + x + '" y="' + (216 - height * scaleY) + '" width="' + bayWidth +
            '" height="' + Math.max(2, level.thickness * scaleY) + '" fill="#58c7b9"/>');
          height += level.thickness;
        });
        if (rack.bays.length <= 10) shapes.push('<text x="' + (x + bayWidth / 2) +
          '" y="237" text-anchor="middle" fill="#acc1c9" font-size="11">' + (index + 1) + '</text>');
        x += bayWidth;
      });
      const last = rack.uprights[rack.uprights.length - 1];
      shapes.push('<rect x="' + x + '" y="' + (216 - last.height * scaleY) + '" width="' +
        Math.max(2, last.width * scaleX) + '" height="' + last.height * scaleY + '" fill="#80a5b5"/>');
      const depth = Math.max.apply(null, rack.bays.map(function (bay) { return bay.depth; }).concat(rack.uprights.map(function (upright) { return upright.depth; })));
      return '<div class="wh-wizard-preview"><strong>' + esc(t.wizardFront) + '</strong><svg viewBox="0 0 800 250" role="img" aria-label="' +
        esc(t.wizardFront) + '">' + shapes.join('') + '</svg><div class="wh-wizard-metrics"><span>' +
        esc(t.wizardTotalWidth) + ': <strong>' + totalWidth + ' mm</strong></span><span>' + esc(t.wizardMaxDepth) +
        ': <strong>' + depth + ' mm</strong></span><span>' + esc(t.wizardMaxHeight) + ': <strong>' + maxHeight +
        ' mm</strong></span></div></div>';
    }
    function wizardHtml(t) {
      const state = rackWizard, rack = state.draft;
      const rowDepth = model.rackDepth(rack);
      const steps = [t.wizardBasics, t.wizardBays, t.wizardLevels];
      const stepNav = '<ol class="wh-wizard-steps">' + steps.map(function (name, index) {
        return '<li' + (index === state.step ? ' aria-current="step"' : '') + '>' + esc(name) + '</li>';
      }).join('') + '</ol>';
      let body = '';
      if (state.step === 0) {
        body = '<div class="wh-wizard-basics"><label class="wh-field"><span>' + esc(t.wizardType) + '</span><select data-wizard-field="type"' +
          (state.mode === 'edit' ? ' disabled' : '') + '>' + model.RACK_TYPES.map(function (type) {
            return '<option value="' + type + '"' + (rack.type === type ? ' selected' : '') + '>' +
              esc(t[TYPE_LABELS[type]]) + '</option>';
          }).join('') + '</select></label><label class="wh-field"><span>' + esc(t.wizardName) +
          '</span><input type="text" data-wizard-field="name" value="' + esc(rack.name) + '" maxlength="120"></label>' +
          '<label class="wh-field"><span>' + esc(t.wizardBayCount) + '</span>' + wizardInput('bayCount', rack.bays.length, 1, 30) + '</label>' +
          (state.mode === 'create' ? '<label class="wh-field"><span>' + esc(t.wizardDefaultLevels) +
            '</span>' + wizardInput('defaultLevels', rack.bays[0].levels.length, 1, 12) + '</label>' : '') +
          '<label class="wh-field"><span>' + esc(t.rackDepth) + '</span>' +
          wizardInput('rackDepth', rowDepth === null ? '' : rowDepth, 200, 3000) +
          '</label><p class="wh-scope-hint wh-wizard-depth-hint">' + esc(rowDepth === null ? t.mixedDepth : t.rackDepthHint) + '</p></div>';
      } else if (state.step === 1) {
        body = '<h4>' + esc(t.wizardBayTable) + '</h4><div class="wh-wizard-table-wrap"><table class="wh-wizard-table"><thead><tr><th>' +
          esc(t.wizardBayNumber) + '</th><th>' + esc(t.width) + '</th><th>' + esc(t.levels) +
          '</th><th></th></tr></thead><tbody>' + rack.bays.map(function (bay, index) {
            return '<tr><th scope="row">' + (index + 1) + '</th><td>' + wizardInput('bay.width', bay.width, 300, 6000, index) +
              '</td><td>' + wizardInput('bay.levels', bay.levels.length, 1, 12, index) + '</td><td><button type="button" data-wizard-action="edit-bay" data-index="' +
              index + '">' + esc(t.wizardLevelTable) + '</button></td></tr>';
          }).join('') + '</tbody></table></div><h4>' + esc(t.wizardUprightTable) +
          '</h4><div class="wh-wizard-table-wrap"><table class="wh-wizard-table"><thead><tr><th>' + esc(t.wizardUprightNumber) +
          '</th><th>' + esc(t.width) + '</th><th>' + esc(t.height) + '</th></tr></thead><tbody>' +
          rack.uprights.map(function (upright, index) {
            return '<tr><th scope="row">' + (index + 1) + '</th><td>' + wizardInput('upright.width', upright.width, 20, 500, index) +
              '</td><td>' + wizardInput('upright.height', upright.height, 200, 20000, index) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      } else {
        const bay = rack.bays[state.activeBay];
        body = '<label class="wh-field wh-wizard-bay-select"><span>' + esc(t.wizardBaySelect) + '</span><select data-wizard-field="activeBay">' +
          rack.bays.map(function (_, index) { return '<option value="' + index + '"' +
            (index === state.activeBay ? ' selected' : '') + '>' + esc(t.wizardBayNumber) + ' ' + (index + 1) + '</option>'; }).join('') +
          '</select></label><div class="wh-wizard-table-wrap"><table class="wh-wizard-table"><thead><tr><th>' +
          esc(t.wizardLevelNumber) + '</th><th>' + esc(t.clearHeight) + '</th><th>' + esc(t.thickness) + '</th><th>' +
          esc(t.deck) + '</th><th>' + esc(t.deckThickness) + '</th></tr></thead><tbody>' +
          bay.levels.map(function (level, index) {
            return '<tr><th scope="row">' + (index + 1) + '</th><td>' + wizardInput('level.clearHeight', level.clearHeight, 100, 8000, index) +
              '</td><td>' + wizardInput('level.thickness', level.thickness, 10, 300, index) + '</td><td>' +
              '<input type="checkbox" data-wizard-field="level.deck" data-index="' +
              index + '" aria-label="' + esc(t.deck) + ' ' + (index + 1) + '"' + (level.deck ? ' checked' : '') +
              '></td><td>' + wizardInput('level.deckThickness', level.deckThickness, 10, 200, index) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      const issue = wizardValidation();
      return '<div class="wh-wizard-overlay"><section class="wh-wizard" role="dialog" aria-modal="true" aria-labelledby="wh-wizard-title" tabindex="-1">' +
        '<header><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3 id="wh-wizard-title">' +
        esc(state.mode === 'edit' ? t.wizardEdit : t.wizardCreate) + '</h3><p>' + esc(t.wizardIntro) + '</p></div>' +
        '<button type="button" data-wizard-action="cancel" aria-label="' + esc(t.wizardCancel) + '">×</button></header>' +
        stepNav + '<div class="wh-wizard-content"><div class="wh-wizard-form">' + body + '</div>' + rackDiagram(rack, t) +
        '</div><div class="wh-wizard-feedback" role="status" aria-live="polite">' +
        (state.error ? '<p class="wh-wizard-error">' + esc(state.error) + '</p>' :
          issue ? '<p class="wh-wizard-error">' + esc(t.wizardCheck) + ' ' + esc(issue) + '</p>' :
            state.saveError ? '<p class="wh-wizard-error">' + esc(state.saveError) + '</p>' : '') +
        '</div><footer><button type="button" data-wizard-action="cancel">' + esc(t.wizardCancel) + '</button><div>' +
        (state.step ? '<button type="button" data-wizard-action="back">' + esc(t.wizardBack) + '</button>' : '') +
        (state.step < 2 ? '<button type="button" class="wh-wizard-primary" data-wizard-action="next">' + esc(t.wizardNext) + '</button>' :
          '<button type="button" class="wh-wizard-primary" data-wizard-action="finish"' + (issue || state.error ? ' disabled' : '') + '>' +
          esc(state.mode === 'edit' ? t.wizardApply : t.wizardInsert) + '</button>') + '</div></footer></section></div>';
    }
    function refreshWizardFeedback() {
      if (!rackWizard) return;
      const issue = wizardValidation();
      const depthHint = root.querySelector('.wh-wizard-depth-hint');
      if (depthHint) depthHint.textContent = model.rackDepth(rackWizard.draft) === null ? labels().mixedDepth : labels().rackDepthHint;
      const feedback = root.querySelector('.wh-wizard-feedback');
      if (feedback) feedback.innerHTML = rackWizard.error ? '<p class="wh-wizard-error">' + esc(rackWizard.error) + '</p>' :
        issue ? '<p class="wh-wizard-error">' + esc(labels().wizardCheck) + ' ' + esc(issue) + '</p>' :
          rackWizard.saveError ? '<p class="wh-wizard-error">' + esc(rackWizard.saveError) + '</p>' : '';
      const preview = root.querySelector('.wh-wizard-preview');
      if (preview) preview.outerHTML = rackDiagram(rackWizard.draft, labels());
      const finish = root.querySelector('[data-wizard-action="finish"]');
      if (finish) finish.disabled = Boolean(issue || rackWizard.error);
    }
    function changeWizardField(input) {
      const field = input.dataset.wizardField;
      if (!field || !rackWizard) return;
      const state = rackWizard, draft = state.draft;
      const index = Number(input.dataset.index);
      const t = labels();
      const fieldNames = {
        bayCount: t.wizardBayCount, defaultLevels: t.wizardDefaultLevels, rackDepth: t.rackDepth,
        'bay.width': t.width, 'bay.levels': t.levels,
        'upright.width': t.width, 'upright.height': t.height,
        'level.clearHeight': t.clearHeight, 'level.thickness': t.thickness,
        'level.deckThickness': t.deckThickness
      };
      try {
        if (field === 'type') {
          if (state.mode !== 'create' || !model.RACK_TYPES.includes(input.value)) return;
          state.draft = model.createRack(input.value, { bayCount: draft.bays.length,
            name: labels()[TYPE_LABELS[input.value]], x: draft.x, z: draft.z, rotation: draft.rotation });
          state.activeBay = 0;
          state.error = '';
          render();
          return;
        } else if (field === 'name') {
          const name = input.value.trim();
          if (!name || name.length > 120) throw new Error(labels().wizardName + ': 1–120');
          draft.name = name;
        } else if (field === 'rackDepth') {
          state.draft = model.setRackDepth(draft, wizardNumber(input.value, 200, 3000));
        } else if (field === 'bayCount') {
          const count = wizardNumber(input.value, 1, 30);
          const resized = model.resizeRack(draft, count, null);
          state.draft = resized;
          state.activeBay = Math.min(state.activeBay, count - 1);
        } else if (field === 'defaultLevels') {
          if (state.mode !== 'create') return;
          const count = wizardNumber(input.value, 1, 12);
          let resized = draft;
          for (let bay = 0; bay < draft.bays.length; bay += 1) resized = model.resizeBayLevels(resized, bay, count);
          state.draft = resized;
        } else if (field === 'activeBay') {
          state.activeBay = wizardNumber(input.value, 0, draft.bays.length - 1);
          state.error = '';
          render();
          return;
        } else if (field === 'bay.levels') {
          const resized = model.resizeBayLevels(draft, index, wizardNumber(input.value, 1, 12));
          state.draft = resized;
        } else if (field === 'level.deck') {
          draft.bays[state.activeBay].levels[index].deck = input.checked;
        } else {
          const bounds = {
            'bay.width': [300, 6000],
            'upright.width': [20, 500], 'upright.height': [200, 20000],
            'level.clearHeight': [100, 8000], 'level.thickness': [10, 300], 'level.deckThickness': [10, 200]
          };
          if (!bounds[field]) return;
          const value = wizardNumber(input.value, bounds[field][0], bounds[field][1]);
          const parts = field.split('.');
          const holder = parts[0] === 'bay' ? draft.bays[index] : parts[0] === 'upright' ? draft.uprights[index] :
            draft.bays[state.activeBay].levels[index];
          holder[parts[1]] = value;
        }
        state.error = '';
        state.saveError = '';
        input.removeAttribute('aria-invalid');
      } catch (error) {
        const detail = error && error.message ? error.message : String(error);
        state.error = /^\d+–\d+$/.test(detail) ? (fieldNames[field] || field) + ': ' + detail : detail;
        input.setAttribute('aria-invalid', 'true');
      }
      refreshWizardFeedback();
    }

    function scopeProgress(object, level, t) {
      const scope = model.listScopes(layout()).find(function (item) { return item.levelId === level.id; });
      return '<div class="wh-progress" aria-label="' + esc(t.scopeProgress) + '"><span class="complete">✓ ' + esc(t.modeled) +
        '</span><span class="' + (scope.usage === 'unassigned' ? '' : 'complete') + '">' + esc(t[scope.usage] || scope.usage) +
        '</span><span class="' + (scope.locationCount && scope.codedCount === scope.locationCount ? 'complete' : '') + '">' +
        (scope.locationCount ? scope.codedCount + '/' + scope.locationCount + ' ' + esc(scope.codedCount === scope.locationCount ? t.configured : t.needsCodes) : esc(t.noLocations)) + '</span></div>';
    }
    function usageOptions(usage, t) {
      const choices = model.USAGES.includes(usage) ? model.USAGES : model.USAGES.concat([usage]);
      return choices.map(function (value) { return '<option value="' + esc(value) + '"' + (value === usage ? ' selected' : '') +
        '>' + esc(t[value] || value) + '</option>'; }).join('');
    }
    function currentZone(object) {
      return model.zoneForLevel(layout(), object.bays[choice.bay].levels[choice.level].id);
    }
    function scopeProperties(object, t) {
      if (!model.RACK_TYPES.includes(object.type)) return '<p class="wh-empty">' + esc(t.spatialHint) +
        '</p><button type="button" class="wh-small-button" data-mode="structure">' + esc(t.structure) + '</button>';
      const bay = object.bays[choice.bay], level = bay.levels[choice.level];
      const zone = currentZone(object);
      const locations = model.zoneLocations(layout(), zone.id);
      let html = '<div class="wh-property-grid">' + selectField(t.bay, 'bay', object.bays.length, choice.bay) +
        selectField(t.level, 'level', bay.levels.length, choice.level) + '</div>' + scopeProgress(object, level, t);
      if (mode === 'zones') {
        html += '<div class="wh-section"><label class="wh-field"><span>' + esc(t.bulkUsage) + '</span><select data-bulk-usage>' +
          usageOptions('picking', t) + '</select></label><button type="button" class="wh-small-button" data-action="usage-bay">' +
          esc(t.applyUsageBay) + '</button><button type="button" class="wh-small-button" data-action="usage-rack">' + esc(t.applyUsageRack) +
          '</button></div><div class="wh-zone-list">' + model.listScopes(layout()).filter(function (scope) { return scope.objectId === object.id; })
          .map(function (scope) {
            return '<div class="wh-zone-row' + (scope.levelId === level.id ? ' selected' : '') + '"><button type="button" data-scope-bay="' +
              scope.bayIndex + '" data-scope-level="' + scope.levelIndex + '">' + esc(t.bay) + ' ' + (scope.bayIndex + 1) +
              ' · ' + esc(t.level) + ' ' + (scope.levelIndex + 1) + '</button><label class="wh-field"><span>' + esc(t.usage) +
              '</span><select data-zone="' + esc(scope.zoneId) + '" style="border-left:4px solid ' +
              (model.USAGE_COLORS[scope.usage] || model.USAGE_COLORS.unassigned) + '">' + usageOptions(scope.usage, t) +
              '</select></label><small>' + scope.codedCount + '/' + scope.locationCount + ' ' + esc(t.coded) + '</small></div>';
          }).join('') + '</div>';
        return html;
      }
      const classified = zone.usage !== 'unassigned';
      if (!classified) html += '<p class="wh-scope-hint">' + esc(t.classificationNeeded) + '</p><button type="button" class="wh-small-button" data-mode="zones">' +
        esc(t.gotoZones) + '</button>' + (locations.some(function (location) { return location.legacy; }) ? '<p class="wh-scope-hint">' + esc(t.legacyHint) + '</p>' : '');
      html += '<div class="wh-section">' + numberField(t.positions, 'count.locations', locations.length, 0, 4) +
        '<button type="button" class="wh-small-button" data-action="resize-locations"' + (!classified ? ' disabled' : '') + '>' + esc(t.applyLevelPositions) + '</button></div>';
      html += '<div class="wh-section"><strong>' + esc(t.codes) + '</strong>' + (locations.length ? locations.map(function (location) {
        return '<label class="wh-code-row' + (location.id === choice.slotId ? ' selected' : '') + '"><span>' + (location.positionIndex + 1) +
          '</span><input type="text" data-location="' + esc(location.id) + '" value="' + esc(location.code) +
          '" maxlength="80" placeholder="' + esc(t.code) + '"' + (!classified && !location.legacy ? ' disabled' : '') + '></label>';
      }).join('') : '<p class="wh-empty">' + esc(t.noLocations) + '</p>') + '</div>';
      html += '<div class="wh-section wh-code-generator">' + textField(t.codePrefix, 'prefix', codePrefix) +
        '<button type="button" class="wh-small-button" data-action="generate"' + (!locations.length || (!classified && !locations.every(function (location) { return location.legacy; })) ? ' disabled' : '') +
        '>' + esc(t.generate) + '</button><button type="button" class="wh-small-button" data-action="generate-rack">' +
        esc(t.generateRack) + '</button><p class="wh-scope-hint">' + esc(t.exact) + '</p></div>';
      return html;
    }
    function toolNumber(label, key, value, min, max) {
      return '<label class="wh-field"><span>' + esc(label) + '</span><input type="number" data-tool="' + key +
        '" value="' + esc(value) + '" min="' + min + '" max="' + max + '" step="1"></label>';
    }
    function toolSelect(label, key, items) {
      return '<label class="wh-field"><span>' + esc(label) + '</span><select data-tool="' + key + '">' + items + '</select></label>';
    }
    function anchorLabel(anchor, t) {
      return anchor.direction ? t.port + ' ' + (anchor.index + 1) : t[anchor.index ? 'end' : 'start'];
    }
    function anchorOptions(object, t, selectedIndex) {
      const anchors = model.connectionAnchors(object);
      const occupied = function (anchor) { return (layout().connections || []).some(function (link) {
        return link.aId === object.id && link.aAnchor === anchor.index || link.bId === object.id && link.bAnchor === anchor.index;
      }); };
      const selected = anchors.find(function (anchor) { return anchor.index === selectedIndex && !occupied(anchor); }) || anchors.find(function (anchor) { return !occupied(anchor); });
      return anchors.map(function (anchor) {
        const busy = occupied(anchor);
        return '<option value="' + anchor.index + '"' + (anchor === selected ? ' selected' : '') + (busy ? ' disabled' : '') + '>' + esc(anchorLabel(anchor, t) + (busy ? ' · ' + t.occupiedPort : '')) + '</option>';
      }).join('');
    }
    function planningTools(object, t) {
      const describe = function (item) { return objectName(item, t) + ' · X ' + item.x + ' / Z ' + item.z + ' mm'; };
      const related = model.relatedObjects(layout(), object.id);
      const occupied = new Set();
      (layout().connections || []).forEach(function (link) { occupied.add(link.aId + ':' + link.aAnchor); occupied.add(link.bId + ':' + link.bAnchor); });
      const hasFreePort = function (item) { return model.connectionAnchors(item).some(function (anchor) { return !occupied.has(item.id + ':' + anchor.index); }); };
      const targets = layout().objects.filter(function (item) { return !related.has(item.id) && model.canConnect(object, item) && hasFreePort(item); });
      const currentTarget = root.querySelector('[data-tool="target"]');
      const target = targets.find(function (item) { return currentTarget && item.id === currentTarget.value; }) || targets[0];
      const bridgeDimension = function (key) {
        const values = [object.route && object.route[key], target && target.route && target.route[key]].filter(Number.isFinite);
        return values.length ? Math.max.apply(null, values) : '';
      };
      const targetOptions = targets.map(function (item) { return '<option value="' + esc(item.id) + '"' + (item === target ? ' selected' : '') + '>' + esc(describe(item)) + '</option>'; }).join('');
      let html = '';
      if (model.RACK_TYPES.includes(object.type)) {
        const bay = object.bays[choice.bay];
        const routes = layout().objects.filter(function (item) { return item.type === 'aisle'; });
        html += '<details class="wh-section" open><summary>' + esc(t.passage) + '</summary><p>' + esc(t.passageWidth) + ': ' + bay.width + ' mm</p>' +
          toolNumber(t.passageHeight, 'passage-height', bay.levels[0].clearHeight, 100, 8000) +
          toolNumber(t.levels, 'passage-levels', bay.levels.length, 1, 12) +
          '<label class="wh-check"><input type="checkbox" data-tool="grow-frames"><span>' + esc(t.growFrames) + '</span></label>' +
          toolSelect(t.passageRoute, 'passage-route', '<option value="">' + esc(t.noRoute) + '</option>' + routes.map(function (item) {
            return '<option value="' + esc(item.id) + '"' + (bay.passage && bay.passage.routeId === item.id ? ' selected' : '') + '>' + esc(describe(item)) + '</option>';
          }).join('')) + '<button type="button" data-action="preview-passage">' + esc(t.previewPassage) + '</button>' +
          (bay.passage ? '<button type="button" data-action="remove-passage">' + esc(t.removePassage) + '</button>' : '') +
          '<button type="button" data-action="extend-start">' + esc(t.extendStart) + '</button><button type="button" data-action="extend-end">' + esc(t.extendEnd) + '</button></details>';
      }
      if (hasFreePort(object) && targets.length) {
        html += '<details class="wh-section"><summary>' + esc(t.assembly) + '</summary>' + toolSelect(t.target, 'target', targetOptions) +
          toolSelect(t.ownAnchor, 'own-anchor', anchorOptions(object, t, 0)) + toolSelect(t.targetAnchor, 'target-anchor', anchorOptions(target, t, 1)) +
          toolSelect(t.rotation, 'connection-angle', '<option value="ports" selected>' + esc(t.portAlignment) + '</option><option value="keep">' + esc(t.keepDirection) + '</option><option value="0">0°</option><option value="90">90°</option><option value="-90">−90°</option><option value="180">180°</option>') +
          '<button type="button" data-action="preview-connect">' + esc(t.previewConnect) + '</button><button type="button" data-action="preview-align">' + esc(t.previewAlign) + '</button>' +
          ((layout().connections || []).some(function (link) { return link.aId === object.id || link.bId === object.id; }) ?
            '<button type="button" data-action="disconnect">' + esc(t.disconnect) + '</button>' : '') +
          (['aisle', 'wall'].includes(object.type) && target.type === object.type ? '<div class="wh-section"><p class="wh-scope-hint">' + esc(t.bridgeHint) + '</p>' +
            toolSelect(t.bridgeCourse, 'bridge-course', [['auto', t.bridgeAuto], ['straight', t.bridgeStraight], ['left', t.bridgeLeft], ['right', t.bridgeRight]].map(function (item) {
              return '<option value="' + item[0] + '">' + esc(item[1]) + '</option>';
            }).join('')) + toolNumber(t.bridgeReserve, 'bridge-reserve', 500, 100, 10000) +
            (object.type === 'aisle' ? toolNumber(t.requiredWidth, 'bridge-width', bridgeDimension('requiredWidth'), 100, 50000) +
              toolNumber(t.requiredHeight, 'bridge-height', bridgeDimension('requiredHeight'), 100, 15000) +
              '<p class="wh-scope-hint">' + esc(t.bridgeDimensionsHint.replace('{{width}}', Math.max(object.route.widthMargin, target.route.widthMargin))
                .replace('{{height}}', Math.max(object.route.heightMargin, target.route.heightMargin))) + '</p>' : '') +
            '<button type="button" data-action="preview-bridge">' + esc(t.previewBridge) + '</button></div>' : '') +
          (model.RACK_TYPES.includes(object.type) && object.bays[choice.bay].passage ? toolNumber(t.targetBay, 'target-bay', 1, 1, 30) +
            '<button type="button" data-action="continue-passage">' + esc(t.continuePassage) + '</button>' : '') + '</details>';
      }
      if ((layout().connections || []).some(function (link) { return link.aId === object.id || link.bId === object.id; }) && (!targets.length || !hasFreePort(object))) {
        html += '<div class="wh-section"><button type="button" data-action="disconnect">' + esc(t.disconnect) + '</button></div>';
      }
      if (object.type === 'wall' && !object.junction) {
        const openingOffset = Math.min(500, Math.max(0, object.width - 100));
        html += '<details class="wh-section"><summary>' + esc(t.wallOpening) + '</summary>' + toolSelect(t.openingType, 'opening-type',
          ['gate', 'door', 'emergency-exit'].map(function (type) { return '<option value="' + type + '">' + esc(t[TYPE_LABELS[type]]) + '</option>'; }).join('')) +
          toolNumber(t.openingOffset, 'opening-offset', openingOffset, 0, object.width) + toolNumber(t.openingWidth, 'opening-width', Math.min(2000, object.width - openingOffset), 100, object.width) +
          toolNumber(t.openingHeight, 'opening-height', Math.min(2200, object.height), 200, object.height) +
          '<button type="button" data-action="preview-opening">' + esc(t.previewOpening) + '</button></details>';
      }
      const group = (layout().groups || []).find(function (item) { return item.objectIds.includes(object.id); });
      html += '<details class="wh-section"><summary>' + esc(t.groups) + '</summary><p class="wh-scope-hint">' + esc(t.groupHint) + '</p>' + (group ? '<p>' + esc(group.name) + '</p><button type="button" data-action="ungroup">' + esc(t.ungroup) + '</button>' :
        '<label class="wh-field"><span>' + esc(t.groupName) + '</span><input data-tool="group-name" value="' + esc(t.groups) + '" maxlength="120"></label>' +
        '<div class="wh-group-members">' + layout().objects.map(function (item) { return '<label class="wh-check"><input type="checkbox" data-group-member="' + esc(item.id) +
          '"' + (item.id === object.id || groupSelection.has(item.id) ? ' checked' : '') + (item.locked || item.id === object.id ? ' disabled' : '') + '><span>' + esc(describe(item)) + '</span></label>'; }).join('') +
        '</div><button type="button" data-action="group">' + esc(t.groupCreate) + '</button>') + '</details>';
      return html;
    }
    function stage(next, label, pose, selectionId) {
      try {
        model.applyAssemblyChanges(layout(), next, pose);
        const candidate = model.reconcileLayout(next);
        if (model.lockedEditConflict(layout(), candidate)) throw new Error(labels().lockedEdit);
        preview = { layout: candidate, label: label, pose: pose, selectionId: selectionId === undefined ? choice.objectId : selectionId };
        preview.impact = model.layoutImpact(layout(), candidate, options.getRegistry ? options.getRegistry() : []);
        message = ''; render();
        const applyButton = root.querySelector('[data-action="apply-preview"]');
        if (applyButton) applyButton.focus();
      } catch (error) { message = error.message; render(); }
    }
    function properties(object, t) {
      if (!object) return '<p class="wh-empty">' + esc(t.selected) + '</p>';
      if (model.RACK_TYPES.includes(object.type)) {
        choice.bay = Math.min(choice.bay, object.bays.length - 1);
        choice.level = Math.min(choice.level, object.bays[choice.bay].levels.length - 1);
      }
      if (mode !== 'structure') return scopeProperties(object, t);
      let html = '<div class="wh-property-grid">' + textField(t.name, 'name', object.name) +
        numberField(t.x, 'x', object.x, -500000, 500000) + numberField(t.z, 'z', object.z, -500000, 500000) +
        numberField(t.rotation, 'rotation', object.rotation, -360, 360) + '</div>';
      if (!model.RACK_TYPES.includes(object.type)) {
        if (object.junction) {
          html += '<div class="wh-section"><strong>' + esc(t[object.junction.shape]) + '</strong><p class="wh-scope-hint">' + esc(t.junctionHint) + '</p><p class="wh-scope-hint">' + esc(t.connectionWidthHint) + '</p><div class="wh-property-grid">' +
            model.JUNCTION_DIRECTIONS[object.junction.shape].map(function (direction, index) {
              return numberField(t.armLength + ' · ' + t.port + ' ' + (index + 1) + ' (mm)', 'junction.arms.' + direction, object.junction.arms[direction], 100, 24000);
            }).join('') + '</div></div>';
        }
        html += '<div class="wh-property-grid">' + (object.junction || object.type === 'aisle' && object.route && object.route.path ? '' : numberField(object.type === 'aisle' ? t.routeLength : t.width, 'width', object.width, 100, 50000)) +
          numberField(object.type === 'aisle' ? t.routeWidth : object.type === 'wall' ? t.wallThickness : t.depth, 'depth', object.depth, object.type === 'aisle' ? 100 : 10, 50000) +
          numberField(object.type === 'aisle' ? t.markingHeight : t.height, 'height', object.height, 1, 15000) + '</div>';
        if (object.elevation !== undefined || object.type === 'wall' && object.junction) html += numberField(t.elevation, 'elevation', object.elevation || 0, 0, 20000);
        if (object.type === 'door') html += '<label class="wh-check"><input type="checkbox" data-field="open"' + (object.open ? ' checked' : '') + '><span>' + esc(t.doorOpen) + '</span></label>';
        if (object.type === 'aisle') {
          const route = object.route || {}, findings = currentFindings.filter(function (issue) { return issue.firstId === object.id || issue.secondId === object.id; });
          html += '<div class="wh-section">' + numberField(t.requiredWidth, 'route.requiredWidth', route.requiredWidth === null ? '' : route.requiredWidth, 100, 50000) +
            numberField(t.requiredHeight, 'route.requiredHeight', route.requiredHeight === null ? '' : route.requiredHeight, 100, 15000) +
            numberField(t.widthMargin, 'route.widthMargin', route.widthMargin || 0, 0, 5000) + numberField(t.heightMargin, 'route.heightMargin', route.heightMargin || 0, 0, 5000) +
            '<p class="wh-scope-hint">' + esc(t.routeHint) + '</p><p class="wh-route-status">' + esc(findings.length ? t[(findings.find(function (finding) { return finding.severity !== 'info'; }) || findings[0]).kind] : t.routeClear) + '</p>' +
            '<p class="wh-scope-hint">' + esc(t.planningHint) + '</p></div>';
        }
        return html + planningTools(object, t);
      }
      choice.bay = Math.min(choice.bay, object.bays.length - 1);
      choice.upright = Math.min(choice.upright, object.uprights.length - 1);
      const bay = object.bays[choice.bay];
      choice.level = Math.min(choice.level, bay.levels.length - 1);
      const level = bay.levels[choice.level];
      const stand = object.uprights[choice.upright];
      const depth = model.rackDepth(object);
      html += '<div class="wh-section">' + numberField(t.rackDepth, 'rack.depth', depth === null ? '' : depth, 200, 3000) +
        '<p class="wh-scope-hint">' + esc(depth === null ? t.mixedDepth : t.rackDepthHint) + '</p></div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        numberField(t.bays, 'count.bays', object.bays.length, 1, 30) +
        '</div><button type="button" class="wh-small-button" data-action="resize">' + esc(t.applyCounts) + '</button></div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        selectField(t.bay, 'bay', object.bays.length, choice.bay) +
        numberField(t.width, 'bay.width', bay.width, 300, 6000) +
        numberField(t.levels, 'count.bayLevels', bay.levels.length, 1, 12) +
        '</div><button type="button" class="wh-small-button" data-action="resize-bay">' + esc(t.applyBayLevels) + '</button></div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        selectField(t.level, 'level', bay.levels.length, choice.level) +
        numberField(t.clearHeight, 'level.clearHeight', level.clearHeight, 100, 8000) +
        numberField(t.thickness, 'level.thickness', level.thickness, 10, 300) +
        '</div><label class="wh-check"><input type="checkbox" data-field="level.deck"' + (level.deck ? ' checked' : '') + '><span>' + esc(t.deck) + '</span></label>' +
        numberField(t.deckThickness, 'level.deckThickness', level.deckThickness, 10, 200) + '</div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        selectField(t.upright, 'upright', object.uprights.length, choice.upright) +
        numberField(t.width, 'upright.width', stand.width, 20, 500) +
        numberField(t.height, 'upright.height', stand.height, 200, 20000) +
        '</div></div>';
      return html + scopeProgress(object, level, t) + planningTools(object, t);
    }

    function recipeOptions(t) {
      const supported = model.RECIPE_TYPES;
      const groups = [
        { label: 'recipeRacks', types: model.RACK_TYPES },
        { label: 'recipeBuilding', types: ['gate', 'door', 'emergency-exit'] },
        { label: 'recipeWalls', types: ['wall', 'wall-corner', 'wall-tee', 'wall-cross'] },
        { label: 'recipeRoutes', types: ['aisle', 'aisle-corner', 'aisle-tee', 'aisle-cross'] },
        { label: 'recipeAreas', types: ['goods-in', 'goods-out'] }
      ];
      const grouped = new Set(groups.flatMap(function (group) { return group.types; }));
      groups.push({ label: 'recipeOther', types: supported.filter(function (type) { return !grouped.has(type); }) });
      const locale = options.getLanguage() === 'de' ? 'de' : 'en';
      const name = function (type) {
        if (TYPE_LABELS[type]) return t[TYPE_LABELS[type]];
        const split = type.lastIndexOf('-');
        return t[TYPE_LABELS[type.slice(0, split)]] + ' · ' + t[type.slice(split + 1)];
      };
      return groups.map(function (group) {
        const types = group.types.filter(function (type) { return supported.includes(type); }).slice()
          .sort(function (a, b) { return name(a).localeCompare(name(b), locale); });
        if (!types.length) return '';
        return '<optgroup label="' + esc(t[group.label]) + '">' + types.map(function (type) {
          return '<option value="' + esc(type) + '"' + (type === recipeType ? ' selected' : '') + '>' + esc(name(type)) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    }

    function render() {
      const uiState = captureUi();
      const recipeInput = root.querySelector('#wh-recipe');
      if (recipeInput && model.RECIPE_TYPES.includes(recipeInput.value)) recipeType = recipeInput.value;
      syncHistoryScope();
      const t = labels();
      const warehouse = viewLayout();
      if (!warehouse.objects.some(function (object) { return object.id === choice.objectId; })) {
        choice.objectId = warehouse.objects.length ? warehouse.objects[0].id : null;
        choice.bay = 0; choice.level = 0; choice.upright = 0;
      }
      const object = selected();
      const slots = model.listSlots(warehouse);
      if (!slots.some(function (slot) { return slot.slotId === choice.slotId; })) choice.slotId = null;
      const coded = slots.filter(function (slot) { return Boolean(slot.code); }).length;
      const collisions = model.findCollisions(warehouse);
      currentFindings = collisions;
      const warnings = collisions.filter(function (item) { return item.severity !== 'info'; });
      const collisionIds = new Set(warnings.flatMap(function (item) { return [item.firstId, item.secondId]; }));
      const objectsById = new Map(warehouse.objects.map(function (item) { return [item.id, item]; }));
      const collisionSummary = warnings.length + ' ' + (warnings.length === 1 ? t.collision : t.collisions);
      const collisionPanel = collisions.length ? '<div class="wh-card wh-collisions' + (warnings.length ? '' : ' is-info') + '"><h4>' + esc(t.checks) +
        ' · ' + esc(collisionSummary) + '</h4><div class="wh-collision-list" tabindex="0" data-ui-key="layout-checks" aria-label="' + esc(t.checks) + '">' + collisions.slice(0, 12).map(function (item) {
          const first = objectsById.get(item.firstId), second = objectsById.get(item.secondId);
          const part = item.partKind ? t['part' + item.partKind.charAt(0).toUpperCase() + item.partKind.slice(1)] : '';
          return '<div class="wh-collision-row' + (item.severity === 'info' ? ' is-info' : '') + '"><small>' + esc(t[item.kind]) + (part ? ' · ' + esc(part) : '') +
            (item.requiredHeight !== undefined && item.kind === 'route-too-low' ? ' · ' + item.availableHeight + ' / ' + item.requiredHeight + ' mm' : '') + '</small><div><button type="button" data-focus-object="' +
            esc(first.id) + '" title="' + esc(first.name) + '">' + esc(first.name) + '</button><span>↔</span><button type="button" data-focus-object="' +
            esc(second.id) + '" title="' + esc(second.name) + '">' + esc(second.name) + '</button></div>' +
            (item.partId ? '<button type="button" data-focus-object="' + esc(item.obstacleId) + '" data-focus-part="' + esc(item.partId) +
              '"' + (item.bayIndex === undefined ? '' : ' data-bay="' + item.bayIndex + '" data-level="' + item.levelIndex + '"') + '>' + esc(part || t.partBody) + '</button>' : '') + '</div>';
        }).join('') + '</div>' + (collisions.length > 12 ? '<p>' + (collisions.length - 12) + ' ' + esc(t.moreCollisions) + '</p>' : '') +
        '</div>' : '';
      root.innerHTML = '<div class="wh-header"><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3>' + esc(t.view) + '</h3><p>' +
        esc(t[mode + 'Help']) + '</p></div><div class="wh-summary"><strong>' + warehouse.objects.length + '</strong> ' + esc(t.objects) +
        '<br><strong>' + slots.length + '</strong> ' + esc(t.slotSummary) + ' ' + coded + ' ' + esc(t.coded) +
        (warnings.length ? '<br><span class="wh-summary-conflicts">⚠ ' + esc(collisionSummary) + '</span>' : '') + '</div></div>' +
        (preview ? '<div class="wh-preview" role="status"><strong>' + esc(t.previewTitle) + ': ' + esc(preview.label) +
          '</strong><span>' + esc(t.previewImpact.replace(/\{\{(locations|codes|articles|removed)\}\}/g, function (_, key) { return preview.impact[key]; })) +
          '</span>' + (preview.unverifiedRoute ? '<span>' + esc(t['unverified-route']) + '</span>' : '') +
          '<button type="button" data-action="apply-preview">' + esc(t.applyPreview) + '</button><button type="button" data-action="cancel-preview">' + esc(t.cancel) + '</button></div>' : '') +
        '<nav class="wh-modes" aria-label="' + esc(t.view) + '"' + (rackWizard || preview ? ' inert' : '') + '>' + ['structure', 'zones', 'locations'].map(function (step, index) {
          return '<button type="button" data-mode="' + step + '" aria-pressed="' + (step === mode) + '">' + (index + 1) + ' · ' + esc(t[step]) + '</button>';
        }).join('') + '</nav>' +
        '<div class="wh-editor-grid"' + (rackWizard ? ' inert' : '') + '><aside class="wh-sidebar"' + (preview ? ' inert' : '') + '>' + (mode === 'structure' ? '<div class="wh-card"><h4>' + esc(t.add) + '</h4>' +
        '<select id="wh-recipe" aria-label="' + esc(t.choose) + '">' +
        recipeOptions(t) + '</select><button type="button" class="wh-add-button" data-action="add">' + esc(t.addButton) +
        '</button></div>' : '') +
        collisionPanel +
        '<div class="wh-card wh-objects" tabindex="0" aria-label="' + esc(t.objects) + '" data-ui-key="object-list"><h4>' + esc(t.objects) + '</h4>' +
        (warehouse.objects.length ? warehouse.objects.map(function (item) {
          return '<button type="button" class="wh-object' + (item.id === choice.objectId ? ' active' : '') +
            (collisionIds.has(item.id) ? ' is-conflict' : '') +
            (item.locked ? ' is-locked' : '') +
            '" data-object="' + esc(item.id) + '" aria-pressed="' + (item.id === choice.objectId) + '"><span class="wh-object-icon" style="--wh-color:' +
            COLORS[item.type] + '"></span><span><strong>' + esc(objectName(item, t)) + '</strong><small>' + esc(t[TYPE_LABELS[item.type]]) +
            (item.locked ? ' · 🔒 ' + esc(t.locked) : '') +
            (collisionIds.has(item.id) ? ' · ⚠ ' + esc(t.collision) : '') + '</small></span></button>';
        }).join('') : '<p class="wh-empty">' + esc(t.empty) + '</p>') + '</div></aside>' +
        '<div class="wh-main"><div class="wh-view-toolbar"><strong>' + esc(camera.mode === 'top' ? t.planView : t.view) +
        '</strong><div><button type="button" data-action="undo"' + (undoStack.length ? '' : ' disabled') +
        ' title="Ctrl+Z">' + esc(t.undo) + '</button><button type="button" data-action="redo"' +
        (redoStack.length ? '' : ' disabled') + ' title="Ctrl+Y / Ctrl+Shift+Z">' + esc(t.redo) +
        '</button><button type="button" data-action="fit">' + esc(t.fit) +
        '</button><button type="button" data-action="zoom-out" aria-label="' + esc(t.zoomOut) + '" title="' + esc(t.zoomOut) + '">−</button>' +
        '<output class="wh-zoom-value" data-zoom-value aria-label="Zoom">' + Math.round((camera.mode === 'orbit' ? camera.zoom : topView.zoom) * 100) + '%</output>' +
        '<button type="button" data-action="zoom-in" aria-label="' + esc(t.zoomIn) + '" title="' + esc(t.zoomIn) + '">+</button>' +
        '<label class="wh-zoom-speed"><span>' + esc(t.zoomSensitivity) + '</span><select data-zoom-sensitivity aria-label="' + esc(t.zoomSensitivity) + '">' +
        [[0.5, t.zoomSlow], [1, t.zoomNormal], [2, t.zoomFast]].map(function (item) { return '<option value="' + item[0] + '"' +
          (zoomSensitivity === item[0] ? ' selected' : '') + '>' + esc(item[1]) + '</option>'; }).join('') + '</select></label>' +
        (camera.mode === 'orbit' ? '<button type="button" data-action="focus"' +
          (object ? '' : ' disabled') + '>' + esc(t.focus) + '</button>' : '') + '<button type="button" data-action="magnet" aria-pressed="' + magnetEnabled +
        '" title="' + esc(t.magnetTitle) + '">⌁ ' + esc(t.magnet) +
        '</button>' + (camera.mode === 'orbit' ? '<button type="button" data-action="wall-mode" title="' +
          esc(t.wallModeHelp) + '">' + esc(t[wallMode === 'solid' ? 'wallSolid' : wallMode === 'transparent' ? 'wallTransparent' : 'wallHidden']) +
          '</button>' : '') + '<button type="button" data-action="top" aria-pressed="' + (camera.mode === 'top') + '">' + esc(t.top) +
        '</button><button type="button" data-action="orbit" aria-pressed="' + (camera.mode === 'orbit') +
        '"' + (!webglRenderer || !webglRenderer.available() ? ' disabled title="' + esc(t.webglUnavailable) + '"' : '') + '>' +
        esc(t.orbit) + '</button></div></div><div class="wh-viewport"><canvas class="wh-canvas is-top' +
        (camera.mode === 'top' ? '' : ' is-hidden') + '" role="img" tabindex="0" aria-label="' + esc(t.planView) + '" title="' + esc(t.zoomKeyboard) + '"></canvas>' +
        '<div class="wh-webgl-slot' + (camera.mode === 'orbit' ? '' : ' is-hidden') + '"></div></div>' +
        '<div class="wh-view-hint" id="wh-navigation-hint">' + esc(camera.mode === 'top' ? (mode === 'structure' ? t.hintTop + (magnetEnabled ? ' · ' + t.magnetHint : '') : t.inspectHint) + ' · ' + t.topZonesHint : t.hint) + ' · ' + esc(t.zoomKeyboard) + '</div>' +
        '<div class="wh-legend">' + colorLegend(warehouse, t) + '</div>' +
        '</div><aside class="wh-properties"' + (preview ? ' inert' : '') + '><div class="wh-card" tabindex="0" data-ui-key="properties" aria-label="' + esc(t.properties) + '"><div class="wh-properties-head"><h4>' + esc(t.properties) + '</h4>' +
        (object && mode === 'structure' ? '<button type="button" class="wh-delete" data-action="delete">' + esc(t.delete) + '</button>' : '') +
        '</div>' + (object ? '<div class="wh-object-actions"><button type="button" class="wh-lock-toggle" data-action="toggle-lock" aria-pressed="' +
          Boolean(object.locked) + '">' + (object.locked ? '🔓 ' + esc(t.unlock) : '🔒 ' + esc(t.lock)) +
        '</button>' + (mode === 'structure' ? (model.RACK_TYPES.includes(object.type) ? '<button type="button" data-action="edit-rack">' +
          esc(t.wizardEditButton) + '</button>' : '') + '<button type="button" data-action="duplicate">' +
          esc(t.duplicate) + '</button><button type="button" data-action="rotate-left" title="' + esc(t.rotateLeft) +
          '">↶ 90°</button><button type="button" data-action="rotate-right" title="' + esc(t.rotateRight) +
          '">↷ 90°</button>' : '') + '</div>' + (object.locked ? '<p class="wh-locked-hint">🔒 ' + esc(t.lockedHint) + '</p>' : '') : '') + properties(object, t) +
        '</div></aside></div>' + (rackWizard ? wizardHtml(t) : '') +
        '<p class="wh-message" role="status" aria-live="polite">' + esc(message) + '</p>';
      if (object && object.locked) {
        root.querySelectorAll('.wh-properties [data-field], .wh-properties [data-tool], .wh-properties [data-group-member], .wh-properties [data-zone], .wh-properties [data-location], .wh-properties [data-bulk-usage], .wh-properties [data-action]:not([data-action="toggle-lock"])')
          .forEach(function (control) { control.disabled = true; });
      }
      if (preview) {
        root.querySelectorAll('.wh-view-toolbar [data-action]').forEach(function (control) {
          const allowed = ['fit', 'focus', 'wall-mode', 'top', 'orbit', 'zoom-in', 'zoom-out'];
          if (!allowed.includes(control.dataset.action)) control.disabled = true;
        });
      }
      root.querySelector('.wh-webgl-slot').appendChild(glCanvas);
      if (mode === 'locations' && object && model.RACK_TYPES.includes(object.type) && currentZone(object).usage === 'unassigned') {
        root.querySelector('[data-field="count.locations"]').disabled = true;
      }
      glCanvas.setAttribute('aria-label', t.view);
      glCanvas.tabIndex = 0;
      glCanvas.title = t.zoomKeyboard;
      glCanvas.setAttribute('aria-describedby', 'wh-navigation-hint');
      canvas = root.querySelector('canvas.is-top');
      canvas.setAttribute('aria-describedby', 'wh-navigation-hint');
      root.querySelectorAll('.wh-properties details summary').forEach(function (element, index) { element.dataset.uiKey = 'section-' + index; element.tabIndex = 0; });
      root.querySelectorAll('.wh-collision-row').forEach(function (row, rowIndex) {
        row.querySelectorAll('button').forEach(function (button, buttonIndex) { button.dataset.uiKey = 'finding-' + rowIndex + '-' + buttonIndex; });
      });
      const scope = JSON.stringify([historyWorkspaceId, choice.objectId, mode, choice.bay, choice.level, choice.upright, rackWizard && rackWizard.step]);
      restoreUi(uiState, scope);
      lastRenderedObjectId = choice.objectId; lastRenderedScope = scope;
      paint(warehouse, collisionIds, collisions);
      wireCanvas();
    }

    function fitTop(warehouse, width, height) {
      const corners = warehouse.objects.flatMap(function (object) { return model.footprintCorners(object); });
      if (!corners.length) corners.push({ x: -5000, z: -3500 }, { x: 5000, z: 3500 });
      const minX = Math.min.apply(null, corners.map(function (point) { return point.x; }));
      const maxX = Math.max.apply(null, corners.map(function (point) { return point.x; }));
      const minZ = Math.min.apply(null, corners.map(function (point) { return point.z; }));
      const maxZ = Math.max.apply(null, corners.map(function (point) { return point.z; }));
      topView.centerX = (minX + maxX) / 2;
      topView.centerZ = (minZ + maxZ) / 2;
      topView.scale = Math.min(Math.max(1, width - 90) / Math.max(3000, maxX - minX),
        Math.max(1, height - 100) / Math.max(3000, maxZ - minZ));
      topView.ready = true;
    }

    function topPoint(x, z, width, height) {
      const scale = topView.scale * topView.zoom;
      return [(x - topView.centerX) * scale + width / 2, (z - topView.centerZ) * scale + height / 2];
    }

    function topWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const scale = topView.scale * topView.zoom;
      return {
        x: (clientX - rect.left - canvas.clientWidth / 2) / scale + topView.centerX,
        z: (clientY - rect.top - canvas.clientHeight / 2) / scale + topView.centerZ
      };
    }

    function topHit(x, y) {
      const ordered = pickFaces.slice().reverse();
      const inside = ordered.find(function (face) { return pointInPolygon(x, y, face.polygon); });
      if (inside) return inside;
      return ordered.find(function (face) {
        const xs = face.polygon.map(function (point) { return point[0]; });
        const ys = face.polygon.map(function (point) { return point[1]; });
        if (Math.min(Math.max.apply(null, xs) - Math.min.apply(null, xs),
          Math.max.apply(null, ys) - Math.min.apply(null, ys)) > 14) return false;
        return face.polygon.some(function (point, index) {
          return distanceToSegment(x, y, point, face.polygon[(index + 1) % face.polygon.length]) <= 9;
        });
      });
    }

    function paintTop(ctx, width, height, warehouse, collisionIds) {
      const scopeIndex = model.createScopeIndex(warehouse);
      if (!topView.ready) fitTop(warehouse, width, height);
      const scale = topView.scale * topView.zoom;
      const left = topView.centerX - width / (2 * scale), right = topView.centerX + width / (2 * scale);
      const top = topView.centerZ - height / (2 * scale), bottom = topView.centerZ + height / (2 * scale);
      const step = scale * 500 >= 14 ? 500 : scale * 1000 >= 14 ? 1000 : 5000;
      ctx.lineWidth = 1;
      for (let x = Math.ceil(left / step) * step; x <= right; x += step) {
        const screenX = topPoint(x, 0, width, height)[0];
        ctx.strokeStyle = x === 0 ? '#467989' : x % (step * 2) === 0 ? '#2a3d47' : '#203039';
        ctx.beginPath(); ctx.moveTo(screenX, 0); ctx.lineTo(screenX, height); ctx.stroke();
      }
      for (let z = Math.ceil(top / step) * step; z <= bottom; z += step) {
        const screenZ = topPoint(0, z, width, height)[1];
        ctx.strokeStyle = z === 0 ? '#467989' : z % (step * 2) === 0 ? '#2a3d47' : '#203039';
        ctx.beginPath(); ctx.moveTo(0, screenZ); ctx.lineTo(width, screenZ); ctx.stroke();
      }
      pickFaces = [];
      const objects = warehouse.objects.slice().sort(function (a, b) {
        const rank = function (item) {
          return ['aisle', 'goods-in', 'goods-out'].includes(item.type) ? 0 : model.RACK_TYPES.includes(item.type) ? 2 : 1;
        };
        return rank(a) - rank(b);
      });
      // One nonzero-winding fill gives overlapping lane rectangles the same
      // opacity as a single lane. All model rectangles share their winding.
      ctx.beginPath();
      objects.filter(function (object) { return object.type === 'aisle'; }).forEach(function (object) {
        model.routeSegments(object).forEach(function (segment) {
          const shape = model.footprintCorners(segment).map(function (point) { return topPoint(point.x, point.z, width, height); });
          ctx.moveTo(shape[0][0], shape[0][1]);
          shape.slice(1).forEach(function (point) { ctx.lineTo(point[0], point[1]); }); ctx.closePath();
        });
      });
      ctx.fillStyle = COLORS.aisle; ctx.globalAlpha = 0.28; ctx.fill('nonzero'); ctx.globalAlpha = 1;
      objects.forEach(function (object) {
        const corners = model.footprintCorners(object);
        const polygon = corners.map(function (point) { return topPoint(point.x, point.z, width, height); });
        ctx.beginPath(); ctx.moveTo(polygon[0][0], polygon[0][1]);
        polygon.slice(1).forEach(function (point) { ctx.lineTo(point[0], point[1]); }); ctx.closePath();
        ctx.fillStyle = COLORS[object.type];
        ctx.globalAlpha = ['aisle', 'goods-in', 'goods-out'].includes(object.type) ? 0.28 : 0.48;
        const compound = object.junction || object.type === 'aisle' && object.route && object.route.path;
        if (!compound && object.type !== 'aisle') ctx.fill(); ctx.globalAlpha = 1;
        const colliding = collisionIds.has(object.id);
        ctx.strokeStyle = colliding ? object.id === choice.objectId ? '#ffd28a' : '#ff8374' :
          object.id === choice.objectId ? '#91f4e2' : COLORS[object.type];
        ctx.lineWidth = object.id === choice.objectId || colliding ? 3 : 1.5;
        if (!compound) ctx.stroke();
        if (compound) model.routeSegments(object).forEach(function (segment) {
          const shape = model.footprintCorners(segment).map(function (point) { return topPoint(point.x, point.z, width, height); });
          ctx.beginPath(); ctx.moveTo(shape[0][0], shape[0][1]); shape.slice(1).forEach(function (point) { ctx.lineTo(point[0], point[1]); }); ctx.closePath();
          if (object.type !== 'aisle') { ctx.globalAlpha = 0.48; ctx.fill(); ctx.globalAlpha = 1; }
          ctx.stroke(); pickFaces.push({ objectId: object.id, polygon: shape });
        });
        if (model.RACK_TYPES.includes(object.type)) {
          pickFaces.push({ objectId: object.id, polygon: polygon });
          let divider = object.uprights[0].width;
          const angle = object.rotation * Math.PI / 180;
          object.bays.forEach(function (bay, index) {
            const local = function (x, z) { return topPoint(object.x + Math.cos(angle) * x - Math.sin(angle) * z,
              object.z + Math.sin(angle) * x + Math.cos(angle) * z, width, height); };
            bay.levels.forEach(function (level, levelIndex) {
              const zone = scopeIndex.zonesByLevel.get(level.id);
              const locations = zone && scopeIndex.locationsByZone.get(zone.id) || [];
              const bandDepth = bay.depth / bay.levels.length;
              const parts = mode === 'locations' && locations.length ? locations : [null];
              parts.forEach(function (location, positionIndex) {
                const x = divider + positionIndex * bay.width / parts.length;
                const z = levelIndex * bandDepth;
                const band = [local(x, z), local(x + bay.width / parts.length, z),
                  local(x + bay.width / parts.length, z + bandDepth), local(x, z + bandDepth)];
                ctx.beginPath(); ctx.moveTo(band[0][0], band[0][1]);
                band.slice(1).forEach(function (point) { ctx.lineTo(point[0], point[1]); }); ctx.closePath();
                ctx.fillStyle = model.USAGE_COLORS[zone ? zone.usage : 'unassigned'] || model.USAGE_COLORS.unassigned;
                ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
                ctx.strokeStyle = object.id === choice.objectId && index === choice.bay && levelIndex === choice.level ? '#efffff' : '#253941';
                ctx.lineWidth = 1; ctx.stroke();
                if (bandDepth * scale > 16 && bay.width * scale / parts.length > 32) {
                  const center = local(x + bay.width / parts.length / 2, z + bandDepth / 2);
                  ctx.font = '10px Segoe UI, sans-serif'; ctx.fillStyle = '#10202a'; ctx.textAlign = 'center';
                  ctx.fillText('L' + (levelIndex + 1) + (location ? ' · ' + (positionIndex + 1) : ''), center[0], center[1]);
                }
                pickFaces.push({ objectId: object.id, bayIndex: index, levelIndex: levelIndex,
                  slotId: location && location.id, polygon: band });
              });
            });
            if (bay.passage) {
              const start = local(divider + bay.width / 2, 0), end = local(divider + bay.width / 2, bay.depth);
              ctx.beginPath(); ctx.moveTo(start[0], start[1]); ctx.lineTo(end[0], end[1]); ctx.strokeStyle = '#91f4e2'; ctx.lineWidth = 3; ctx.stroke();
              ctx.fillStyle = '#e4fff9'; ctx.fillText('↕ ' + bay.levels[0].clearHeight + ' mm', (start[0] + end[0]) / 2, (start[1] + end[1]) / 2);
            }
            divider += bay.width;
            const localX = divider;
            const depth = model.objectFootprint(object).depth;
            const start = topPoint(object.x + Math.cos(angle) * localX, object.z + Math.sin(angle) * localX, width, height);
            const end = topPoint(object.x + Math.cos(angle) * localX - Math.sin(angle) * depth,
              object.z + Math.sin(angle) * localX + Math.cos(angle) * depth, width, height);
            ctx.beginPath(); ctx.moveTo(start[0], start[1]); ctx.lineTo(end[0], end[1]);
            ctx.strokeStyle = '#a5bdc7'; ctx.lineWidth = 1; ctx.stroke();
            divider += object.uprights[index + 1].width;
          });
        }
        const center = object.junction ? topPoint(object.x, object.z, width, height) : null;
        const centerX = center ? center[0] : polygon.reduce(function (sum, point) { return sum + point[0]; }, 0) / 4;
        const centerY = center ? center[1] : polygon.reduce(function (sum, point) { return sum + point[1]; }, 0) / 4;
        ctx.font = '12px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const name = (object.locked ? '🔒 ' : '') + (colliding ? '⚠ ' : '') + object.name;
        ctx.lineWidth = 3; ctx.strokeStyle = '#0d151c'; ctx.strokeText(name, centerX, centerY);
        ctx.fillStyle = '#e4f2f2'; ctx.fillText(name, centerX, centerY);
        if (!model.RACK_TYPES.includes(object.type) && !compound) pickFaces.push({ objectId: object.id, polygon: polygon });
      });
      const portObjects = preview ? [preview.selectionId].concat(preview.targetId || []) : mode === 'structure' && magnetEnabled ? [choice.objectId] : [];
      portObjects.forEach(function (key) {
        const object = warehouse.objects.find(function (item) { return item.id === key; });
        if (!object) return;
        model.connectionAnchors(object).forEach(function (anchor) {
          const position = topPoint(anchor.x, anchor.z, width, height);
          const occupied = (warehouse.connections || []).some(function (link) {
            return link.aId === object.id && link.aAnchor === anchor.index || link.bId === object.id && link.bAnchor === anchor.index;
          });
          ctx.beginPath(); ctx.arc(position[0], position[1], 6, 0, Math.PI * 2); ctx.fillStyle = occupied ? '#7790a6' : '#ffda86'; ctx.fill();
          ctx.fillText(anchorLabel(anchor, labels()) + (occupied ? ' · ' + labels().occupiedPort : ''), position[0] + 10, position[1] - 10);
        });
      });
      if (snapPreview && magnetEnabled) {
        const point = topPoint(snapPreview.point.x, snapPreview.point.z, width, height);
        const target = warehouse.objects.find(function (object) { return object.id === snapPreview.targetId; });
        ctx.save();
        ctx.strokeStyle = '#f6d687'; ctx.fillStyle = '#f6d687'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(point[0], point[1], 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(point[0], point[1], 3, 0, Math.PI * 2); ctx.fill();
        if (target) {
          const label = labels().snapTo + ' ' + target.name;
          ctx.font = '12px Segoe UI, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          const labelX = Math.max(5, Math.min(width - 10 - ctx.measureText(label).width, point[0] + 13));
          const labelY = Math.max(16, Math.min(height - 16, point[1] - 18));
          ctx.lineWidth = 3; ctx.strokeStyle = '#0d151c'; ctx.strokeText(label, labelX, labelY);
          ctx.fillText(label, labelX, labelY);
        }
        ctx.restore();
      }
      const selectedObject = warehouse.objects.find(function (object) { return object.id === choice.objectId; });
      if (selectedObject) {
        ctx.fillStyle = '#172a2e'; ctx.fillRect(10, height - 38, Math.min(width - 20, 360), 28);
        ctx.fillStyle = '#b6e8dc'; ctx.font = '12px Segoe UI, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText((selectedObject.locked ? '🔒 ' : '') + selectedObject.name + ' · X ' + selectedObject.x + ' · Z ' + selectedObject.z + ' mm', 18, height - 20);
      }
      if (!warehouse.objects.length) {
        ctx.fillStyle = '#7995a1'; ctx.font = '15px Segoe UI, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(labels().empty, width / 2, height / 2);
      }
    }

    function paint(warehouse, collisionIds, findings) {
      const issues = (findings || model.findCollisions(warehouse)).filter(function (item) { return item.severity !== 'info'; });
      const conflicts = collisionIds || new Set(issues.flatMap(function (item) {
        return [item.firstId, item.secondId];
      }));
      if (camera.mode === 'orbit') {
        if (webglRenderer && webglRenderer.available()) {
          const partConflicts = new Set(issues.flatMap(function (item) { return item.partId ? [item.partId, item.secondPartId].filter(Boolean) : [item.firstId, item.secondId]; }));
          webglRenderer.render(boxesFor(warehouse),
            camera, preview ? preview.selectionId : choice.objectId, preview ? null : choice.slotId || focusedPart, partConflicts, wallMode);
        }
        return;
      }
      if (!canvas) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0d151c'; ctx.fillRect(0, 0, width, height);
      paintTop(ctx, width, height, warehouse, conflicts);
    }

    function wireCanvas() {
      const inputCanvas = camera.mode === 'top' ? canvas : glCanvas;
      if (wiredCanvases.has(inputCanvas)) return;
      wiredCanvases.add(inputCanvas);
      let drag = null;
      inputCanvas.addEventListener('pointerdown', function (event) {
        if (saving) return;
        inputCanvas.focus({ preventScroll: true });
        if (saving || !inputCanvas.isConnected) return;
        if (camera.mode === 'top' && event.button !== 0) return;
        if (camera.mode === 'orbit' && ![0, 1, 2].includes(event.button)) return;
        snapPreview = null;
        if (camera.mode === 'top') {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left, y = event.clientY - rect.top;
          const found = preview ? null : topHit(x, y);
          if (found) {
            const object = layout().objects.find(function (item) { return item.id === found.objectId; });
            choice.objectId = object.id; choice.slotId = null;
            if (found.bayIndex !== undefined) { choice.bay = found.bayIndex; choice.level = found.levelIndex; choice.slotId = found.slotId || null; }
            const members = model.relatedObjects(layout(), object.id);
            const lockedAssembly = layout().objects.some(function (member) { return members.has(member.id) && member.locked; });
            if (lockedAssembly || mode !== 'structure') {
              if (lockedAssembly && mode === 'structure') message = labels().lockedEdit;
              drag = { mode: 'select', x: event.clientX, y: event.clientY, moved: false };
            }
            else {
              const next = clone(layout());
              drag = { mode: 'move', x: event.clientX, y: event.clientY, moved: false,
                origin: topWorld(event.clientX, event.clientY), startX: object.x, startZ: object.z,
                next: next, target: next.objects.find(function (item) { return item.id === object.id; }) };
            }
          } else {
            drag = { mode: 'pan', x: event.clientX, y: event.clientY, moved: false,
              centerX: topView.centerX, centerZ: topView.centerZ };
          }
        } else {
          event.preventDefault();
          ensureOrbitAnchor();
          drag = { mode: event.button === 1 || event.button === 2 || event.shiftKey ? 'orbit-pan' : 'orbit',
            x: event.clientX, y: event.clientY, moved: false };
        }
        inputCanvas.setPointerCapture(event.pointerId);
      });
      inputCanvas.addEventListener('pointermove', function (event) {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        if (!drag.moved) return;
        if (drag.mode === 'move') {
          const world = topWorld(event.clientX, event.clientY);
          const rawX = Math.max(-500000, Math.min(500000, drag.startX + world.x - drag.origin.x));
          const rawZ = Math.max(-500000, Math.min(500000, drag.startZ + world.z - drag.origin.z));
          drag.target.x = rawX; drag.target.z = rawZ;
          const scale = topView.scale * topView.zoom;
          const tolerance = Math.max(50, Math.min(300, 14 / scale));
          const related = model.relatedObjects(layout(), drag.target.id);
          const snap = magnetEnabled ? model.findConnectionSnap(drag.target, drag.next.objects.filter(function (item) { return !related.has(item.id); }),
            tolerance, drag.snap && drag.snap.key, layout().connections) : null;
          if (snap) { drag.target.x = snap.x; drag.target.z = snap.z; }
          else {
            drag.target.x = model.snapCoordinate(rawX, 100);
            drag.target.z = model.snapCoordinate(rawZ, 100);
          }
          drag.snap = snap;
          snapPreview = snap;
          const visual = clone(layout());
          const target = visual.objects.find(function (object) { return object.id === drag.target.id; });
          target.x = drag.target.x; target.z = drag.target.z;
          try {
            model.applyAssemblyChanges(layout(), visual);
            paint(visual, null);
          } catch (error) {
            message = error.message;
            const output = root.querySelector('.wh-message');
            if (output) output.textContent = message;
            paint(layout());
          }
        } else if (drag.mode === 'pan') {
          const scale = topView.scale * topView.zoom;
          topView.centerX = drag.centerX - dx / scale;
          topView.centerZ = drag.centerZ - dy / scale;
          paint(viewLayout(), null, currentFindings);
        } else if (drag.mode === 'orbit') {
          camera.yaw += dx * 0.008;
          camera.pitch = Math.max(0.12, Math.min(1.45, camera.pitch + dy * 0.006));
          drag.x = event.clientX; drag.y = event.clientY;
          paint(viewLayout(), null, currentFindings);
        } else if (drag.mode === 'orbit-pan') {
          const view = webglRenderer && webglRenderer.view();
          if (!view || !camera.target) return;
          camera.target = window.OpenSlottingWarehouseWebGL.panTarget(camera.target,
            camera.yaw, camera.pitch, dx, dy, view.scale);
          drag.x = event.clientX; drag.y = event.clientY;
          paint(viewLayout(), null, currentFindings);
        }
      });
      inputCanvas.addEventListener('pointerup', function (event) {
        if (!drag) return;
        if (drag.mode === 'select') { drag = null; snapPreview = null; render(); return; }
        if (drag.mode === 'move') {
          const moved = drag.target.x !== drag.startX || drag.target.z !== drag.startZ;
          const next = drag.next;
          drag = null;
          snapPreview = null;
          if (moved) commit(next);
          else render();
          return;
        }
        if (drag.mode === 'orbit' && !drag.moved && !preview) {
          const found = webglRenderer && webglRenderer.pick(event.clientX, event.clientY);
          if (found && found.bayIndex !== undefined) selectSlot(found);
          else if (found) { choice.objectId = found.objectId; choice.bay = 0; choice.level = 0; choice.upright = 0; choice.slotId = null; render(); }
        }
        drag = null;
      });
      inputCanvas.addEventListener('pointercancel', function () {
        const shouldRender = drag && (drag.mode === 'move' || drag.mode === 'select');
        drag = null;
        snapPreview = null;
        if (shouldRender) render();
      });
      inputCanvas.addEventListener('lostpointercapture', function () {
        const restore = drag && drag.mode === 'move';
        drag = null; snapPreview = null;
        if (restore && root.getClientRects().length) paint(viewLayout(), null, currentFindings);
      });
      if (inputCanvas === glCanvas) {
        inputCanvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });
        inputCanvas.addEventListener('dblclick', function (event) {
          event.preventDefault();
          if (preview) return;
          const found = webglRenderer && webglRenderer.pick(event.clientX, event.clientY);
          if (!found || !focusObject(found.objectId)) return;
          if (found.slotId) selectSlot(found);
          else {
            choice.objectId = found.objectId; choice.slotId = null;
            render();
          }
        });
      }
    }

    root.addEventListener('wheel', function (event) {
      // Preserve browser zoom, including touchpad pinch gestures.
      if (event.ctrlKey || event.metaKey) return;
      const control = event.target.closest('input[type="number"], select');
      if (control) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        const container = scrollParent(control);
        if (container) {
          const delta = wheelDistance(event, container.clientHeight);
          container.scrollTop += delta.y; container.scrollLeft += delta.x;
        }
        return;
      }
      if (!event.target.closest('.wh-viewport')) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      if (saving || rackWizard) return;
      const delta = wheelDistance(event, camera.mode === 'top' && canvas ? canvas.clientHeight : glCanvas.clientHeight);
      if (delta.y) zoomBy(-Math.max(-240, Math.min(240, delta.y)) * 0.0012 * zoomSensitivity);
    }, { passive: false, capture: true });

    root.addEventListener('click', async function (event) {
      if (saving) return;
      const globalButton = event.target.closest('[data-action]');
      const globalAction = globalButton && globalButton.dataset.action;
      if (!rackWizard && (globalAction === 'zoom-in' || globalAction === 'zoom-out')) { zoomBy(globalAction === 'zoom-in' ? 0.14 : -0.14); return; }
      if (preview) {
        if (globalAction === 'cancel-preview') { preview = null; render(); }
        if (globalAction === 'apply-preview') {
          const candidate = preview;
          await commit(clone(candidate.layout), null, candidate.selectionId, null, false, candidate.pose);
        }
        if (globalAction === 'top') { camera.mode = 'top'; topView.ready = false; render(); }
        if (globalAction === 'orbit' && webglRenderer && webglRenderer.available()) { camera.mode = 'orbit'; render(); }
        if (globalAction === 'fit') { fitView(); render(); }
        if (globalAction === 'focus' && focusObject(preview.selectionId)) render();
        if (globalAction === 'wall-mode') { wallMode = wallMode === 'solid' ? 'transparent' : wallMode === 'transparent' ? 'hidden' : 'solid'; render(); }
        return;
      }
      if (rackWizard) {
        const wizardButton = event.target.closest('[data-wizard-action]');
        if (!wizardButton) return;
        const action = wizardButton.dataset.wizardAction;
        if (action === 'cancel') { rackWizard = null; render(); root.querySelector('#wh-recipe').focus(); return; }
        if (action === 'back') { rackWizard.step -= 1; rackWizard.error = ''; render(); root.querySelector('.wh-wizard').focus(); return; }
        if (action === 'next') {
          if (rackWizard.error) return;
          rackWizard.step += 1; render(); root.querySelector('.wh-wizard').focus(); return;
        }
        if (action === 'edit-bay') {
          if (rackWizard.error) return;
          rackWizard.activeBay = Number(wizardButton.dataset.index);
          rackWizard.step = 2;
          rackWizard.error = '';
          render(); root.querySelector('.wh-wizard').focus(); return;
        }
        if (action === 'finish') {
          if (rackWizard.error) { refreshWizardFeedback(); return; }
          const issue = wizardValidation();
          if (issue) { rackWizard.error = issue; render(); return; }
          const next = wizardLayout();
          const rackId = rackWizard.draft.id;
          if (JSON.stringify(next) === JSON.stringify(layout())) { rackWizard = null; render(); return; }
          const saved = await commit(next, null, rackId, null, true);
          if (!saved && rackWizard) { rackWizard.saveError = message; render(); }
          return;
        }
        return;
      }
      const modeButton = event.target.closest('[data-mode]');
      if (modeButton) { mode = modeButton.dataset.mode; message = ''; render(); return; }
      const scopeButton = event.target.closest('[data-scope-bay]');
      if (scopeButton) {
        choice.bay = Number(scopeButton.dataset.scopeBay); choice.level = Number(scopeButton.dataset.scopeLevel);
        choice.slotId = null; render(); return;
      }
      const conflictButton = event.target.closest('[data-focus-object]');
      if (conflictButton) {
        choice.objectId = conflictButton.dataset.focusObject;
        choice.slotId = null;
        focusedPart = conflictButton.dataset.focusPart || null;
        if (conflictButton.dataset.bay !== undefined) { choice.bay = Number(conflictButton.dataset.bay); choice.level = Number(conflictButton.dataset.level); }
        camera.mode = focusedPart && webglRenderer && webglRenderer.available() ? 'orbit' : 'top'; topView.zoom = 1; topView.ready = false;
        if (focusedPart) focusObject(choice.objectId, focusedPart);
        message = ''; render(); return;
      }
      const objectButton = event.target.closest('[data-object]');
      if (objectButton) {
        choice.objectId = objectButton.dataset.object;
        focusedPart = null;
        choice.bay = 0; choice.level = 0; choice.upright = 0; choice.slotId = null; message = ''; render(); return;
      }
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'magnet') {
        magnetEnabled = !magnetEnabled;
        snapPreview = null;
        render(); return;
      }
      if (action === 'wall-mode') {
        wallMode = wallMode === 'solid' ? 'transparent' : wallMode === 'transparent' ? 'hidden' : 'solid';
        render(); return;
      }
      if (action === 'focus') {
        if (focusObject(choice.objectId)) render();
        return;
      }
      if (action === 'undo' || action === 'redo') {
        const stack = action === 'undo' ? undoStack : redoStack;
        if (stack.length) {
          const target = stack[stack.length - 1];
          commit(clone(target.layout), action, target.selectionId);
        }
        return;
      }
      if (action === 'fit' || action === 'top' || action === 'orbit') {
        if (action === 'fit') fitView();
        else if (action === 'top') { camera.mode = 'top'; topView.ready = false; }
        else if (action === 'orbit' && webglRenderer && webglRenderer.available()) {
          camera.mode = 'orbit';
        }
        render(); return;
      }
      if (action === 'add') {
        const type = root.querySelector('#wh-recipe').value;
        if (model.RACK_TYPES.includes(type)) { openRackWizard(null, type); return; }
        const next = clone(layout());
        const split = type.lastIndexOf('-');
        const name = TYPE_LABELS[type] ? labels()[TYPE_LABELS[type]] : labels()[TYPE_LABELS[type.slice(0, split)]] + ' · ' + labels()[type.slice(split + 1)];
        const newObject = model.createRecipe(type, { name: name });
        const last = next.objects[next.objects.length - 1];
        newObject.x = last ? last.x + 1800 : 0;
        newObject.z = last ? last.z + 1200 : 0;
        next.objects.push(newObject); choice.slotId = null;
        if (camera.mode === 'top') topView.ready = false;
        commit(next, null, newObject.id); return;
      }
      const object = selected();
      if (!object) return;
      if (action === 'toggle-lock') {
        const next = clone(layout());
        next.objects.find(function (item) { return item.id === object.id; }).locked = !object.locked;
        commit(next, null, object.id, object.id); return;
      }
      if (object.locked) { message = labels().lockedEdit; render(); return; }
      if (['preview-passage', 'remove-passage', 'extend-start', 'extend-end', 'preview-connect', 'preview-align', 'preview-bridge', 'disconnect', 'group', 'ungroup', 'continue-passage', 'preview-opening'].includes(action)) {
        const value = function (key) { const input = root.querySelector('[data-tool="' + key + '"]'); return input && input.value; };
        try {
          if (action === 'preview-passage') stage(model.configurePassage(layout(), object.id, choice.bay, Number(value('passage-height')), value('passage-route'),
            { levelCount: Number(value('passage-levels')), growFrames: root.querySelector('[data-tool="grow-frames"]').checked }), labels().passage);
          else if (action === 'remove-passage') { const next = clone(layout()); next.objects.find(function (item) { return item.id === object.id; }).bays[choice.bay].passage = null; await commit(next); }
          else if (action === 'extend-start' || action === 'extend-end') stage(model.extendRack(layout(), object.id, action === 'extend-start' ? 'start' : 'end'), labels()[action === 'extend-start' ? 'extendStart' : 'extendEnd'], false);
          else if (action === 'preview-connect' || action === 'preview-align') {
            const targetId = value('target');
            const angle = value('connection-angle');
            const next = model.connectObjects(layout(), object.id, targetId, Number(value('own-anchor')), Number(value('target-anchor')), angle === 'keep' ? false : angle === 'ports' ? 'ports' : Number(angle));
            if (action === 'preview-align') next.connections.pop();
            stage(next, labels()[action === 'preview-connect' ? 'assembly' : 'previewAlign']);
            if (preview) { preview.targetId = targetId; render(); }
          } else if (action === 'preview-bridge') {
            const targetId = value('target');
            const next = model.createDistanceConnection(layout(), object.id, targetId, Number(value('own-anchor')), Number(value('target-anchor')),
              { variant: value('bridge-course'), reserve: Number(value('bridge-reserve')), name: labels().bridgeName,
                requiredWidth: value('bridge-width'), requiredHeight: value('bridge-height') });
            stage(next, labels().previewBridge + ' · ' + (next.objects.length - layout().objects.length) + ' ' + labels().bridgeModules, false);
            if (preview) {
              const existingIds = new Set(layout().objects.map(function (item) { return item.id; }));
              preview.unverifiedRoute = next.objects.some(function (item) { return !existingIds.has(item.id) && item.type === 'aisle' &&
                (!Number.isFinite(item.route.requiredWidth) || !Number.isFinite(item.route.requiredHeight)); });
              preview.targetId = targetId; fitView(); render();
            }
          } else if (action === 'disconnect') {
            const next = clone(layout()); next.connections = next.connections.filter(function (link) { return link.aId !== object.id && link.bId !== object.id; }); await commit(next);
          } else if (action === 'group') {
            const keys = Array.from(new Set([object.id].concat(Array.from(groupSelection)))).filter(function (key) { return layout().objects.some(function (item) { return item.id === key; }); });
            if (await commit(model.groupObjects(layout(), keys, value('group-name')))) { groupSelection.clear(); render(); }
          }
          else if (action === 'ungroup') { const next = clone(layout()); next.groups = next.groups.filter(function (group) { return !group.objectIds.includes(object.id); }); await commit(next); }
          else if (action === 'continue-passage') stage(model.continuePassage(layout(), object.id, choice.bay, value('target'), Number(value('target-bay')) - 1), labels().continuePassage);
          else if (action === 'preview-opening') stage(model.insertWallOpening(layout(), object.id, value('opening-type'), Number(value('opening-offset')), Number(value('opening-width')), Number(value('opening-height'))), labels().wallOpening, false);
        } catch (error) {
          const t = labels();
          message = t[error.code] || error.message;
          if (error.code === 'bridgeNoFit' && error.obstruction) {
            const obstacle = error.obstruction;
            message += ' ' + t.bridgeBlockedDetail.replace('{{object}}', obstacle.objectName || obstacle.objectId)
              .replace('{{reason}}', t[obstacle.kind] || obstacle.kind);
            if (obstacle.kind === 'route-too-low' && Number.isFinite(obstacle.requiredHeight)) message += ' ' +
              t.bridgeHeightDetail.replace('{{available}}', obstacle.availableHeight).replace('{{required}}', obstacle.requiredHeight);
          }
          render();
        }
        return;
      }
      if (['usage-bay', 'usage-rack'].includes(action)) {
        const usage = root.querySelector('[data-bulk-usage]').value;
        const next = clone(layout());
        next.zones.forEach(function (zone) {
          if (zone.objectId === object.id && (action === 'usage-rack' || zone.bayId === object.bays[choice.bay].id)) zone.usage = usage;
        });
        commit(next); return;
      }
      if (action === 'resize-locations') {
        try { commit(model.resizeZoneLocations(layout(), currentZone(object).id, Number(root.querySelector('[data-field="count.locations"]').value))); }
        catch (error) { message = error.message; render(); }
        return;
      }
      if (action === 'edit-rack' && model.RACK_TYPES.includes(object.type)) { openRackWizard(object); return; }
      if (action === 'duplicate') {
        const next = clone(layout());
        const baseName = labels().copyName + ' ' + object.name;
        let name = baseName.slice(0, 120);
        let number = 2;
        while (next.objects.some(function (item) { return item.name === name; })) {
          const suffix = ' (' + number + ')';
          name = baseName.slice(0, 120 - suffix.length) + suffix;
          number += 1;
        }
        const duplicate = model.duplicateObject(object, { name: name, objects: next.objects });
        next.objects.push(duplicate); choice.slotId = null;
        if (camera.mode === 'top') topView.ready = false;
        commit(next, null, duplicate.id); return;
      }
      if (action === 'rotate-left' || action === 'rotate-right') {
        const next = clone(layout());
        const index = next.objects.findIndex(function (item) { return item.id === object.id; });
        next.objects[index] = model.rotateObject(next.objects[index], action === 'rotate-left' ? -90 : 90);
        if (camera.mode === 'top') topView.ready = false;
        commit(next); return;
      }
      if (action === 'delete') {
        const next = clone(layout()); next.objects = next.objects.filter(function (item) { return item.id !== object.id; });
        choice.slotId = null; commit(next, null, null); return;
      }
      if (['resize', 'resize-bay'].includes(action) && model.RACK_TYPES.includes(object.type)) {
        const next = clone(layout()); const target = next.objects.find(function (item) { return item.id === object.id; });
        let resized;
        try {
          if (action === 'resize') resized = model.resizeRack(target, Number(root.querySelector('[data-field="count.bays"]').value), null);
          else if (action === 'resize-bay') resized = model.resizeBayLevels(target, choice.bay,
            Number(root.querySelector('[data-field="count.bayLevels"]').value));
        }
        catch (error) { message = error.message; render(); return; }
        Object.assign(target, resized); commit(next); return;
      }
      if (['generate', 'generate-rack'].includes(action) && model.RACK_TYPES.includes(object.type)) {
        const prefix = String(codePrefix).trim();
        if (!prefix) { message = labels().codePrefix + ': 1–80'; render(); return; }
        try {
          commit(model.fillLocationCodes(layout(), object.id, prefix,
            action === 'generate' ? object.bays[choice.bay].levels[choice.level].id : null));
        } catch (error) { message = error.message; render(); }
      }
    });

    root.addEventListener('keydown', function (event) {
      if (saving) return;
      if (!rackWizard && event.target.classList.contains('wh-canvas') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '−') {
          event.preventDefault(); zoomBy(event.key === '-' || event.key === '−' ? -0.14 : 0.14); return;
        }
        if (event.key === '0' || event.key === 'Home') { event.preventDefault(); fitView(); render(); return; }
      }
      if (preview) {
        if (event.key === 'Escape') { event.preventDefault(); preview = null; render(); }
        return;
      }
      if (rackWizard) {
        if (event.key === 'Escape') { event.preventDefault(); rackWizard = null; render(); root.querySelector('#wh-recipe').focus(); }
        if (event.key === 'Tab') {
          const controls = Array.from(root.querySelectorAll('.wh-wizard button:not(:disabled), .wh-wizard input:not(:disabled), .wh-wizard select:not(:disabled)'));
          if (controls.length) {
            const first = controls[0], last = controls[controls.length - 1];
            const dialog = root.querySelector('.wh-wizard');
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
              event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
              event.preventDefault(); first.focus();
            }
          }
        }
        return;
      }
      const editable = event.target.closest('input, textarea, select, [contenteditable="true"]');
      if (event.ctrlKey && !event.altKey && !editable) {
        const key = event.key.toLowerCase();
        const action = key === 'z' ? (event.shiftKey ? 'redo' : 'undo') : key === 'y' ? 'redo' : null;
        const stack = action === 'undo' ? undoStack : action === 'redo' ? redoStack : [];
        if (action && stack.length) {
          const target = stack[stack.length - 1];
          event.preventDefault(); commit(clone(target.layout), action, target.selectionId); return;
        }
      }
    });

    root.addEventListener('change', function (event) {
      if (saving) return;
      if (event.target.dataset.zoomSensitivity !== undefined) {
        const value = Number(event.target.value);
        if ([0.5, 1, 2].includes(value)) zoomSensitivity = value;
        return;
      }
      if (event.target.dataset.groupMember) {
        if (event.target.checked) groupSelection.add(event.target.dataset.groupMember); else groupSelection.delete(event.target.dataset.groupMember);
        return;
      }
      if (preview) return;
      if (rackWizard) { changeWizardField(event.target); return; }
      if (event.target.dataset.tool === 'target') {
        const anchor = root.querySelector('[data-tool="target-anchor"]');
        if (anchor) anchor.value = '0';
        render(); return;
      }
      if (event.target.dataset.zone || event.target.dataset.location) {
        try {
          const next = event.target.dataset.zone ? model.setZoneUsage(layout(), event.target.dataset.zone, event.target.value) :
            model.setLocationCode(layout(), event.target.dataset.location, event.target.value);
          commit(next);
        } catch (error) { message = error.message; render(); }
        return;
      }
      const selector = event.target.dataset.select;
      if (selector) {
        choice[selector] = Number(event.target.value); choice.slotId = null; render(); return;
      }
      const field = event.target.dataset.field;
      if (!field) return;
      if (field === 'prefix') { codePrefix = event.target.value.trim(); return; }
      if (field.startsWith('count.')) return;
      const object = selected(); if (!object) return;
      if (object.locked) { message = labels().lockedEdit; render(); return; }
      const next = clone(layout()); const target = next.objects.find(function (item) { return item.id === object.id; });
      if (field.startsWith('junction.arms.') && target.junction) {
        target.junction.arms[field.slice(14)] = Number(event.target.value);
        commit(next); return;
      }
      if (field === 'rack.depth') {
        try { Object.assign(target, model.setRackDepth(target, event.target.value)); commit(next); }
        catch (error) { message = error.message; render(); }
        return;
      }
      if (field === 'bay.depth' || field === 'upright.depth') return;
      if (field.startsWith('route.') && target.type === 'aisle') {
        const property = field.slice(6), required = property === 'requiredWidth' || property === 'requiredHeight';
        target.route[property] = required && event.target.value === '' ? null : Number(event.target.value);
        commit(next); return;
      }
      let holder = target, property = field;
      if (field.startsWith('bay.')) { holder = target.bays[choice.bay]; property = field.slice(4); }
      if (field.startsWith('level.')) { holder = target.bays[choice.bay].levels[choice.level]; property = field.slice(6); }
      if (field.startsWith('upright.')) { holder = target.uprights[choice.upright]; property = field.slice(8); }
      holder[property] = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      commit(next);
    });

    window.addEventListener('resize', scheduleSize);
    if (typeof window.ResizeObserver === 'function') {
      const observer = new window.ResizeObserver(scheduleSize);
      observer.observe(root);
    }
    const page = root.closest('.app-page');
    if (page && typeof window.MutationObserver === 'function') {
      const observer = new window.MutationObserver(function () {
        if (!page.classList.contains('hidden') && !page.hidden && root.getClientRects().length) scheduleSize();
      });
      observer.observe(page, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    }
    return { render: render };
  }
  return { create: create };
}));
