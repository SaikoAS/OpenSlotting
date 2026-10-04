'use strict';

const csv = require('../../../../csv.js');

function definitions(sourceType) {
  return csv.getFieldDefinitionsForSource(sourceType, { includeLegacy: true });
}

function candidatesFor(catalog, sourceType) {
  const headers = catalog.map(column => column.header);
  // Alias-/Tokensystem ist die echte vorhandene Baseline. Profile bleiben
  // zunächst leer, damit ihre Wirkung separat sichtbar wird.
  return csv.buildMappingSuggestions(headers, [], { sourceType, includeLegacy: true });
}

function decorate(candidate, column) {
  return {
    targetField: candidate.targetField,
    position: column.position,
    sourceFileId: column.sourceFileId,
    header: column.header,
    occurrence: column.occurrence,
    score: candidate.score,
    reasons: candidate.reasons.slice(),
    automaticApplicationSafe: false
  };
}

// Variante A: nur exakte bekannte Aliase; kein unsichtbarer ERP-Vertrag.
function suggestByRules(catalog, sourceType = 'order-lines') {
  const baseline = candidatesFor(catalog, sourceType);
  return definitions(sourceType).map(definition => {
    const candidates = (baseline[definition.key] || [])
      .filter(candidate => candidate.reasons.includes('exact_alias'))
      .map(candidate => decorate(candidate, catalog[candidate.sourcePosition]));
    return finish(definition.key, candidates, 3);
  });
}

// Variante B: erklärbare Wertprofile + Alias-/Tokenpunkte, kein ML.
// Nichtlineare Semantik (GMenge vs Colli, netto vs brutto) ist NICHT aus
// Zahlenformaten ableitbar. Niedrige Evidenz bleibt Vorschlag/Unsicherheit.
function suggestWithProfiles(catalog, sourceType = 'order-lines', settings = {}) {
  const baseline = candidatesFor(catalog, sourceType);
  const topK = settings.topK === undefined ? 3 : settings.topK;
  if (!Number.isInteger(topK) || topK < 1 || topK > 20) throw new RangeError('topK must be 1..20');
  return definitions(sourceType).map(definition => {
    const headerScores = new Map((baseline[definition.key] || []).map(candidate => [candidate.sourcePosition, candidate]));
    const candidates = catalog.map((column, index) => {
      const header = headerScores.get(index) || { targetField: definition.key, score: 0, reasons: [] };
      const value = decorate(header, column);
      const profile = column.profile || {};
      const total = Number(profile.nonEmptyCount || 0);
      const numeric = ['decimal', 'scaled-quantity'].includes(definition.dataType);
      const expectedCount = definition.dataType === 'date' ? profile.dateCompatibleCount :
        numeric ? profile.numericCompatibleCount : profile.textCompatibleCount;
      const compatibility = total ? Number(expectedCount || 0) / total : null;
      value.profileRows = Number(profile.totalRows || 0);
      value.compatibility = compatibility;
      value.profileIsSample = Boolean(settings.profileIsSample);
      if (compatibility !== null && (numeric || definition.dataType === 'date')) {
        if (compatibility >= 0.95) {
          value.score += header.score === 100 ? 0 : 25;
          value.reasons.push(definition.dataType === 'date' ? 'date_format_support' : 'numeric_format_support');
        } else if (compatibility < 0.8 && header.score > 0) {
          value.score -= 55;
          value.reasons.push('value_type_conflicts_with_header');
        }
      }
      if (!total) value.reasons.push('no_nonempty_value_evidence');
      // Ein Datenprofil kann die fachliche Bedeutung nie alleine bestätigen.
      value.semanticEvidence = header.score > 0;
      value.noSemanticEvidence = header.score === 0;
      return value;
    }).filter(candidate => candidate.score > 0);
    return finish(definition.key, candidates, topK);
  });
}

function finish(field, candidates, topK) {
  candidates.sort((a, b) => b.score - a.score || a.position - b.position);
  const top = candidates[0];
  const margin = top && candidates[1] ? top.score - candidates[1].score : top ? top.score : 0;
  const conflicts = candidates.filter(candidate => top && candidate.score === top.score).map(candidate => candidate.position);
  const uncertain = !top || top.score < 90 || margin < 15 || top.noSemanticEvidence === true ||
    top.reasons.includes('value_type_conflicts_with_header') || top.reasons.includes('no_nonempty_value_evidence');
  return {
    targetField: field, topK: candidates.slice(0, topK), uncertain,
    confidence: uncertain ? 'review' : 'strong-suggestion', margin,
    conflictingPositions: conflicts.length > 1 ? conflicts : [],
    requiresUserConfirmation: true, automaticApplicationSafe: false
  };
}

module.exports = { suggestByRules, suggestWithProfiles };
