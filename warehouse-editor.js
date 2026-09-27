(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseEditor = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LABELS = {
    en: {
      add: 'Add recipe', pallet: 'Pallet rack', shelf: 'Shelf rack', wall: 'Wall', gate: 'Gate', exit: 'Emergency exit',
      aisle: 'Aisle / road', goodsIn: 'Goods in', goodsOut: 'Goods out', addButton: 'Add object', objects: 'Objects',
      empty: 'No objects yet. Add a recipe to start the layout.', properties: 'Properties', selected: 'Select an object to edit it.',
      name: 'Name', x: 'X position (mm)', z: 'Z position (mm)', rotation: 'Rotation (°)', width: 'Width (mm)',
      depth: 'Depth / length (mm)', height: 'Height (mm)', bays: 'Bays', levels: 'Levels per bay',
      positions: 'Positions per level', applyCounts: 'Apply counts', bay: 'Bay', level: 'Level', upright: 'Upright',
      clearHeight: 'Level clear height (mm)', thickness: 'Beam / shelf thickness (mm)', deck: 'Add shelf deck',
      deckThickness: 'Shelf deck thickness (mm)', code: 'Location code', codes: 'Codes for selected level',
      codePrefix: 'Code prefix', generate: 'Fill empty codes', delete: 'Delete object',
      view: '3D layout', fit: 'Fit view', top: 'Top view', orbit: '3D view', hint: 'Drag to rotate · mouse wheel to zoom · click to select',
      importTitle: 'Article-master locations', matched: 'Matched articles', unmatched: 'Unmatched codes',
      noMaster: 'No current locations in the imported article master.', noUnmatched: 'All imported location codes are assigned.',
      noSelection: 'Choose a rack level to edit its positions.', slotArticles: 'Articles at this position', saved: 'Layout saved locally.',
      slotSelection: 'Selected position', noSlotSelection: 'Click a position marker or find a code.',
      searchCode: 'Find location code', findCode: 'Find', codeNotFound: 'No position has this exact code.',
      noArticles: 'No current article-master match.', position: 'Position',
      legendMatched: 'article matched', legendCoded: 'code assigned', legendEmpty: 'no code',
      removeWarning: 'Reducing counts removes positions with codes. Continue?', deleteWarning: 'Delete this object and its location codes?',
      slotSummary: 'positions ·', coded: 'coded', missing: 'without code', exact: 'Codes are matched exactly after trimming outer spaces. Leading zeros remain significant.',
      choose: 'Choose a recipe'
    },
    de: {
      add: 'Rezept hinzufügen', pallet: 'Palettenregal', shelf: 'Fachbodenregal', wall: 'Wand', gate: 'Tor', exit: 'Notausgang',
      aisle: 'Gang / Straße', goodsIn: 'Wareneingang', goodsOut: 'Warenausgang', addButton: 'Objekt hinzufügen', objects: 'Objekte',
      empty: 'Noch keine Objekte. Füge ein Rezept hinzu.', properties: 'Eigenschaften', selected: 'Wähle ein Objekt zur Bearbeitung.',
      name: 'Name', x: 'X-Position (mm)', z: 'Z-Position (mm)', rotation: 'Drehung (°)', width: 'Breite (mm)',
      depth: 'Tiefe / Länge (mm)', height: 'Höhe (mm)', bays: 'Fächer', levels: 'Ebenen je Fach',
      positions: 'Stellplätze je Ebene', applyCounts: 'Anzahl übernehmen', bay: 'Fach', level: 'Ebene', upright: 'Ständer',
      clearHeight: 'Lichte Fachhöhe (mm)', thickness: 'Traverse / Regalboden (mm)', deck: 'Fachboden hinzufügen',
      deckThickness: 'Fachbodenstärke (mm)', code: 'Stellplatzcode', codes: 'Codes der gewählten Ebene',
      codePrefix: 'Code-Präfix', generate: 'Leere Codes füllen', delete: 'Objekt löschen',
      view: '3D-Lagerplan', fit: 'Einpassen', top: 'Draufsicht', orbit: '3D-Ansicht', hint: 'Ziehen: drehen · Mausrad: zoomen · Klicken: auswählen',
      importTitle: 'Stellplätze aus Artikelstamm', matched: 'Zugeordnete Artikel', unmatched: 'Nicht zugeordnete Codes',
      noMaster: 'Keine aktuellen Stellplätze im importierten Artikelstamm.', noUnmatched: 'Alle importierten Stellplatzcodes sind zugeordnet.',
      noSelection: 'Wähle eine Regalebene, um die Stellplätze zu bearbeiten.', slotArticles: 'Artikel an diesem Stellplatz', saved: 'Lagerplan lokal gespeichert.',
      slotSelection: 'Ausgewählter Stellplatz', noSlotSelection: 'Stellplatzmarkierung anklicken oder Code suchen.',
      searchCode: 'Stellplatzcode suchen', findCode: 'Finden', codeNotFound: 'Kein Stellplatz mit genau diesem Code gefunden.',
      noArticles: 'Keine aktuelle Zuordnung im Artikelstamm.', position: 'Position',
      legendMatched: 'Artikel zugeordnet', legendCoded: 'Code vergeben', legendEmpty: 'ohne Code',
      removeWarning: 'Beim Verkleinern werden Stellplätze mit Codes entfernt. Fortfahren?', deleteWarning: 'Objekt und seine Stellplatzcodes löschen?',
      slotSummary: 'Stellplätze ·', coded: 'codiert', missing: 'ohne Code', exact: 'Codes werden nach Entfernen äußerer Leerzeichen exakt abgeglichen. Führende Nullen bleiben erhalten.',
      choose: 'Rezept wählen'
    }
  };
  const TYPE_LABELS = {
    'pallet-rack': 'pallet', 'shelf-rack': 'shelf', wall: 'wall', gate: 'gate',
    'emergency-exit': 'exit', aisle: 'aisle', 'goods-in': 'goodsIn', 'goods-out': 'goodsOut'
  };
  const COLORS = {
    'pallet-rack': '#6c849b', 'shelf-rack': '#7a91a7', wall: '#647184', gate: '#cb9e54',
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

  function create(options) {
    const model = options.model;
    const root = options.root;
    const camera = { yaw: -0.62, pitch: 0.62, zoom: 1 };
    const choice = { objectId: null, bay: 0, level: 0, upright: 0, slotId: null };
    let codePrefix = 'R01';
    let codeSearch = '';
    let message = '';
    let pickFaces = [];
    let canvas = null;

    function labels() { return LABELS[options.getLanguage() === 'de' ? 'de' : 'en']; }
    function layout() { return options.getLayout(); }
    function selected() { return layout().objects.find(function (object) { return object.id === choice.objectId; }) || null; }
    function objectName(object, t) { return object.name || t[TYPE_LABELS[object.type]]; }
    function selectSlot(slot) {
      choice.objectId = slot.objectId;
      choice.bay = slot.bayIndex;
      choice.level = slot.levelIndex;
      choice.slotId = slot.slotId;
      const current = model.listSlots(layout()).find(function (item) { return item.slotId === slot.slotId; });
      codeSearch = current ? current.code : '';
      message = '';
      render();
    }
    function findCode() {
      codeSearch = root.querySelector('[data-field="search"]').value.trim();
      const found = model.listSlots(layout()).find(function (slot) { return slot.code === codeSearch && Boolean(codeSearch); });
      if (found) selectSlot(found);
      else { message = labels().codeNotFound; render(); }
    }

    async function commit(next) {
      try {
        const normalized = model.normalizeLayout(next);
        await options.save(normalized);
        message = labels().saved;
      } catch (error) {
        message = error && error.message ? error.message : String(error);
      }
      render();
    }

    function properties(object, t, matches) {
      if (!object) return '<p class="wh-empty">' + esc(t.selected) + '</p>';
      let html = '<div class="wh-property-grid">' + textField(t.name, 'name', object.name) +
        numberField(t.x, 'x', object.x, -500000, 500000) + numberField(t.z, 'z', object.z, -500000, 500000) +
        numberField(t.rotation, 'rotation', object.rotation, -360, 360) + '</div>';
      if (!model.RACK_TYPES.includes(object.type)) {
        return html + '<div class="wh-property-grid">' + numberField(t.width, 'width', object.width, 100, 50000) +
          numberField(t.depth, 'depth', object.depth, 10, 50000) + numberField(t.height, 'height', object.height, 1, 15000) + '</div>';
      }
      choice.bay = Math.min(choice.bay, object.bays.length - 1);
      choice.upright = Math.min(choice.upright, object.uprights.length - 1);
      const bay = object.bays[choice.bay];
      choice.level = Math.min(choice.level, bay.levels.length - 1);
      const level = bay.levels[choice.level];
      const stand = object.uprights[choice.upright];
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        numberField(t.bays, 'count.bays', object.bays.length, 1, 30) +
        numberField(t.levels, 'count.levels', object.bays[0].levels.length, 1, 12) +
        numberField(t.positions, 'count.positions', object.bays[0].levels[0].positions.length, 1, 4) +
        '</div><button type="button" class="wh-small-button" data-action="resize">' + esc(t.applyCounts) + '</button></div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        selectField(t.bay, 'bay', object.bays.length, choice.bay) +
        numberField(t.width, 'bay.width', bay.width, 300, 6000) +
        numberField(t.depth, 'bay.depth', bay.depth, 200, 3000) +
        '</div></div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        selectField(t.level, 'level', bay.levels.length, choice.level) +
        numberField(t.clearHeight, 'level.clearHeight', level.clearHeight, 100, 8000) +
        numberField(t.thickness, 'level.thickness', level.thickness, 10, 300) +
        '</div><label class="wh-check"><input type="checkbox" data-field="level.deck"' + (level.deck ? ' checked' : '') + '><span>' + esc(t.deck) + '</span></label>' +
        numberField(t.deckThickness, 'level.deckThickness', level.deckThickness, 10, 200) + '</div>';
      html += '<div class="wh-section"><div class="wh-property-grid">' +
        selectField(t.upright, 'upright', object.uprights.length, choice.upright) +
        numberField(t.width, 'upright.width', stand.width, 20, 500) +
        numberField(t.depth, 'upright.depth', stand.depth, 100, 3000) +
        numberField(t.height, 'upright.height', stand.height, 200, 20000) +
        '</div></div>';
      html += '<div class="wh-section"><strong>' + esc(t.codes) + '</strong>' +
        level.positions.map(function (slot, index) {
          const articles = matches.bySlot.get(slot.id) || [];
          return '<label class="wh-code-row' + (slot.id === choice.slotId ? ' selected' : '') + '"><span>' + (index + 1) + '</span><input type="text" data-field="slot.code" data-slot-index="' +
            index + '" value="' + esc(slot.code) + '" maxlength="80" placeholder="' + esc(t.code) + '"></label>' +
            (articles.length ? '<div class="wh-slot-articles"><strong>' + esc(t.slotArticles) + ':</strong> ' +
              articles.map(function (article) { return esc(article.articleId) + (article.name ? ' · ' + esc(article.name) : ''); }).join(', ') + '</div>' : '');
        }).join('') + '</div>';
      html += '<div class="wh-section wh-code-generator">' + textField(t.codePrefix, 'prefix', codePrefix) +
        '<button type="button" class="wh-small-button" data-action="generate">' + esc(t.generate) + '</button></div>';
      return html;
    }

    function render() {
      const t = labels();
      const warehouse = layout();
      if (!warehouse.objects.some(function (object) { return object.id === choice.objectId; })) {
        choice.objectId = warehouse.objects.length ? warehouse.objects[0].id : null;
        choice.bay = 0; choice.level = 0; choice.upright = 0;
      }
      const object = selected();
      const slots = model.listSlots(warehouse);
      if (!slots.some(function (slot) { return slot.slotId === choice.slotId; })) choice.slotId = null;
      const coded = slots.filter(function (slot) { return Boolean(slot.code); }).length;
      const matches = model.matchArticles(warehouse, options.getRegistry());
      const selectedSlot = slots.find(function (slot) { return slot.slotId === choice.slotId; });
      const selectedArticles = selectedSlot ? matches.bySlot.get(selectedSlot.slotId) || [] : [];
      root.innerHTML = '<div class="wh-header"><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3>' + esc(t.view) + '</h3><p>' +
        esc(t.exact) + '</p></div><div class="wh-summary"><strong>' + warehouse.objects.length + '</strong> ' + esc(t.objects) +
        '<br><strong>' + slots.length + '</strong> ' + esc(t.slotSummary) + ' ' + coded + ' ' + esc(t.coded) + '</div></div>' +
        '<div class="wh-editor-grid"><aside class="wh-sidebar"><div class="wh-card"><h4>' + esc(t.add) + '</h4>' +
        '<select id="wh-recipe" aria-label="' + esc(t.choose) + '">' +
        model.RACK_TYPES.concat(model.AREA_TYPES).map(function (type) {
          return '<option value="' + type + '">' + esc(t[TYPE_LABELS[type]]) + '</option>';
        }).join('') + '</select><button type="button" class="wh-add-button" data-action="add">' + esc(t.addButton) + '</button></div>' +
        '<div class="wh-card wh-objects"><h4>' + esc(t.objects) + '</h4>' +
        (warehouse.objects.length ? warehouse.objects.map(function (item) {
          return '<button type="button" class="wh-object' + (item.id === choice.objectId ? ' active' : '') +
            '" data-object="' + esc(item.id) + '" aria-pressed="' + (item.id === choice.objectId) + '"><span class="wh-object-icon" style="--wh-color:' +
            COLORS[item.type] + '"></span><span><strong>' + esc(objectName(item, t)) + '</strong><small>' + esc(t[TYPE_LABELS[item.type]]) + '</small></span></button>';
        }).join('') : '<p class="wh-empty">' + esc(t.empty) + '</p>') + '</div></aside>' +
        '<div class="wh-main"><div class="wh-view-toolbar"><strong>' + esc(t.view) + '</strong><div><button type="button" data-action="fit">' +
        esc(t.fit) + '</button><button type="button" data-action="top">' + esc(t.top) + '</button><button type="button" data-action="orbit">' +
        esc(t.orbit) + '</button></div></div><canvas class="wh-canvas" role="img" aria-label="' + esc(t.view) + '"></canvas>' +
        '<div class="wh-view-hint">' + esc(t.hint) + '</div><div class="wh-legend">' +
        '<span><i class="matched"></i>' + esc(t.legendMatched) + '</span><span><i class="coded"></i>' + esc(t.legendCoded) +
        '</span><span><i class="empty"></i>' + esc(t.legendEmpty) + '</span></div>' +
        '<div class="wh-card wh-slot-inspector"><div class="wh-slot-search"><label class="wh-field"><span>' + esc(t.searchCode) +
        '</span><input type="search" data-field="search" value="' + esc(codeSearch) + '" maxlength="80"></label>' +
        '<button type="button" class="wh-small-button" data-action="find-code">' + esc(t.findCode) + '</button></div>' +
        '<h4>' + esc(t.slotSelection) + '</h4>' + (selectedSlot ?
          '<div class="wh-selected-code">' + esc(selectedSlot.code || t.missing) + '</div><p class="wh-slot-path">' +
          esc(selectedSlot.objectName) + ' · ' + esc(t.bay) + ' ' + (selectedSlot.bayIndex + 1) + ' · ' + esc(t.level) + ' ' +
          (selectedSlot.levelIndex + 1) + ' · ' + esc(t.position) + ' ' + (selectedSlot.positionIndex + 1) + '</p>' +
          (selectedArticles.length ? '<div class="wh-selected-articles"><strong>' + esc(t.slotArticles) + '</strong>' +
            selectedArticles.map(function (article) { return '<div>' + esc(article.articleId) + (article.name ? ' · ' + esc(article.name) : '') + '</div>'; }).join('') + '</div>' :
            '<p class="wh-empty">' + esc(t.noArticles) + '</p>') : '<p class="wh-empty">' + esc(t.noSlotSelection) + '</p>') +
        '</div><div class="wh-card wh-import"><div class="wh-import-head"><h4>' + esc(t.importTitle) +
        '</h4><span><strong>' + matches.matched + '</strong> ' + esc(t.matched) + ' · <strong>' + matches.unmatched.length + '</strong> ' + esc(t.unmatched) +
        '</span></div>' + (matches.withLocation === 0 ? '<p class="wh-empty">' + esc(t.noMaster) + '</p>' :
          '<div class="wh-match-list">' + matches.unmatched.slice(0, 16).map(function (item) {
            return '<div><strong>' + esc(item.code) + '</strong><span>' + esc(item.articleId) + ' · ' + esc(item.name) + '</span></div>';
          }).join('') + (matches.unmatched.length === 0 ? '<p class="wh-empty">' + esc(t.noUnmatched) + '</p>' : '') + '</div>') +
        '</div></div><aside class="wh-properties"><div class="wh-card"><div class="wh-properties-head"><h4>' + esc(t.properties) + '</h4>' +
        (object ? '<button type="button" class="wh-delete" data-action="delete">' + esc(t.delete) + '</button>' : '') +
        '</div>' + properties(object, t, matches) + '</div></aside></div><p class="wh-message" role="status" aria-live="polite">' + esc(message) + '</p>';
      canvas = root.querySelector('canvas');
      paint(warehouse, matches);
      wireCanvas();
    }

    function box(object, x, y, z, width, height, depth, color, list, slotRef) {
      list.push({ object: object, x: x, y: y, z: z, width: width, height: height, depth: depth, color: color, slotRef: slotRef || null });
    }
    function boxesFor(warehouse, matches) {
      const boxes = [];
      warehouse.objects.forEach(function (object) {
        if (!model.RACK_TYPES.includes(object.type)) {
          if (object.type === 'gate' || object.type === 'emergency-exit') {
            const post = Math.min(140, object.width / 6);
            box(object, 0, 0, 0, post, object.height, object.depth, COLORS[object.type], boxes);
            box(object, object.width - post, 0, 0, post, object.height, object.depth, COLORS[object.type], boxes);
            box(object, 0, object.height - post, 0, object.width, post, object.depth, COLORS[object.type], boxes);
          } else {
            box(object, 0, 0, 0, object.width, object.height, object.depth, COLORS[object.type], boxes);
          }
          return;
        }
        let offset = 0;
        object.bays.forEach(function (bay, bayIndex) {
          const upright = object.uprights[bayIndex];
          const postDepth = Math.min(90, upright.depth / 3);
          box(object, offset, 0, 0, upright.width, upright.height, postDepth, '#7790a6', boxes);
          box(object, offset, 0, upright.depth - postDepth, upright.width, upright.height, postDepth, '#7790a6', boxes);
          box(object, offset, upright.height - 85, 0, upright.width, 85, upright.depth, '#7790a6', boxes);
          box(object, offset, 0, 0, upright.width, 75, upright.depth, '#7790a6', boxes);
          offset += upright.width;
          let y = 0;
          bay.levels.forEach(function (level, levelIndex) {
            y += level.clearHeight;
            box(object, offset, y, 0, bay.width, level.thickness, 75, '#d2a75e', boxes);
            box(object, offset, y, bay.depth - 75, bay.width, level.thickness, 75, '#d2a75e', boxes);
            if (level.deck) box(object, offset, y + level.thickness, 0, bay.width, level.deckThickness, bay.depth, '#8298a8', boxes);
            const markerWidth = Math.min(180, bay.width / (level.positions.length * 3));
            level.positions.forEach(function (slot, index) {
              const markerX = offset + (index + 0.5) * bay.width / level.positions.length - markerWidth / 2;
              const color = matches.bySlot.has(slot.id) ? '#45d3b1' : slot.code ? '#62b3cb' : '#465b69';
              box(object, markerX, y + level.thickness + (level.deck ? level.deckThickness : 0) + 8,
                Math.max(5, bay.depth / 2 - 50), markerWidth, 18, 100, color, boxes,
                { objectId: object.id, bayIndex: bayIndex, levelIndex: levelIndex, positionIndex: index, slotId: slot.id });
            });
            y += level.thickness;
          });
          offset += bay.width;
        });
        const end = object.uprights[object.uprights.length - 1];
        const endPostDepth = Math.min(90, end.depth / 3);
        box(object, offset, 0, 0, end.width, end.height, endPostDepth, '#7790a6', boxes);
        box(object, offset, 0, end.depth - endPostDepth, end.width, end.height, endPostDepth, '#7790a6', boxes);
        box(object, offset, end.height - 85, 0, end.width, 85, end.depth, '#7790a6', boxes);
        box(object, offset, 0, 0, end.width, 75, end.depth, '#7790a6', boxes);
      });
      return boxes;
    }

    function paint(warehouse, matches) {
      if (!canvas) return;
      const width = Math.max(280, canvas.clientWidth);
      const height = Math.max(320, canvas.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0d151c'; ctx.fillRect(0, 0, width, height);
      const boxes = boxesFor(warehouse, matches);
      const yaw = camera.yaw, pitch = camera.pitch;
      function transform(object, x, y, z) {
        const angle = object.rotation * Math.PI / 180;
        const wx = object.x + Math.cos(angle) * x - Math.sin(angle) * z;
        const wz = object.z + Math.sin(angle) * x + Math.cos(angle) * z;
        const rx = Math.cos(yaw) * wx - Math.sin(yaw) * wz;
        const rz = Math.sin(yaw) * wx + Math.cos(yaw) * wz;
        return { x: rx, y: rz * Math.sin(pitch) - y * Math.cos(pitch), depth: rz * Math.cos(pitch) + y * Math.sin(pitch) };
      }
      const projected = boxes.map(function (item) {
        const points = [
          [0, 0, 0], [item.width, 0, 0], [item.width, 0, item.depth], [0, 0, item.depth],
          [0, item.height, 0], [item.width, item.height, 0], [item.width, item.height, item.depth], [0, item.height, item.depth]
        ].map(function (point) { return transform(item.object, item.x + point[0], item.y + point[1], item.z + point[2]); });
        return { item: item, points: points };
      });
      const extent = projected.flatMap(function (item) { return item.points; });
      if (!extent.length) {
        extent.push({ x: -5000, y: -3500 }); extent.push({ x: 5000, y: 3500 });
      }
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      extent.forEach(function (p) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      });
      const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
      const scale = Math.min((width - 90) / Math.max(3000, maxX - minX), (height - 100) / Math.max(3000, maxY - minY)) * camera.zoom;
      function screen(p) { return [(p.x - centerX) * scale + width / 2, (p.y - centerY) * scale + height / 2]; }
      const floorSize = Math.max(10000, Math.ceil(Math.max(maxX - minX, maxY - minY) / 5000) * 5000);
      ctx.strokeStyle = '#23323d'; ctx.lineWidth = 1;
      const floorObject = { x: 0, z: 0, rotation: 0 };
      const gridStep = Math.max(1000, Math.ceil(floorSize / 60000) * 1000);
      for (let value = -floorSize; value <= floorSize; value += gridStep) {
        [[value, -floorSize, value, floorSize], [-floorSize, value, floorSize, value]].forEach(function (line) {
          const a = screen(transform(floorObject, line[0], 0, line[1]));
          const b = screen(transform(floorObject, line[2], 0, line[3]));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
      }
      const faces = [];
      projected.forEach(function (entry) {
        [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach(function (indices, faceIndex) {
          const points = indices.map(function (index) { return entry.points[index]; });
          faces.push({ item: entry.item, polygon: points.map(screen), depth: points.reduce(function (sum, p) { return sum + p.depth; }, 0) / 4,
            shade: faceIndex });
        });
      });
      faces.sort(function (a, b) { return a.depth - b.depth; });
      pickFaces = [];
      faces.forEach(function (face) {
        const poly = face.polygon;
        ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]);
        poly.slice(1).forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.closePath();
        ctx.fillStyle = face.item.color;
        ctx.globalAlpha = face.shade === 0 ? 0.98 : face.shade === 2 ? 0.65 : 0.82;
        ctx.fill(); ctx.globalAlpha = 1;
        const selectedPosition = face.item.slotRef && face.item.slotRef.slotId === choice.slotId;
        ctx.strokeStyle = selectedPosition ? '#fff2a3' : face.item.object.id === choice.objectId ? '#79f2de' : '#17252e';
        ctx.lineWidth = selectedPosition ? 3 : face.item.object.id === choice.objectId ? 1.7 : 0.8; ctx.stroke();
        pickFaces.push({ objectId: face.item.object.id, slotRef: face.item.slotRef, polygon: poly });
      });
      if (!warehouse.objects.length) {
        ctx.fillStyle = '#7995a1'; ctx.font = '15px Segoe UI, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(labels().empty, width / 2, height / 2);
      }
    }

    function wireCanvas() {
      let drag = null;
      canvas.addEventListener('pointerdown', function (event) {
        drag = { x: event.clientX, y: event.clientY, moved: false };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', function (event) {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
        if (!drag.moved) return;
        camera.yaw += dx * 0.008;
        camera.pitch = Math.max(0.12, Math.min(1.45, camera.pitch + dy * 0.006));
        drag.x = event.clientX; drag.y = event.clientY;
        paint(layout(), model.matchArticles(layout(), options.getRegistry()));
      });
      canvas.addEventListener('pointerup', function (event) {
        if (!drag) return;
        if (!drag.moved) {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left, y = event.clientY - rect.top;
          const found = pickFaces.slice().reverse().find(function (face) { return pointInPolygon(x, y, face.polygon); });
          if (found && found.slotRef) selectSlot(found.slotRef);
          else if (found) { choice.objectId = found.objectId; choice.bay = 0; choice.level = 0; choice.upright = 0; choice.slotId = null; render(); }
        }
        drag = null;
      });
      canvas.addEventListener('wheel', function (event) {
        event.preventDefault();
        camera.zoom = Math.max(0.25, Math.min(4, camera.zoom * (event.deltaY < 0 ? 1.12 : 0.89)));
        paint(layout(), model.matchArticles(layout(), options.getRegistry()));
      }, { passive: false });
    }

    root.addEventListener('click', function (event) {
      const objectButton = event.target.closest('[data-object]');
      if (objectButton) {
        choice.objectId = objectButton.dataset.object;
        choice.bay = 0; choice.level = 0; choice.upright = 0; choice.slotId = null; message = ''; render(); return;
      }
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'find-code') {
        findCode(); return;
      }
      if (action === 'fit' || action === 'top' || action === 'orbit') {
        camera.zoom = 1;
        if (action === 'top') { camera.yaw = 0; camera.pitch = 1.45; }
        else if (action === 'orbit') { camera.yaw = -0.62; camera.pitch = 0.62; }
        paint(layout(), model.matchArticles(layout(), options.getRegistry())); return;
      }
      if (action === 'add') {
        const type = root.querySelector('#wh-recipe').value;
        const next = clone(layout());
        const newObject = model.RACK_TYPES.includes(type) ? model.createRack(type) : model.createArea(type);
        const last = next.objects[next.objects.length - 1];
        newObject.x = last ? last.x + 1800 : 0;
        newObject.z = last ? last.z + 1200 : 0;
        next.objects.push(newObject); choice.objectId = newObject.id; choice.slotId = null;
        commit(next); return;
      }
      const object = selected();
      if (!object) return;
      if (action === 'delete') {
        if (!window.confirm(labels().deleteWarning)) return;
        const next = clone(layout()); next.objects = next.objects.filter(function (item) { return item.id !== object.id; });
        choice.objectId = null; choice.slotId = null; commit(next); return;
      }
      if (action === 'resize' && model.RACK_TYPES.includes(object.type)) {
        const next = clone(layout()); const target = next.objects.find(function (item) { return item.id === object.id; });
        const count = Number(root.querySelector('[data-field="count.bays"]').value);
        const levels = Number(root.querySelector('[data-field="count.levels"]').value);
        const positions = Number(root.querySelector('[data-field="count.positions"]').value);
        let resized;
        try { resized = model.resizeRack(target, count, levels, positions); }
        catch (error) { message = error.message; render(); return; }
        const retained = new Set(model.listSlots({ objects: [resized] }).map(function (slot) { return slot.slotId; }));
        const removedCoded = model.listSlots({ objects: [target] }).some(function (slot) { return slot.code && !retained.has(slot.slotId); });
        if (removedCoded && !window.confirm(labels().removeWarning)) return;
        Object.assign(target, resized); commit(next); return;
      }
      if (action === 'generate' && model.RACK_TYPES.includes(object.type)) {
        const prefix = String(codePrefix).trim();
        if (!prefix) { message = labels().codePrefix + ': 1–80'; render(); return; }
        const next = clone(layout()); const target = next.objects.find(function (item) { return item.id === object.id; });
        target.bays.forEach(function (bay, bayIndex) {
          bay.levels.forEach(function (level, levelIndex) {
            level.positions.forEach(function (slot, positionIndex) {
              if (!slot.code) slot.code = prefix + '-' + String(bayIndex + 1).padStart(2, '0') + '-' +
                String(levelIndex + 1).padStart(2, '0') + '-' + String(positionIndex + 1).padStart(2, '0');
            });
          });
        });
        commit(next);
      }
    });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.dataset.field === 'search') {
        event.preventDefault(); findCode();
      }
    });

    root.addEventListener('change', function (event) {
      const selector = event.target.dataset.select;
      if (selector) {
        choice[selector] = Number(event.target.value); choice.slotId = null; render(); return;
      }
      const field = event.target.dataset.field;
      if (!field) return;
      if (field === 'prefix') { codePrefix = event.target.value.trim(); return; }
      if (field === 'search') { codeSearch = event.target.value; return; }
      if (field.startsWith('count.')) return;
      const object = selected(); if (!object) return;
      const next = clone(layout()); const target = next.objects.find(function (item) { return item.id === object.id; });
      let holder = target, property = field;
      if (field.startsWith('bay.')) { holder = target.bays[choice.bay]; property = field.slice(4); }
      if (field.startsWith('level.')) { holder = target.bays[choice.bay].levels[choice.level]; property = field.slice(6); }
      if (field.startsWith('upright.')) { holder = target.uprights[choice.upright]; property = field.slice(8); }
      if (field === 'slot.code') { holder = target.bays[choice.bay].levels[choice.level].positions[Number(event.target.dataset.slotIndex)]; property = 'code'; }
      holder[property] = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      commit(next);
    });

    window.addEventListener('resize', function () {
      if (canvas && canvas.isConnected && canvas.clientWidth > 0) paint(layout(), model.matchArticles(layout(), options.getRegistry()));
    });
    return { render: render };
  }
  return { create: create };
}));
