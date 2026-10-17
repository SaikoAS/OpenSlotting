(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../../periods.js') : root.OpenSlottingPeriods);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenSlottingCoverageCalendar = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (periods) {
  'use strict';
  const DAY = 86400000;
  const LABELS = {
    de: { title: 'Datenabdeckung im Kalender', previous: 'Vorheriger Monat', next: 'Nächster Monat', month: 'Monat', weekShort: 'KW', week: 'Kalenderwoche', weekYear: 'ISO-Wochenjahr',
      intro: 'Tag auswählen, Daten prüfen und eine Begründung hinterlegen. Eine Begründung ergänzt die Datenlage; sie erzeugt keine Absatzwerte und ändert keine Vergleichsergebnisse.',
      observed: 'Gültige Daten vorhanden', missing: 'Keine gültigen Daten', explained: 'Ohne gültige Daten · begründet', outside: 'Außerhalb beobachteter Zeitspanne',
      issues: 'Nur fehlerhafte / ausgeschlossene Zeilen', unexpected: 'Kein erwarteter Liefertag',
      reason: 'Begründung für diesen Tag', placeholder: 'Zum Beispiel: Feiertag – keine Auslieferung',
      save: 'Begründung speichern', remove: 'Begründung entfernen', discard: 'Entwurf verwerfen', evidence: 'Quelldaten dieses Tages ansehen',
      saved: 'Begründung lokal gespeichert.', removed: 'Begründung entfernt.', failed: 'Speichern fehlgeschlagen. Der Entwurf bleibt erhalten.',
      saving: 'Wird gespeichert…', draft: 'Ungespeicherter Entwurf', empty: 'Keine Begründung hinterlegt.',
      counts: 'Gültig: {{valid}} · Fehlerhaft: {{invalid}} · Durch Quellregeln ausgeschlossen: {{filtered}}',
      updated: 'Zuletzt gespeichert: {{date}}', limit: 'Maximal 500 Zeichen.',
      summary: 'Dieser Monat · Tage mit gültigen Daten: {{observed}} · Offene erwartete Tage innerhalb der beobachteten Zeitspanne: {{open}} · Begründete Tage ohne gültige Daten: {{explained}}' },
    en: { title: 'Data coverage calendar', previous: 'Previous month', next: 'Next month', month: 'Month', weekShort: 'Wk', week: 'Calendar week', weekYear: 'ISO week-year',
      intro: 'Select a day to review its data and add a reason. Reasons supplement the evidence; they do not create demand values or change comparison results.',
      observed: 'Valid data available', missing: 'No valid data', explained: 'No valid data · reason recorded', outside: 'Outside the observed date span',
      issues: 'Only invalid / rule-excluded rows', unexpected: 'Not an expected delivery day',
      reason: 'Reason for this day', placeholder: 'For example: Public holiday – no deliveries',
      save: 'Save reason', remove: 'Remove reason', discard: 'Discard draft', evidence: 'View source evidence for this day',
      saved: 'Reason saved locally.', removed: 'Reason removed.', failed: 'Saving failed. The draft is retained.',
      saving: 'Saving…', draft: 'Unsaved draft', empty: 'No reason recorded.',
      counts: 'Valid: {{valid}} · Invalid: {{invalid}} · Excluded by source rules: {{filtered}}',
      updated: 'Last saved: {{date}}', limit: 'Maximum 500 characters.',
      summary: 'This month · Days with valid data: {{observed}} · Unexplained expected days within the observed date span: {{open}} · Days without valid data with a reason: {{explained}}' }
  };
  function validMonth(month) { return typeof month === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month); }
  function shiftMonth(month, offset) {
    if (!validMonth(month)) return null;
    const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + offset;
    const year = Math.floor(index / 12), number = index % 12 + 1;
    return year >= 1 && year <= 9999 ? String(year).padStart(4, '0') + '-' + String(number).padStart(2, '0') : null;
  }
  function monthDays(month) {
    if (!validMonth(month)) throw new Error('invalid-calendar-month');
    const first = new Date(month + '-01T00:00:00Z');
    const start = first.getTime() - ((first.getUTCDay() + 6) % 7) * DAY;
    return Array.from({ length: 42 }, function (_, index) {
      const date = new Date(start + index * DAY), year = date.getUTCFullYear();
      return year >= 1 && year <= 9999 ? date.toISOString().slice(0, 10) : null;
    });
  }
  function calendarWeeks(month) {
    const days = monthDays(month);
    return Array.from({ length: 6 }, function (_, index) {
      const date = days.slice(index * 7, index * 7 + 7).find(Boolean);
      return date ? periods.calendarWeekForDate(date) : null;
    });
  }
  function dayState(date, entry, note, weekdays, bounds) {
    const valid = entry ? entry.validRows : 0;
    const invalid = entry ? entry.invalidLines.size : 0;
    const filtered = entry ? entry.filteredLines.size : 0;
    return { valid: valid, invalid: invalid, filtered: filtered,
      expected: weekdays.includes(new Date(date + 'T00:00:00Z').getUTCDay()),
      kind: valid > 0 ? 'observed' : note ? 'explained' : invalid + filtered > 0 ? 'issues' :
        bounds && (!bounds.first || date < bounds.first || date > bounds.last) ? 'outside' : 'missing' };
  }
  function esc(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function create(options) {
    const root = options.root;
    let workspace, month, selected, entries = new Map(), bounds = { first: null, last: null }, busy = false, message = '';
    const drafts = new Map();
    function t(key, values) {
      let text = LABELS[options.getLanguage() === 'de' ? 'de' : 'en'][key];
      Object.keys(values || {}).forEach(function (name) { text = text.replace('{{' + name + '}}', String(values[name])); });
      return text;
    }
    function locale() { return options.getLanguage() === 'de' ? 'de-DE' : 'en-GB'; }
    function weekDescription(week) { return t('week') + ' ' + week.week + ' · ' + t('weekYear') + ' ' + week.year; }
    function locked() { return busy || options.isLocked(); }
    function render() {
      if (!month) return;
      const notes = new Map(options.getNotes().map(function (note) { return [note.date, note]; }));
      const weekdays = options.getExpectedWeekdays(), note = notes.get(selected);
      const selectedState = dayState(selected, entries.get(selected), note, weekdays, bounds);
      const reason = drafts.has(selected) ? drafts.get(selected) : note ? note.reason : '';
      const changed = reason.trim() !== (note ? note.reason : '');
      const cells = monthDays(month), weeks = calendarWeeks(month), selectedWeek = periods.calendarWeekForDate(selected);
      const counts = { observed: 0, open: 0, explained: 0 };
      cells.filter(function (date) { return date && date.slice(0, 7) === month; }).forEach(function (date) {
        const state = dayState(date, entries.get(date), notes.get(date), weekdays, bounds);
        if (state.valid) counts.observed += 1;
        else if (notes.has(date)) counts.explained += 1;
        else if (state.expected && state.kind !== 'outside') counts.open += 1;
      });
      root.innerHTML = '<div class="panel-heading"><h3>' + esc(t('title')) + '</h3><div class="coverage-calendar-nav">' +
        '<button type="button" class="secondary-button" data-calendar-action="previous" aria-label="' + esc(t('previous')) + '"' + (locked() || !shiftMonth(month, -1) ? ' disabled' : '') + '>‹</button>' +
        '<label>' + esc(t('month')) + '<input type="month" data-calendar-month min="0001-01" max="9999-12" value="' + month + '"' + (locked() ? ' disabled' : '') + '></label>' +
        '<button type="button" class="secondary-button" data-calendar-action="next" aria-label="' + esc(t('next')) + '"' + (locked() || !shiftMonth(month, 1) ? ' disabled' : '') + '>›</button></div></div>' +
        '<p class="table-note">' + esc(t('intro')) + '</p><div class="coverage-calendar-legend">' + ['observed', 'missing', 'explained', 'issues', 'outside'].map(function (key) {
          return '<span class="calendar-key ' + key + '">' + esc(t(key)) + '</span>';
        }).join('') + '</div><p class="table-note">' + esc(t('summary', counts)) + '</p>' +
        '<div class="coverage-calendar-layout"><div><div class="coverage-calendar-weekdays" aria-hidden="true"><span>' + esc(t('weekShort')) + '</span>' + Array.from({ length: 7 }, function (_, index) {
          return '<span>' + esc(new Date(Date.parse('2024-01-01T00:00:00Z') + index * DAY).toLocaleDateString(locale(), { weekday: 'short', timeZone: 'UTC' })) + '</span>';
        }).join('') + '</div><div class="coverage-calendar-days" role="group" aria-label="' + esc(new Date(month + '-01T00:00:00Z').toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' })) + '">' +
        cells.map(function (date, index) {
          const week = weeks[Math.floor(index / 7)];
          const prefix = index % 7 === 0 ? (week ? '<div class="coverage-calendar-week" role="note" aria-label="' + esc(weekDescription(week)) + '" title="' + esc(weekDescription(week)) + '"><strong>' + esc(t('weekShort')) + ' ' + week.week + '</strong><small>' + week.year + '</small></div>' : '<span></span>') : '';
          if (!date) return prefix + '<span></span>';
          const state = dayState(date, entries.get(date), notes.get(date), weekdays, bounds), reason = notes.get(date);
          const text = state.kind === 'missing' && !state.expected ? t('unexpected') : t(state.kind);
          return prefix + '<button type="button" class="coverage-calendar-day ' + state.kind + (date.slice(0, 7) !== month ? ' adjacent' : '') + (!state.expected ? ' unexpected' : '') + '" data-calendar-date="' + date +
            '" tabindex="' + (selected === date ? '0' : '-1') + '" aria-pressed="' + (selected === date) + '" aria-label="' + esc(date + ' · ' + text + (reason ? ' · ' + reason.reason : '')) + '"' + (locked() ? ' disabled' : '') + '>' +
            '<strong>' + Number(date.slice(8)) + '</strong><span>' + esc(text) + '</span>' + (reason ? '<small>' + esc(reason.reason) + '</small>' : '') + '</button>';
        }).join('') + '</div></div><section class="coverage-calendar-detail" aria-labelledby="coverage-calendar-day-title"><h4 id="coverage-calendar-day-title">' + esc(selected) + '</h4>' +
        (selectedWeek ? '<p class="table-note">' + esc(weekDescription(selectedWeek)) + '</p>' : '') +
        '<p>' + esc(t(selectedState.kind)) + (!selectedState.expected ? ' · ' + esc(t('unexpected')) : '') + '</p><p class="table-note">' + esc(t('counts', selectedState)) + '</p>' +
        '<label for="coverage-calendar-reason">' + esc(t('reason')) + '</label><textarea id="coverage-calendar-reason" maxlength="500" rows="4" placeholder="' + esc(t('placeholder')) + '"' + (locked() ? ' disabled' : '') + '>' + esc(reason) + '</textarea>' +
        '<p class="table-note">' + esc(t('limit')) + '</p><p class="table-note" data-calendar-unsaved role="status">' + esc(changed ? t('draft') : note ? t('updated', { date: new Date(note.updatedAt).toLocaleString(locale()) }) : t('empty')) + '</p>' +
        '<div class="coverage-calendar-actions"><button type="button" class="secondary-button" data-calendar-action="save"' + (locked() || !changed || !reason.trim() ? ' disabled' : '') + '>' + esc(t('save')) + '</button>' +
        '<button type="button" class="secondary-button" data-calendar-action="remove"' + (locked() || !note ? ' disabled' : '') + '>' + esc(t('remove')) + '</button>' +
        '<button type="button" class="secondary-button" data-calendar-action="discard"' + (locked() || !changed ? ' disabled' : '') + '>' + esc(t('discard')) + '</button></div>' +
        '<button type="button" class="text-button" data-calendar-action="evidence"' + (locked() || !entries.has(selected) ? ' disabled' : '') + '>' + esc(t('evidence')) + '</button>' +
        '<p role="status" aria-live="polite">' + esc(message ? t(message) : '') + '</p></section></div>';
    }
    function refresh(dates) {
      const id = options.getWorkspaceId();
      if (workspace !== id) { workspace = id; month = null; selected = null; drafts.clear(); message = ''; }
      if (dates) {
        entries = new Map(dates.map(function (entry) { return [entry.date, entry]; }));
        const sorted = Array.from(entries.keys()).sort();
        bounds = { first: sorted[0], last: sorted[sorted.length - 1] };
      }
      if (!month) {
        const dates = Array.from(entries.keys()).sort();
        selected = dates.length ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
        month = selected.slice(0, 7);
      }
      render();
    }
    root.addEventListener('input', function (event) {
      if (event.target.id !== 'coverage-calendar-reason' || locked()) return;
      drafts.set(selected, event.target.value); message = '';
      const note = options.getNotes().find(function (entry) { return entry.date === selected; });
      const changed = event.target.value.trim() !== (note ? note.reason : '');
      root.querySelector('[data-calendar-action="save"]').disabled = !changed || !event.target.value.trim();
      root.querySelector('[data-calendar-action="discard"]').disabled = !changed;
      root.querySelector('[data-calendar-unsaved]').textContent = changed ? t('draft') : '';
    });
    root.addEventListener('change', function (event) {
      if (!event.target.matches('[data-calendar-month]') || locked()) return;
      if (!validMonth(event.target.value)) { render(); return; }
      month = event.target.value; selected = month + '-01'; message = ''; render(); root.querySelector('[data-calendar-month]').focus({ preventScroll: true });
    });
    root.addEventListener('keydown', function (event) {
      const date = event.target.dataset.calendarDate, offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
      if (!date || !offset || locked()) return;
      event.preventDefault();
      const next = new Date(Date.parse(date + 'T00:00:00Z') + offset * DAY);
      if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
      selected = next.toISOString().slice(0, 10); month = selected.slice(0, 7); message = ''; render();
      root.querySelector('[data-calendar-date="' + selected + '"]').focus({ preventScroll: true });
    });
    root.addEventListener('click', async function (event) {
      const button = event.target.closest('button');
      if (!button || !root.contains(button) || button.disabled || locked()) return;
      const date = button.dataset.calendarDate, action = button.dataset.calendarAction;
      if (date) { selected = date; month = date.slice(0, 7); message = ''; render(); root.querySelector('#coverage-calendar-reason').focus({ preventScroll: true }); return; }
      if (action === 'previous' || action === 'next') { month = shiftMonth(month, action === 'previous' ? -1 : 1); selected = month + '-01'; message = ''; render(); root.querySelector('[data-calendar-action="' + action + '"]').focus({ preventScroll: true }); return; }
      if (action === 'discard') { drafts.delete(selected); message = ''; render(); return; }
      if (action === 'evidence') { options.showEvidence(selected); return; }
      if (action !== 'save' && action !== 'remove') return;
      const workspaceId = workspace, dateToSave = selected;
      const reason = action === 'remove' ? '' : drafts.get(selected);
      busy = true; message = 'saving'; render();
      try {
        await options.save(dateToSave, reason);
        if (workspace === workspaceId) { drafts.delete(dateToSave); message = action === 'remove' ? 'removed' : 'saved'; }
      } catch (error) { if (workspace === workspaceId) message = 'failed'; }
      finally { busy = false; render(); root.querySelector('#coverage-calendar-reason').focus({ preventScroll: true }); }
    });
    return { refresh: refresh };
  }
  return Object.freeze({ create: create, monthDays: monthDays, calendarWeeks: calendarWeeks, shiftMonth: shiftMonth, dayState: dayState });
}));
