(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OpenSlottingImportProfileBatch = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function evaluate(model, profile, file, customFields) {
    if (!file.parsed || file.reading || file.errorKey) return { status: 'unavailable', plan: null };
    if (!profile) return { status: 'no-profile', plan: null };
    // A bulk operation never silently reclassifies movement data as master data.
    if ((file.sourceType || 'order-lines') !== profile.sourceType) return { status: 'source-type', plan: null };
    const plan = model.planImportProfile(profile, file, customFields);
    return { status: plan.compatible ? 'compatible' : 'conflict', plan: plan };
  }

  function fingerprint(profile, files, ids, customFields) {
    const wanted = new Set(ids);
    return JSON.stringify([profile, customFields, files.filter(function (file) { return wanted.has(file.id); }).map(function (file) {
      return [file.id, file.headers, file.sourceType, Boolean(file.parsed), Boolean(file.reading), file.errorKey,
        file.mapping, file.customFieldMapping, file.preparationRules, file.sourceRules,
        file.confirmedMapping, file.confirmedCustomFieldMapping, file.appliedImportProfile];
    }), Array.from(wanted).sort()]);
  }

  function prepare(model, profile, files, ids, customFields) {
    if (!profile) throw new Error('profile-required');
    const wanted = new Set(ids);
    const items = files.filter(function (file) { return wanted.has(file.id); }).map(function (file) {
      return Object.assign({ id: file.id, label: file.label, previousFields: Object.values(file.mapping || {}).filter(Number.isInteger).length +
        Object.values(file.customFieldMapping || {}).filter(Number.isInteger).length,
        previousRules: model.countAccessiblePreparationRules(file.preparationRules, file.mapping, file.customFieldMapping, customFields) + (file.sourceRules || []).length },
      evaluate(model, profile, file, customFields));
    });
    if (items.length !== wanted.size) throw new Error('stale-preview');
    return { profileId: profile.id, ids: Array.from(wanted), items: items,
      fingerprint: fingerprint(profile, files, ids, customFields) };
  }

  function apply(model, profile, files, preview, customFields) {
    if (!profile || profile.id !== preview.profileId ||
        preview.fingerprint !== fingerprint(profile, files, preview.ids, customFields)) throw new Error('stale-preview');
    // Replan against the live inputs; never trust a stale or mutated preview plan.
    const fresh = prepare(model, profile, files, preview.ids, customFields);
    const plans = new Map(fresh.items.filter(function (item) { return item.status === 'compatible'; }).map(function (item) { return [item.id, item.plan]; }));
    if (!plans.size) throw new Error('no-compatible-imports');
    const now = new Date().toISOString();
    return {
      applied: plans.size,
      skipped: fresh.items.length - plans.size,
      files: files.map(function (file) {
        const plan = plans.get(file.id);
        if (!plan) return file;
        const updated = Object.assign({}, file, { sourceType: plan.sourceType,
          mapping: Object.assign({}, plan.mapping), customFieldMapping: Object.assign({}, plan.customFieldMapping),
          preparationRules: model.normalizePreparationRules(plan.preparationRules),
          sourceRules: model.normalizeSourceRules(plan.sourceRules, file.headers.length),
          confirmedMapping: null, confirmedCustomFieldMapping: null });
        updated.appliedImportProfile = model.recordImportProfileApplication(profile, updated, { now: now });
        return updated;
      })
    };
  }
  return Object.freeze({ evaluate: evaluate, fingerprint: fingerprint, prepare: prepare, apply: apply });
}));
