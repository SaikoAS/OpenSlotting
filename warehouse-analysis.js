(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OpenSlottingWarehouseAnalysis = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LABELS = {
    en: {
      unassigned: 'Unassigned', picking: 'Picking', reserve: 'Reserve',
      objectColors: 'Object colors', usageColors: 'Usage colors',
      palletFrameColor: 'Pallet rack: upright frames', palletBeamColor: 'Pallet rack: beams', palletDeckColor: 'Pallet rack: decks',
      title: '3D warehouse analysis', intro: 'Inspect modeled locations and current article-master assignments.',
      fit: 'Fit view', focus: 'Focus selection', search: 'Find location code', find: 'Find',
      selected: 'Selected position', selectHint: 'Click a position marker or search its exact code.',
      noCode: 'No code', notFound: 'No position has this exact code.', articles: 'Articles at this position',
      noArticles: 'No current article-master match.', locations: 'Article-master locations',
      matched: 'Matched articles', unmatched: 'Unmatched codes', noMaster: 'No current locations in the imported article master.',
      noUnmatched: 'All imported location codes are assigned.', objects: 'Objects', positions: 'Positions',
      bay: 'Bay', level: 'Level', position: 'Position', coded: 'code assigned', linked: 'article matched', empty: 'no code',
      hint: 'Left drag: rotate · right or middle drag / Shift+drag: pan · wheel: zoom · click: select position',
      unavailable: '3D is unavailable in this browser context. Code search and assignment details remain available.'
    },
    de: {
      unassigned: 'Nicht zugewiesen', picking: 'Kommissionierung', reserve: 'Reserve',
      objectColors: 'Objektfarben', usageColors: 'Nutzungsfarben',
      palletFrameColor: 'Palettenregal: Ständerrahmen', palletBeamColor: 'Palettenregal: Traversen', palletDeckColor: 'Palettenregal: Fachböden',
      title: '3D-Lagerauswertung', intro: 'Modellierte Stellplätze und aktuelle Zuordnungen aus dem Artikelstamm prüfen.',
      fit: 'Einpassen', focus: 'Auswahl fokussieren', search: 'Stellplatzcode suchen', find: 'Finden',
      selected: 'Ausgewählter Stellplatz', selectHint: 'Stellplatzmarkierung anklicken oder exakten Code suchen.',
      noCode: 'Ohne Code', notFound: 'Kein Stellplatz mit genau diesem Code gefunden.', articles: 'Artikel an diesem Stellplatz',
      noArticles: 'Keine aktuelle Zuordnung im Artikelstamm.', locations: 'Stellplätze aus Artikelstamm',
      matched: 'Zugeordnete Artikel', unmatched: 'Nicht zugeordnete Codes', noMaster: 'Keine aktuellen Stellplätze im importierten Artikelstamm.',
      noUnmatched: 'Alle importierten Stellplatzcodes sind zugeordnet.', objects: 'Objekte', positions: 'Stellplätze',
      bay: 'Fach', level: 'Ebene', position: 'Position', coded: 'Code vergeben', linked: 'Artikel zugeordnet', empty: 'ohne Code',
      hint: 'Links ziehen: drehen · rechts oder mittig ziehen / Umschalt+ziehen: verschieben · Mausrad: zoomen · Klick: Stellplatz wählen',
      unavailable: '3D ist in diesem Browserkontext nicht verfügbar. Codesuche und Zuordnungsdetails bleiben verfügbar.'
    }
  };
  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function create(options) {
    const root = options.root;
    const model = options.model;
    const canvas = document.createElement('canvas');
    canvas.className = 'wh-canvas wh-analysis-canvas';
    canvas.setAttribute('role', 'img');
    const camera = { yaw: -0.62, pitch: 0.62, zoom: 1, target: null, baseScale: null };
    let selectedSlotId = null;
    let search = '';
    let message = '';
    let workspaceId = null;
    let currentInfo = null;
    let wallMode = 'transparent';
    let colorMode = 'structure';
    let showLocations = true;
    const renderer = window.OpenSlottingWarehouseWebGL && window.OpenSlottingWarehouseWebGL.create(canvas, {
      onLost: function () { render(); }, onRestored: function () { render(); }
    });
    function labels() { return LABELS[options.getLanguage() === 'de' ? 'de' : 'en']; }
    function resetIfWorkspaceChanged() {
      const current = options.getWorkspaceId();
      if (current === workspaceId) return;
      workspaceId = current;
      currentInfo = null;
      selectedSlotId = null; search = ''; message = '';
      colorMode = 'structure'; showLocations = true;
      camera.yaw = -0.62; camera.pitch = 0.62; camera.zoom = 1; camera.target = null; camera.baseScale = null;
    }
    function data(refresh) {
      if (!refresh && currentInfo) return currentInfo;
      const layout = options.getLayout();
      currentInfo = { layout: layout, slots: model.listLocations(layout), matches: model.matchArticles(layout, options.getRegistry()) };
      return currentInfo;
    }
    function boxes(info) {
      return window.OpenSlottingWarehouseScene.buildBoxes(model, info.layout, info.matches, { colorMode: colorMode, showLocations: showLocations });
    }
    function colorLegend(info, t) {
      const palette = window.OpenSlottingWarehouseScene.PALLET_PART_COLORS;
      const entries = [
        [palette.upright, t.palletFrameColor], [palette.beam, t.palletBeamColor], [palette.deck, t.palletDeckColor]
      ];
      if (colorMode === 'usage' || info.layout.objects.some(function (object) { return object.type === 'shelf-rack'; })) {
        model.USAGES.forEach(function (usage) { entries.push([model.USAGE_COLORS[usage], t[usage]]); });
      }
      return entries.map(function (entry) {
        return '<span><i style="background:' + entry[0] + '"></i>' + esc(entry[1]) + '</span>';
      }).join('');
    }
    function paint(info) {
      if (!renderer || !renderer.available() || !canvas.isConnected) return;
      renderer.render(boxes(info), camera, null, selectedSlotId, new Set(), wallMode);
    }
    function focusSelection() {
      if (!renderer || !renderer.available()) return;
      const info = data();
      const slot = info.slots.find(function (item) { return item.slotId === selectedSlotId; });
      if (!slot) return;
      const objectBoxes = boxes(info).filter(function (item) { return item.object.id === slot.objectId; });
      if (!objectBoxes.length) return;
      const view = window.OpenSlottingWarehouseWebGL.projectScene(objectBoxes,
        { yaw: camera.yaw, pitch: camera.pitch, zoom: 1 }, Math.max(280, canvas.clientWidth),
        Math.max(320, canvas.clientHeight), null, null, new Set(), wallMode).view;
      camera.target = Object.assign({}, view.fitTarget);
      camera.baseScale = view.fitScale;
      camera.zoom = 1;
      paint(info);
    }
    function render() {
      resetIfWorkspaceChanged();
      const t = labels();
      const info = data(true);
      const slot = info.slots.find(function (item) { return item.slotId === selectedSlotId; }) || null;
      if (!slot) selectedSlotId = null;
      const articles = slot ? info.matches.bySlot.get(slot.slotId) || [] : [];
      root.innerHTML = '<div class="wh-header"><div><p class="wh-eyebrow">OpenSlotting · 3D</p><h3>' + esc(t.title) +
        '</h3><p>' + esc(t.intro) + '</p></div><div class="wh-summary"><strong>' + info.layout.objects.length +
        '</strong> ' + esc(t.objects) + '<br><strong>' + info.slots.length + '</strong> ' + esc(t.positions) + '</div></div>' +
        '<div class="wh-view-toolbar"><strong>' + esc(t.title) + '</strong><div><button type="button" data-action="fit">' +
        esc(t.fit) + '</button><button type="button" data-action="focus"' + (slot && renderer && renderer.available() ? '' : ' disabled') +
        '>' + esc(t.focus) + '</button><button type="button" data-action="colors" data-color-mode="structure" aria-pressed="' +
        (colorMode === 'structure') + '">' + esc(t.objectColors) + '</button><button type="button" data-action="colors" data-color-mode="usage" aria-pressed="' +
        (colorMode === 'usage') + '">' + esc(t.usageColors) + '</button><button type="button" data-action="markers" aria-pressed="' + showLocations + '">' + esc((options.getLanguage() === 'de' ? 'Stellplätze: ' : 'Locations: ') + (showLocations ? (options.getLanguage() === 'de' ? 'an' : 'on') : (options.getLanguage() === 'de' ? 'aus' : 'off'))) + '</button></div></div>' +
        '<div class="wh-analysis-viewport"></div>' +
        '<p class="wh-view-hint">' + esc(renderer && renderer.available() ? t.hint : t.unavailable) + '</p>' +
        '<div class="wh-legend"><span><i class="matched"></i>' + esc(t.linked) + '</span><span><i class="coded"></i>' +
        esc(t.coded) + '</span><span><i class="empty"></i>' + esc(t.empty) + '</span>' + colorLegend(info, t) + '</div>' +
        '<div class="wh-analysis-details"><section class="wh-card wh-slot-inspector"><div class="wh-slot-search"><label class="wh-field"><span>' +
        esc(t.search) + '</span><input type="search" data-field="search" value="' + esc(search) + '" maxlength="80"></label>' +
        '<button type="button" class="wh-small-button" data-action="find">' + esc(t.find) + '</button></div>' +
        '<h4>' + esc(t.selected) + '</h4>' + (slot ? '<div class="wh-selected-code">' + esc(slot.code || t.noCode) +
          '</div><p class="wh-slot-path">' + esc(slot.objectName) + ' · ' + esc(t.bay) + ' ' + (slot.bayIndex + 1) +
          ' · ' + (slot.ground ? (options.getLanguage() === 'de' ? 'Boden (Ebene 0)' : 'Ground (level 0)') : esc(t.level) + ' ' + (slot.levelIndex + 1)) + ' · ' + esc(t.position) + ' ' + (slot.positionIndex + 1) +
          ' · ' + esc(t[slot.usage] || slot.usage) + '</p>' +
          (articles.length ? '<div class="wh-selected-articles"><strong>' + esc(t.articles) + '</strong>' +
            articles.map(function (article) { return '<div>' + esc(article.articleId) + (article.name ? ' · ' + esc(article.name) : '') + '</div>'; }).join('') +
            '</div>' : '<p class="wh-empty">' + esc(t.noArticles) + '</p>') : '<p class="wh-empty">' + esc(t.selectHint) + '</p>') +
        '<p class="wh-message" role="status" aria-live="polite">' + esc(message) + '</p></section>' +
        '<section class="wh-card wh-import"><div class="wh-import-head"><h4>' + esc(t.locations) + '</h4><span><strong>' +
        info.matches.matched + '</strong> ' + esc(t.matched) + ' · <strong>' + info.matches.unmatched.length +
        '</strong> ' + esc(t.unmatched) + '</span></div>' +
        (info.matches.withLocation === 0 ? '<p class="wh-empty">' + esc(t.noMaster) + '</p>' :
          '<div class="wh-match-list">' + info.matches.unmatched.slice(0, 100).map(function (item) {
            return '<div><strong>' + esc(item.code) + '</strong><span>' + esc(item.articleId) + ' · ' + esc(item.name) +
              '</span></div>';
          }).join('') + (info.matches.unmatched.length === 0 ? '<p class="wh-empty">' + esc(t.noUnmatched) + '</p>' : '') +
          '</div>') + '</section></div>';
      root.querySelector('.wh-analysis-viewport').appendChild(canvas);
      canvas.setAttribute('aria-label', t.title);
      paint(info);
    }
    root.addEventListener('input', function (event) {
      if (event.target.dataset.field === 'search') search = event.target.value;
    });
    function find() {
      const code = search.trim();
      const slot = data().slots.find(function (item) { return Boolean(code) && item.code === code; });
      if (slot) { selectedSlotId = slot.slotId; message = ''; render(); focusSelection(); }
      else { message = labels().notFound; render(); }
    }
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target.dataset.field === 'search') { event.preventDefault(); find(); }
    });
    root.addEventListener('click', function (event) {
      const action = event.target.closest('[data-action]') && event.target.closest('[data-action]').dataset.action;
      if (action === 'find') find();
      else if (action === 'fit') { camera.zoom = 1; camera.target = null; camera.baseScale = null; paint(data()); }
      else if (action === 'focus') focusSelection();
      else if (action === 'markers') { showLocations = !showLocations; render(); }
      else if (action === 'colors') {
        colorMode = event.target.closest('[data-action]').dataset.colorMode === 'usage' ? 'usage' : 'structure';
        render();
        const button = root.querySelector('[data-action="colors"][data-color-mode="' + colorMode + '"]');
        if (button) button.focus({ preventScroll: true });
      }
    });
    let drag = null;
    canvas.addEventListener('pointerdown', function (event) {
      if (![0, 1, 2].includes(event.button) || !renderer || !renderer.available()) return;
      event.preventDefault();
      const view = renderer.view();
      if (view && !camera.target) camera.target = Object.assign({}, view.fitTarget);
      if (view && !camera.baseScale) camera.baseScale = view.fitScale;
      drag = { x: event.clientX, y: event.clientY, moved: false,
        pan: event.button !== 0 || event.shiftKey };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', function (event) {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      if (drag.pan) {
        const view = renderer.view();
        if (view && camera.target) camera.target = window.OpenSlottingWarehouseWebGL.panTarget(camera.target,
          camera.yaw, camera.pitch, dx, dy, view.scale);
      } else {
        camera.yaw += dx * 0.008;
        camera.pitch = Math.max(0.12, Math.min(1.45, camera.pitch + dy * 0.006));
      }
      drag.x = event.clientX; drag.y = event.clientY;
      paint(data());
    });
    canvas.addEventListener('pointerup', function (event) {
      if (drag && !drag.moved && !drag.pan) {
        const found = renderer.pick(event.clientX, event.clientY);
        if (found && found.slotId) { selectedSlotId = found.slotId; message = ''; render(); }
      }
      drag = null;
    });
    canvas.addEventListener('pointercancel', function () { drag = null; });
    canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    canvas.addEventListener('wheel', function (event) {
      event.preventDefault();
      const view = renderer && renderer.view();
      if (view && !camera.target) camera.target = Object.assign({}, view.fitTarget);
      if (view && !camera.baseScale) camera.baseScale = view.fitScale;
      camera.zoom = Math.max(0.25, Math.min(4, camera.zoom * (event.deltaY < 0 ? 1.12 : 0.89)));
      paint(data());
    }, { passive: false });
    let resizeFrame = null;
    function schedulePaint() {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = null;
        if (canvas.isConnected && canvas.clientWidth > 0 && canvas.clientHeight > 0) paint(data());
      });
    }
    window.addEventListener('resize', schedulePaint);
    if (typeof window.ResizeObserver === 'function') {
      const observer = new window.ResizeObserver(schedulePaint);
      observer.observe(root); observer.observe(canvas);
    }
    return { render: render };
  }
  return { create: create };
}));
