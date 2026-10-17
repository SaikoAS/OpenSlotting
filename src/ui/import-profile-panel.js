(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenSlottingImportProfilePanel = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LABELS = {
    en: {
      title: 'Apply source-column profiles', intro: 'Select a saved profile and imports. Preview replacements before applying; data validation is a separate step.',
      profile: 'Saved profile', none: 'No saved profiles', emptyProfiles: 'Create a profile from a configured import in the source-column editor first.',
      search: 'Find imports', type: 'Source type', all: 'All', orders: 'Order lines', master: 'Article master', filter: 'Profile check',
      unvalidated: 'Needs validation', compatible: 'Profile fits', conflict: 'Review columns', unavailable: 'Import unavailable',
      'source-type': 'Different source type — change it explicitly in the editor', 'no-profile': 'Choose a profile',
      select: 'Select compatible imports in this filter', clear: 'Clear selection', preview: 'Preview changes', apply: 'Apply to compatible imports',
      validate: 'Validate and analyze data', editor: 'Open editor', selected: '{{selected}} of {{total}} imports selected · {{hidden}} outside the current filter',
      selection: 'Select', action: 'Action', file: 'Import', rows: 'Data rows', check: 'Profile compatibility', data: 'Data status', pending: 'Not validated', included: 'Included', blocked: 'Blocked',
      previous: 'Previous', next: 'Next', page: 'Page {{page}} of {{pages}} · {{count}} imports in this filter', noFiles: 'No imports match this filter.',
      choose: 'Select imports and a saved profile first.', replacement: 'Applying replaces field/custom-field mappings, preparation rules and selected source rules. Original source bytes stay unchanged. Skipped imports retain their configuration.',
      summary: 'Will change: {{ready}} · Will skip: {{skipped}}. Column compatibility does not establish data validity.',
      fields: '{{oldFields}} → {{fields}} mapped fields · {{oldRules}} → {{rules}} rules', more: 'Showing the first {{count}} selected imports. Every selected import is included in the counts and application.',
      missing: 'missing', ambiguous: 'ambiguous', collision: 'column used twice', 'custom-field-missing': 'custom field unavailable',
      stale: 'The profile or imports changed. Preview the changes again.', invalid: 'The profile could not be checked. Review it in the editor.',
      failed: 'The changes could not be saved. Review the workspace error; no success is reported.',
      applied: 'Saved: profile applied to {{count}} imports; {{skipped}} skipped. Validate the data to refresh the results.',
      saving: 'Saving profile changes…', selectFile: 'Select {{file}}',
      lastApplied: 'Last applied profile', noApplication: 'No application recorded',
      appliedOn: 'Applied: {{date}}', settingsChanged: 'Settings changed since application',
      settingsUnchanged: 'Settings match the application', profileMissing: 'Profile no longer saved',
      profileChanged: 'Saved profile changed since application'
    },
    de: {
      title: 'Quellspaltenprofile anwenden', intro: 'Gespeichertes Profil und Importe auswählen. Änderungen vor dem Anwenden prüfen; die Datenprüfung bleibt ein eigener Schritt.',
      profile: 'Gespeichertes Profil', none: 'Keine gespeicherten Profile', emptyProfiles: 'Zuerst im Quellspalteneditor einen Import einrichten und daraus ein Profil speichern.',
      search: 'Importe suchen', type: 'Quelltyp', all: 'Alle', orders: 'Auftragszeilen', master: 'Artikelstamm', filter: 'Profilprüfung',
      unvalidated: 'Datenprüfung ausstehend', compatible: 'Profil passt', conflict: 'Zuordnung prüfen', unavailable: 'Import nicht verfügbar',
      'source-type': 'Anderer Quelltyp — ausdrücklich im Editor ändern', 'no-profile': 'Profil auswählen',
      select: 'Passende Importe im Filter auswählen', clear: 'Auswahl aufheben', preview: 'Änderungen ansehen', apply: 'Auf passende Importe anwenden',
      validate: 'Daten prüfen und analysieren', editor: 'Im Editor öffnen', selected: '{{selected}} von {{total}} Importen ausgewählt · {{hidden}} außerhalb des aktuellen Filters',
      selection: 'Auswahl', action: 'Aktion', file: 'Import', rows: 'Datenzeilen', check: 'Profilkompatibilität', data: 'Datenstatus', pending: 'Ungeprüft', included: 'Einbezogen', blocked: 'Blockiert',
      previous: 'Zurück', next: 'Weiter', page: 'Seite {{page}} von {{pages}} · {{count}} Importe im Filter', noFiles: 'Keine Importe entsprechen dem Filter.',
      choose: 'Bitte zuerst Importe und ein gespeichertes Profil auswählen.', replacement: 'Beim Anwenden werden Feldzuordnungen, benutzerdefinierte Zuordnungen, Aufbereitung und ausgewählte Quellregeln ersetzt. Originalbytes bleiben erhalten. Übersprungene Importe behalten ihre Einstellungen.',
      summary: 'Ändern: {{ready}} · Überspringen: {{skipped}}. Passende Spalten belegen noch keine gültigen Daten.',
      fields: '{{oldFields}} → {{fields}} zugeordnete Felder · {{oldRules}} → {{rules}} Regeln', more: 'Die ersten {{count}} ausgewählten Importe sind aufgeführt. Zählung und Anwendung berücksichtigen die gesamte Auswahl.',
      missing: 'fehlt', ambiguous: 'mehrdeutig', collision: 'Spalte doppelt verwendet', 'custom-field-missing': 'benutzerdefiniertes Feld nicht verfügbar',
      stale: 'Profil oder Importe wurden verändert. Bitte die Änderungen erneut ansehen.', invalid: 'Das Profil konnte nicht geprüft werden. Bitte im Editor überprüfen.',
      failed: 'Die Änderungen konnten nicht gespeichert werden. Bitte den Workspace-Fehler prüfen; es wird kein Erfolg gemeldet.',
      applied: 'Gespeichert: Profil auf {{count}} Importe angewendet; {{skipped}} übersprungen. Bitte die Daten prüfen, um Ergebnisse zu aktualisieren.',
      saving: 'Profiländerungen werden gespeichert…', selectFile: '{{file}} auswählen',
      lastApplied: 'Zuletzt angewendetes Profil', noApplication: 'Keine Anwendung dokumentiert',
      appliedOn: 'Angewendet: {{date}}', settingsChanged: 'Einstellungen seit Anwendung geändert',
      settingsUnchanged: 'Einstellungen entsprechen der Anwendung', profileMissing: 'Profil nicht mehr gespeichert',
      profileChanged: 'Gespeichertes Profil seit Anwendung geändert'
    }
  };
  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function applicationDescription(model, file, profiles, language) {
    const labels = LABELS[language === 'de' ? 'de' : 'en'];
    const state = model.importProfileApplicationState(file, profiles);
    if (!state.application) return { title: labels.noApplication, detail: '' };
    const date = new Date(state.application.appliedAt).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB');
    return { title: state.application.profileName, detail: [labels.appliedOn.replace('{{date}}', date),
      labels[state.modified ? 'settingsChanged' : 'settingsUnchanged'],
      state.profileMissing ? labels.profileMissing : state.profileChanged ? labels.profileChanged : null].filter(Boolean).join(' · ') };
  }
  function create(options) {
    const root = options.root, model = options.model, batch = options.batch;
    const selected = new Set(), pageSize = 50;
    let workspace, language, rows = null, page = 1, preview = null, busy = false;
    let query = '', sourceType = '', filter = '', message = null;
    const getProfile = function () { return options.getProfiles().find(function (profile) { return profile.id === options.getProfileId(); }); };
    const locked = function () { return busy || options.isLocked(); };
    function t(key, values) {
      let text = (LABELS[options.getLanguage() === 'de' ? 'de' : 'en'][key] || key);
      Object.keys(values || {}).forEach(function (name) { text = text.replace(new RegExp('{{' + name + '}}', 'g'), String(values[name])); });
      return text;
    }
    function conflictText(item) {
      if (!item.plan) return t(item.status);
      return item.plan.unresolved.map(function (issue) {
        const custom = options.getCustomFields().find(function (field) { return field.id === issue.targetId; });
        return (issue.header || '—') + ' → ' + (issue.ruleName || (custom ? custom.name : options.fieldLabel(issue.targetId))) + ' (' + t(issue.reason) + ')';
      }).join('; ');
    }
    function records() {
      if (!rows) {
        const profile = getProfile(), fields = options.getCustomFields();
        rows = options.getFiles().map(function (file) {
        let check;
        try { check = batch.evaluate(model, profile, file, fields); }
        catch (error) { check = { status: 'invalid', plan: null }; }
        return Object.assign({ file: file }, check);
        });
      }
      return rows;
    }
    function visible() {
      const search = query.trim().toLocaleLowerCase(options.getLanguage());
      return records().filter(function (item) {
        return (!search || String(item.file.label).toLocaleLowerCase(options.getLanguage()).includes(search)) &&
          (!sourceType || item.file.sourceType === sourceType) &&
          (!filter || (filter === 'unvalidated' ? !item.file.result || !item.file.confirmedMapping :
            filter === 'conflict' ? ['conflict', 'source-type', 'invalid', 'unavailable'].includes(item.status) : item.status === filter));
      });
    }
    function render() {
      const id = options.getWorkspaceId(), locale = options.getLanguage();
      if (workspace !== id) {
        workspace = id; selected.clear(); rows = null; preview = null; page = 1; query = ''; sourceType = ''; filter = ''; message = null; language = null;
      }
      if (!options.isVisible()) return;
      if (language !== locale) {
        language = locale;
        root.innerHTML = '<div class="panel-heading"><div><h3>' + esc(t('title')) + '</h3><p class="table-note">' + esc(t('intro')) + '</p></div>' +
          '<button type="button" class="secondary-button" data-profile-action="editor">' + esc(t('editor')) + '</button></div>' +
          '<div class="profile-batch-filters"><label class="compact-field">' + esc(t('profile')) + '<select data-profile-field="profile" aria-label="' + esc(t('profile')) + '"></select></label>' +
          '<label class="compact-field">' + esc(t('search')) + '<input type="search" data-profile-field="search" autocomplete="off"></label>' +
          '<label class="compact-field">' + esc(t('type')) + '<select data-profile-field="type" aria-label="' + esc(t('type')) + '"><option value="">' + esc(t('all')) + '</option><option value="order-lines">' + esc(t('orders')) + '</option><option value="article-master">' + esc(t('master')) + '</option></select></label>' +
          '<label class="compact-field">' + esc(t('filter')) + '<select data-profile-field="filter" aria-label="' + esc(t('filter')) + '">' + ['', 'unvalidated', 'compatible', 'conflict'].map(function (value) {
            return '<option value="' + value + '">' + esc(t(value || 'all')) + '</option>';
          }).join('') + '</select></label></div>' +
          '<p class="table-note" data-profile-empty></p><div class="profile-batch-actions">' + ['select', 'clear', 'preview', 'validate'].map(function (action) {
            return '<button type="button" class="secondary-button" data-profile-action="' + action + '">' + esc(t(action)) + '</button>';
          }).join('') + '</div><p class="table-note" data-profile-selection role="status"></p>' +
          '<div class="table-scroll profile-batch-scroll" tabindex="0" aria-label="' + esc(t('title')) + '"><table><thead><tr><th class="profile-pick">' + esc(t('selection')) + '</th><th>' + esc(t('file')) + '</th><th>' + esc(t('lastApplied')) + '</th><th>' + esc(t('type')) + '</th><th>' + esc(t('rows')) + '</th><th>' + esc(t('data')) + '</th><th>' + esc(t('check')) + '</th><th>' + esc(t('action')) + '</th></tr></thead><tbody data-profile-rows></tbody></table></div>' +
          '<div class="profile-batch-pagination"><button type="button" class="secondary-button" data-profile-action="previous">' + esc(t('previous')) + '</button><span class="table-note" data-profile-page></span><button type="button" class="secondary-button" data-profile-action="next">' + esc(t('next')) + '</button></div>' +
          '<p class="profile-batch-message" role="status" aria-live="polite" data-profile-message></p><section class="profile-batch-preview hidden" data-profile-preview></section>';
        root.querySelector('[data-profile-field="search"]').value = query;
        root.querySelector('[data-profile-field="type"]').value = sourceType;
        root.querySelector('[data-profile-field="filter"]').value = filter;
      }
      const profileSelect = root.querySelector('[data-profile-field="profile"]');
      profileSelect.innerHTML = options.getProfiles().length ? options.getProfiles().map(function (profile) {
        return '<option value="' + esc(profile.id) + '">' + esc(profile.name) + ' · ' + esc(t(profile.sourceType === 'article-master' ? 'master' : 'orders')) + '</option>';
      }).join('') : '<option value="">' + esc(t('none')) + '</option>';
      profileSelect.value = options.getProfileId() || '';
      root.querySelector('[data-profile-empty]').textContent = options.getProfiles().length ? '' : t('emptyProfiles');
      const filtered = visible(), ids = new Set(filtered.map(function (item) { return item.file.id; }));
      const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.max(1, Math.min(page, pages));
      root.querySelector('[data-profile-selection]').textContent = t('selected', { selected: selected.size, total: records().length,
        hidden: Array.from(selected).filter(function (key) { return !ids.has(key); }).length });
      root.querySelector('[data-profile-rows]').innerHTML = filtered.slice((page - 1) * pageSize, page * pageSize).map(function (item) {
        const file = item.file, status = file.errorKey || file.result && file.result.blocking ? 'blocked' : file.result ? 'included' : 'pending';
        const application = applicationDescription(model, file, options.getProfiles(), locale);
        return '<tr><td><input type="checkbox" data-profile-file="' + esc(file.id) + '" aria-label="' + esc(t('selectFile', { file: file.label })) + '"' + (selected.has(file.id) ? ' checked' : '') + (locked() ? ' disabled' : '') + '></td>' +
          '<th scope="row">' + esc(file.label) + '</th><td class="profile-application"><strong>' + esc(application.title) + '</strong>' + (application.detail ? '<p class="table-note">' + esc(application.detail) + '</p>' : '') + '</td><td>' + esc(t(file.sourceType === 'article-master' ? 'master' : 'orders')) + '</td><td class="number">' + esc(file.dataRowCount == null ? '—' : file.dataRowCount) + '</td><td>' + esc(t(status)) + '</td>' +
          '<td><strong>' + esc(t(item.status)) + '</strong>' + (item.status === 'conflict' ? '<p class="table-note">' + esc(conflictText(item)) + '</p>' : '') + '</td><td><button type="button" class="secondary-button" data-profile-editor="' + esc(file.id) + '"' + (locked() ? ' disabled' : '') + '>' + esc(t('editor')) + '</button></td></tr>';
      }).join('') || '<tr><td colspan="8">' + esc(t('noFiles')) + '</td></tr>';
      root.querySelector('[data-profile-page]').textContent = t('page', { page: page, pages: pages, count: filtered.length });
      root.querySelector('[data-profile-message]').textContent = message ? t(message.key, message.values) : '';
      root.querySelectorAll('.profile-batch-actions button, .profile-batch-filters input, .profile-batch-filters select').forEach(function (control) { control.disabled = locked(); });
      root.querySelector('[data-profile-action="editor"]').disabled = locked();
      root.querySelector('[data-profile-action="previous"]').disabled = locked() || page === 1;
      root.querySelector('[data-profile-action="next"]').disabled = locked() || page === pages;
      root.querySelector('[data-profile-action="select"]').disabled = locked() || !getProfile();
      root.querySelector('[data-profile-action="preview"]').disabled = locked() || !getProfile() || !selected.size;
      root.querySelector('[data-profile-action="validate"]').disabled = locked() || !options.getFiles().some(function (file) { return file.parsed && !file.errorKey; });
      renderPreview();
    }
    function renderPreview() {
      const section = root.querySelector('[data-profile-preview]');
      section.classList.toggle('hidden', !preview);
      if (!preview) { section.replaceChildren(); return; }
      const ready = preview.items.filter(function (item) { return item.status === 'compatible'; }).length;
      section.innerHTML = '<h4>' + esc(t('summary', { ready: ready, skipped: preview.items.length - ready })) + '</h4><p>' + esc(t('replacement')) + '</p>' +
        '<div class="profile-preview-list">' + preview.items.slice(0, 100).map(function (item) {
          const plan = item.plan, file = options.getFiles().find(function (entry) { return entry.id === item.id; });
          const assignments = plan ? Object.keys(plan.mapping).map(function (key) { return file.headers[plan.mapping[key]] + ' → ' + options.fieldLabel(key); }).concat(
            Object.keys(plan.customFieldMapping).map(function (key) { const field = options.getCustomFields().find(function (entry) { return entry.id === key; });
              return file.headers[plan.customFieldMapping[key]] + ' → ' + (field ? field.name : key); })) : [];
          const rules = plan ? Object.keys(plan.preparationRules).flatMap(function (key) { return plan.preparationRules[key].map(function (rule) { return options.fieldLabel(key) + ': ' + options.ruleLabel(rule.type); }); })
            .concat(plan.sourceRules.map(function (rule) { return rule.name + ': ' + rule.description; })) : [];
          return '<details><summary>' + esc(item.label) + ' · ' + esc(t(item.status)) + '</summary><p>' + esc(item.status === 'compatible' ?
            t('fields', { oldFields: item.previousFields, fields: plan.matchedCount, oldRules: item.previousRules,
              rules: model.countAccessiblePreparationRules(plan.preparationRules, plan.mapping, plan.customFieldMapping, options.getCustomFields()) + plan.sourceRules.length }) : conflictText(item)) + '</p>' +
            (item.status === 'compatible' ? '<p>' + esc(assignments.join('; ')) + '</p>' + (rules.length ? '<p>' + esc(rules.join('; ')) + '</p>' : '') : '') + '</details>';
        }).join('') + '</div>' + (preview.items.length > 100 ? '<p>' + esc(t('more', { count: 100 })) + '</p>' : '') +
        '<button type="button" class="primary-button" data-profile-action="apply"' + (!ready || locked() ? ' disabled' : '') + '>' + esc(t('apply')) + '</button>';
    }
    function refresh() {
      rows = null;
      if (!options.isVisible()) { render(); return; }
      const ids = new Set(options.getFiles().map(function (file) { return file.id; }));
      selected.forEach(function (id) { if (!ids.has(id)) selected.delete(id); });
      if (preview && preview.fingerprint !== batch.fingerprint(getProfile(), options.getFiles(), preview.ids, options.getCustomFields())) {
        preview = null; message = { key: 'stale' };
      }
      render();
    }
    root.addEventListener('input', function (event) {
      if (event.target.dataset.profileField !== 'search' || locked()) return;
      query = event.target.value; page = 1; render();
    });
    root.addEventListener('change', function (event) {
      if (locked()) return;
      const field = event.target.dataset.profileField, id = event.target.dataset.profileFile;
      if (id) { if (event.target.checked) selected.add(id); else selected.delete(id); preview = null; message = null; }
      else if (field === 'profile') { options.setProfileId(event.target.value || null); rows = null; preview = null; message = null; }
      else if (field === 'type') { sourceType = event.target.value; page = 1; }
      else if (field === 'filter') { filter = event.target.value; page = 1; }
      else return;
      render();
    });
    root.addEventListener('click', async function (event) {
      const button = event.target.closest('button');
      if (!button || !root.contains(button) || locked() || button.disabled) return;
      const action = button.dataset.profileAction, id = button.dataset.profileEditor;
      if (id || action === 'editor') { options.openEditor(id || null); return; }
      if (action === 'validate') { options.validate(); return; }
      if (action === 'select') { visible().filter(function (item) { return item.status === 'compatible'; }).forEach(function (item) { selected.add(item.file.id); }); preview = null; message = null; }
      if (action === 'clear') { selected.clear(); preview = null; message = null; }
      if (action === 'previous') page -= 1;
      if (action === 'next') page += 1;
      if (action === 'preview') {
        try {
          preview = batch.prepare(model, getProfile(), options.getFiles(), Array.from(selected), options.getCustomFields());
          preview.workspaceId = options.getWorkspaceId(); message = null;
        }
        catch (error) { preview = null; message = { key: 'invalid' }; }
      }
      if (action === 'apply' && preview) {
        busy = true; message = { key: 'saving' }; render();
        try {
          const result = await options.apply(preview);
          preview = null; rows = null; message = { key: 'applied', values: { count: result.applied, skipped: result.skipped } };
        } catch (error) { preview = null; message = { key: error.message === 'stale-preview' ? 'stale' : 'failed' }; }
        finally { busy = false; }
      }
      render();
      if (['previous', 'next', 'preview', 'apply', 'clear', 'select'].includes(action)) {
        const next = root.querySelector('[data-profile-action="' + action + '"]');
        if (next && !next.disabled) next.focus({ preventScroll: true });
      }
    });
    return { refresh: refresh };
  }
  return Object.freeze({ create: create, applicationDescription: applicationDescription });
}));
