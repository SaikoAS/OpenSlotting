(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenSlottingImportManager = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LABELS = {
    de: { title: 'Importdateien', search: 'Dateiname, Tag oder Profil suchen', status: 'Datenstatus', tags: 'Tags', link: 'Verknüpfung', all: 'Alle',
      ready: 'Ungeprüft', included: 'Einbezogen', blocked: 'Ausgeschlossen', error: 'Lesefehler', reading: 'Wird gelesen', linked: 'Verknüpft', snapshot: 'Einmalimport', reconnect: 'Neu verbinden',
      name: 'Datei', rows: 'Datenzeilen', type: 'Quelltyp', profile: 'Angewendetes Profil', size: 'Größe', updated: 'Eingelesen', orders: 'Auftragszeilen', master: 'Artikelstamm',
      none: '—', empty: 'Noch keine Importdateien. CSV-Dateien öffnen oder verknüpfen.', noMatch: 'Keine Dateien entsprechen den Filtern.', reset: 'Filter löschen',
      previous: 'Zurück', next: 'Weiter', page: 'Seite {{page}} / {{pages}}', count: '{{visible}} von {{total}} Dateien', summary: '{{files}} Dateien · {{rows}} Datenzeilen · {{linked}} verknüpft · {{review}} zu prüfen',
      selected: 'Ausgewählter Import', choose: 'Eine Datei auswählen, um Tags und Aktionen zu bearbeiten.', addTag: 'Tag hinzufügen', tagHint: 'Eigene Tags, z. B. August oder Standort Nord. Maximal 20 Tags mit je 40 Zeichen.',
      add: 'Hinzufügen', removeTag: 'Tag entfernen', failed: 'Tags konnten nicht gespeichert werden. Die bisherigen Tags bleiben erhalten.', invalid: 'Bitte maximal 20 Tags mit jeweils 1–40 Zeichen verwenden.',
      saved: 'Tags gespeichert.', saving: 'Tags werden gespeichert…', editor: 'Quellspalten bearbeiten', update: 'Aktualisieren', connect: 'Datei verknüpfen', reconnectAction: 'Datei neu verbinden', unlink: 'Verknüpfung lösen', remove: 'Datei entfernen',
      modified: 'Datei geändert', permission: 'Lokale Dateiverknüpfung fehlt. Bitte neu verbinden.', dates: 'Datumsangaben beziehen sich auf die Datei, nicht auf den Lieferzeitraum.' },
    en: { title: 'Imported files', search: 'Search file name, tag or profile', status: 'Data status', tags: 'Tags', link: 'File link', all: 'All',
      ready: 'Needs validation', included: 'Included', blocked: 'Excluded', error: 'Read error', reading: 'Reading', linked: 'Linked', snapshot: 'Snapshot', reconnect: 'Reconnect',
      name: 'File', rows: 'Data rows', type: 'Source type', profile: 'Applied profile', size: 'Size', updated: 'Imported', orders: 'Order lines', master: 'Article master',
      none: '—', empty: 'No imported files yet. Open or link CSV files.', noMatch: 'No files match these filters.', reset: 'Clear filters',
      previous: 'Previous', next: 'Next', page: 'Page {{page}} / {{pages}}', count: '{{visible}} of {{total}} files', summary: '{{files}} files · {{rows}} data rows · {{linked}} linked · {{review}} need review',
      selected: 'Selected import', choose: 'Select a file to edit tags and access its actions.', addTag: 'Add tag', tagHint: 'Custom tags, e.g. August or North site. Up to 20 tags of 40 characters each.',
      add: 'Add', removeTag: 'Remove tag', failed: 'Tags could not be saved. Previous tags were retained.', invalid: 'Use at most 20 tags containing 1–40 characters each.',
      saved: 'Tags saved.', saving: 'Saving tags…', editor: 'Edit source columns', update: 'Update', connect: 'Link file', reconnectAction: 'Reconnect file', unlink: 'Unlink', remove: 'Remove file',
      modified: 'File modified', permission: 'Local file link missing. Reconnect this file.', dates: 'Dates describe the file, not the delivery period.' }
  };
  function esc(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function status(file) { return file.reading ? 'reading' : file.errorKey ? 'error' : file.result && file.result.blocking ? 'blocked' : file.result ? 'included' : 'ready'; }
  function project(files, settings) {
    const query = String(settings.query || '').trim().toLocaleLowerCase(settings.language), tag = settings.tag || '';
    const rows = files.map(function (file, index) {
      const profile = file.appliedImportProfile ? file.appliedImportProfile.profileName : '';
      return { file: file, index: index, status: status(file), profile: profile,
        link: !file.linkedSource ? 'snapshot' : settings.hasHandle(file.id) ? 'linked' : 'reconnect',
        tags: file.tags || [], updated: file.linkedSource ? Date.parse(file.linkedSource.updatedAt) || 0 : 0 };
    }).filter(function (row) {
      return (!settings.status || settings.status === row.status) && (!settings.link || settings.link === row.link) && (!tag || row.tags.includes(tag)) &&
        (!query || [row.file.name, row.file.label, row.profile].concat(row.tags).join(' ').toLocaleLowerCase(settings.language).includes(query));
    });
    const collator = new Intl.Collator(settings.language, { numeric: true, sensitivity: 'base' });
    const labels = LABELS[settings.language === 'de' ? 'de' : 'en'];
    const key = settings.sort || 'name', direction = settings.direction === 'desc' ? -1 : 1;
    function value(row) {
      if (key === 'rows') return row.file.dataRowCount || 0;
      if (key === 'size') return row.file.size || 0;
      if (key === 'updated') return row.updated;
      if (key === 'name') return row.file.label || row.file.name;
      if (key === 'tags') return row.tags.slice().sort(collator.compare).join(', ');
      if (key === 'type') return labels[row.file.sourceType === 'article-master' ? 'master' : 'orders'];
      if (key === 'status' || key === 'link') return labels[row[key]];
      return row.profile;
    }
    rows.sort(function (a, b) {
      const left = value(a), right = value(b);
      const comparison = typeof left === 'number' ? left - right : collator.compare(left, right);
      return direction * comparison || collator.compare(a.file.label, b.file.label) || a.index - b.index;
    });
    return rows;
  }
  function create(options) {
    const root = options.root, pageSize = 50;
    let language, workspace, selected = null, page = 1, query = '', tag = '', dataStatus = '', link = '', sort = 'name', direction = 'asc';
    let saving = false, message = '', detailSignature = '';
    function t(key, values) { let text = LABELS[language][key]; Object.keys(values || {}).forEach(function (key) { text = text.replace('{{' + key + '}}', values[key]); }); return text; }
    function number(value) { return new Intl.NumberFormat(language).format(value || 0); }
    function date(value) { return value ? new Date(value).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) : t('none'); }
    function size(value) {
      const bytes = value || 0, unit = bytes >= 1048576 ? 'MB' : bytes >= 1024 ? 'KB' : 'B';
      return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(bytes / (unit === 'MB' ? 1048576 : unit === 'KB' ? 1024 : 1)) + ' ' + unit;
    }
    function locked() { return saving || options.isLocked(); }
    function field(key, choices) { return '<label>' + t(key) + '<select data-import-filter="' + key + '"><option value="">' + t('all') + '</option>' + choices.map(function (value) { return '<option value="' + value + '">' + t(value) + '</option>'; }).join('') + '</select></label>'; }
    function shell() {
      root.innerHTML = '<div class="import-manager"><div class="import-manager-summary" role="status"></div><div class="import-manager-filters">' +
        '<label class="import-manager-search">' + t('search') + '<input type="search" data-import-search autocomplete="off"></label>' + field('status', ['ready','included','blocked','error','reading']) +
        field('link', ['linked','snapshot','reconnect']) + '<label>' + t('tags') + '<select data-import-filter="tags"></select></label><button type="button" class="text-button" data-import-reset>' + t('reset') + '</button></div>' +
        '<div class="import-manager-layout"><section class="import-manager-list"><div class="import-manager-title"><strong>' + t('title') + '</strong><span data-import-count></span></div>' +
        '<div class="import-table-scroll" tabindex="0" aria-label="' + t('title') + '"><table class="import-table"><thead><tr>' + ['name','tags','rows','type','status','profile','link','updated','size'].map(function (key) {
          return '<th scope="col" data-import-heading="' + key + '"><button type="button" data-import-sort="' + key + '">' + t(key) + '<span aria-hidden="true"></span></button></th>';
        }).join('') + '</tr></thead><tbody></tbody></table><p class="import-table-empty"></p></div>' +
        '<div class="import-manager-pagination"><span data-import-page></span><div><button type="button" class="secondary-button" data-import-page-step="-1">' + t('previous') + '</button><button type="button" class="secondary-button" data-import-page-step="1">' + t('next') + '</button></div></div></section>' +
        '<aside class="import-detail" aria-label="' + t('selected') + '"></aside></div></div>';
      root.querySelector('[data-import-search]').value = query;
      root.querySelector('[data-import-filter="status"]').value = dataStatus;
      root.querySelector('[data-import-filter="link"]').value = link;
      detailSignature = '';
    }
    function detail(row) {
      const file = row && row.file, busy = locked();
      const signature = JSON.stringify([file && [file.id, file.name, file.label, file.tags, file.size, file.lastModified, row.updated, row.status, row.profile, row.link], busy, message, language]);
      if (signature === detailSignature) return;
      detailSignature = signature;
      const panel = root.querySelector('.import-detail');
      if (!file) { panel.innerHTML = '<h3>' + t('selected') + '</h3><p>' + t('choose') + '</p>'; return; }
      const disabled = busy ? ' disabled' : '', linkedDisabled = busy || !options.linkSupported() ? ' disabled' : '';
      function action(name, label, disabled) { return '<button type="button" class="secondary-button" data-linked-action="' + name + '" data-source-id="' + esc(file.id) + '"' + disabled + '>' + t(label) + '</button>'; }
      panel.innerHTML = '<div class="import-detail-heading"><span>' + t('selected') + '</span><h3>' + esc(file.label) + '</h3></div><div class="import-detail-body"><dl>' +
        [['rows',number(file.dataRowCount)],['type',t(file.sourceType === 'article-master' ? 'master' : 'orders')],['status',t(row.status)],['profile',row.profile || t('none')],['updated',date(row.updated)],['modified',date(file.lastModified)],['size',size(file.size)]].map(function (pair) { return '<div><dt>' + t(pair[0]) + '</dt><dd>' + esc(pair[1]) + '</dd></div>'; }).join('') +
        '</dl><p class="import-detail-note">' + t('dates') + '</p><section class="import-detail-tags"><h4>' + t('tags') + '</h4><div class="import-tag-list">' + row.tags.map(function (value) {
          return '<span class="import-tag">' + esc(value) + '<button type="button" data-import-remove-tag="' + esc(value) + '" aria-label="' + t('removeTag') + ': ' + esc(value) + '"' + disabled + '>×</button></span>';
        }).join('') + '</div><form data-import-tag-form><label>' + t('addTag') + '<input name="tag" maxlength="40" list="import-tag-suggestions" autocomplete="off"' + disabled + '></label><button type="submit" class="secondary-button"' + disabled + '>' + t('add') + '</button></form><p class="import-detail-note">' + t('tagHint') + '</p><p role="status" class="import-tag-message">' + esc(message) + '</p></section>' +
        '</div><div class="import-detail-actions"><button type="button" class="secondary-button" data-import-editor' + disabled + '>' + t('editor') + '</button>' +
        (file.linkedSource ? action('update','update', row.link === 'reconnect' ? ' disabled' : linkedDisabled) : '') + action('connect',file.linkedSource ? 'reconnectAction' : 'connect',linkedDisabled) +
        (file.linkedSource ? action('unlink','unlink',disabled) : '') + '<button type="button" class="text-button danger-button" data-remove-file-id="' + esc(file.id) + '"' + disabled + '>' + t('remove') + '</button></div>' +
        (row.link === 'reconnect' ? '<p class="import-detail-note">' + t('permission') + '</p>' : '');
    }
    function render() {
      const nextWorkspace = options.getWorkspaceId(), nextLanguage = options.getLanguage() === 'de' ? 'de' : 'en';
      const reset = workspace !== nextWorkspace || !root.querySelector('.import-manager');
      if (reset) { workspace = nextWorkspace; selected = null; page = 1; query = tag = dataStatus = link = message = ''; sort = 'name'; direction = 'asc'; }
      if (reset || language !== nextLanguage) { language = nextLanguage; shell(); }
      const files = options.getFiles(), busy = locked();
      root.classList.remove('hidden');
      const tags = Array.from(new Set(files.flatMap(function (file) { return file.tags || []; }))).sort(new Intl.Collator(language).compare);
      if (tag && !tags.includes(tag)) tag = '';
      const selector = root.querySelector('[data-import-filter="tags"]');
      selector.innerHTML = '<option value="">' + t('all') + '</option>' + tags.map(function (value) { return '<option value="' + esc(value) + '">' + esc(value) + '</option>'; }).join(''); selector.value = tag;
      let suggestions = root.querySelector('datalist');
      if (!suggestions) { suggestions = root.ownerDocument.createElement('datalist'); suggestions.id = 'import-tag-suggestions'; root.appendChild(suggestions); }
      suggestions.innerHTML = tags.map(function (value) { return '<option value="' + esc(value) + '"></option>'; }).join('');
      const rows = project(files, { query: query, tag: tag, status: dataStatus, link: link, sort: sort, direction: direction, language: language, hasHandle: options.hasHandle });
      const pages = Math.max(1, Math.ceil(rows.length / pageSize)); page = Math.min(page, pages);
      const visible = rows.slice((page - 1) * pageSize, page * pageSize);
      if (!visible.some(function (row) { return row.file.id === selected; })) { selected = visible.length ? visible[0].file.id : null; message = ''; }
      root.querySelector('.import-manager-summary').textContent = t('summary', { files: number(files.length), rows: number(files.reduce(function (sum, file) { return sum + (file.dataRowCount || 0); }, 0)), linked: number(files.filter(function (file) { return file.linkedSource; }).length), review: number(files.filter(function (file) { return status(file) !== 'included'; }).length) });
      root.querySelector('[data-import-count]').textContent = t('count', { visible: number(rows.length), total: number(files.length) });
      root.querySelector('[data-import-page]').textContent = t('page', { page: page, pages: pages });
      root.querySelectorAll('[data-import-page-step]').forEach(function (button) { button.disabled = Number(button.dataset.importPageStep) < 0 ? page <= 1 : page >= pages; });
      root.querySelectorAll('[data-import-heading]').forEach(function (th) { const active = th.dataset.importHeading === sort; th.setAttribute('aria-sort', active ? direction === 'asc' ? 'ascending' : 'descending' : 'none'); th.querySelector('span').textContent = active ? direction === 'asc' ? ' ↑' : ' ↓' : ''; });
      root.querySelector('tbody').innerHTML = visible.map(function (row) {
        const file = row.file;
        return '<tr class="' + (file.id === selected ? 'selected' : '') + '"><td><button type="button" class="import-file-select" data-import-select="' + esc(file.id) + '" aria-pressed="' + (file.id === selected) + '" title="' + esc(file.label) + '">' + esc(file.label) + '</button></td><td><div class="import-table-tags">' + row.tags.slice(0, 2).map(function (tag) { return '<button type="button" class="import-tag" data-import-tag="' + esc(tag) + '">' + esc(tag) + '</button>'; }).join('') + (row.tags.length > 2 ? '<span title="' + esc(row.tags.join(', ')) + '">+' + (row.tags.length - 2) + '</span>' : '') + '</div></td><td class="numeric">' + number(file.dataRowCount) + '</td><td>' + t(file.sourceType === 'article-master' ? 'master' : 'orders') + '</td><td><span class="import-status ' + row.status + '">' + t(row.status) + '</span></td><td>' + esc(row.profile || t('none')) + '</td><td>' + t(row.link) + '</td><td>' + esc(date(row.updated)) + '</td><td class="numeric">' + size(file.size) + '</td></tr>';
      }).join('');
      const empty = root.querySelector('.import-table-empty'); empty.hidden = visible.length > 0; empty.textContent = t(files.length ? 'noMatch' : 'empty');
      detail(visible.find(function (row) { return row.file.id === selected; }));
      root.querySelectorAll('[data-import-editor], [data-import-tag-form] button, [data-import-tag-form] input, [data-import-remove-tag]').forEach(function (control) { control.disabled = busy; });
    }
    async function saveTags(tags) {
      if (locked()) return;
      const id = selected;
      let normalized;
      try { normalized = options.model.normalizeImportTags(tags); } catch (error) { message = t('invalid'); render(); return; }
      saving = true; message = t('saving'); render();
      try { await options.saveTags(id, normalized); message = selected === id ? t('saved') : ''; }
      catch (error) { message = selected === id ? t('failed') : ''; }
      finally { saving = false; render(); const input = root.querySelector('[data-import-tag-form] input'); if (input && selected === id) input.focus({ preventScroll: true }); }
    }
    root.addEventListener('input', function (event) { if (event.target.matches('[data-import-search]')) { query = event.target.value; page = 1; render(); } });
    root.addEventListener('change', function (event) {
      const field = event.target.dataset.importFilter; if (!field) return;
      if (field === 'status') dataStatus = event.target.value; else if (field === 'link') link = event.target.value; else tag = event.target.value;
      page = 1; render();
    });
    root.addEventListener('click', function (event) {
      const button = event.target.closest('button'); if (!button || !root.contains(button) || button.disabled) return;
      if (button.dataset.importSelect) {
        selected = button.dataset.importSelect; message = ''; render();
        const selectedButton = Array.from(root.querySelectorAll('[data-import-select]')).find(function (node) { return node.dataset.importSelect === selected; });
        if (selectedButton) selectedButton.focus({ preventScroll: true });
      }
      else if (button.dataset.importSort) { const key = button.dataset.importSort; direction = key === sort && direction === 'asc' ? 'desc' : 'asc'; sort = key; page = 1; render(); }
      else if (button.dataset.importPageStep) { page += Number(button.dataset.importPageStep); root.querySelector('.import-table-scroll').scrollTop = 0; render(); }
      else if (button.hasAttribute('data-import-reset')) { query = tag = dataStatus = link = ''; page = 1; shell(); render(); }
      else if (button.hasAttribute('data-import-tag')) { tag = button.dataset.importTag; page = 1; render(); root.querySelector('[data-import-filter="tags"]').focus({ preventScroll: true }); }
      else if (button.hasAttribute('data-import-remove-tag') && !locked()) { const file = options.getFiles().find(function (file) { return file.id === selected; }); if (file) saveTags((file.tags || []).filter(function (tag) { return tag !== button.dataset.importRemoveTag; })); }
      else if (button.hasAttribute('data-import-editor') && !locked()) options.openEditor(selected);
    });
    root.addEventListener('submit', function (event) {
      if (!event.target.matches('[data-import-tag-form]')) return;
      event.preventDefault(); if (locked()) return;
      const input = event.target.querySelector('input'), file = options.getFiles().find(function (file) { return file.id === selected; });
      if (file && input.value.trim()) saveTags((file.tags || []).concat([input.value]));
    });
    return Object.freeze({ render: render });
  }
  return Object.freeze({ create: create, project: project, status: status });
}));
