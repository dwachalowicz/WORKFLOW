// ───────── Version diff comparison utilities ─────────
// Extracted from VersionHistoryPanel to follow SRP

export interface NodeChange {
  nodeLabel: string;
  details: string[];
}

export interface EdgeChange {
  edgeLabel: string;
  details: string[];
}

export interface DiffResult {
  versionLabel: string;
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesChanged: NodeChange[];
  edgesAdded: string[];
  edgesRemoved: string[];
  edgesChanged: EdgeChange[];
}

function comparePersonList(current: Record<string, unknown>[], version: Record<string, unknown>[], label: string, t: (k: string) => string): string[] {
  const diffs: string[] = [];
  const currentNames = (current || []).map((p: Record<string, unknown>) => p.name || p.id).sort();
  const versionNames = (version || []).map((p: Record<string, unknown>) => p.name || p.id).sort();
  if (JSON.stringify(currentNames) !== JSON.stringify(versionNames)) {
    const added = currentNames.filter((n: string) => !versionNames.includes(n));
    const removed = versionNames.filter((n: string) => !currentNames.includes(n));
    if (added.length > 0) diffs.push(`${label}: ${t('versions.added')} ${added.join(', ')}`);
    if (removed.length > 0) diffs.push(`${label}: ${t('versions.removed')} ${removed.join(', ')}`);
    if (added.length === 0 && removed.length === 0 && currentNames.length === versionNames.length) {
      diffs.push(`${label}: ${t('versions.orderChanged')}`);
    }
  }
  return diffs;
}

function compareChecklist(current: Record<string, unknown>[], version: Record<string, unknown>[], t: (k: string) => string): string[] {
  const diffs: string[] = [];
  const c = current || [];
  const v = version || [];
  if (c.length !== v.length) {
    diffs.push(`${t('versions.checklist')}: ${c.length} ${t('versions.items')} (${t('versions.was')} ${v.length})`);
  }
  const cLabels = c.map((x: Record<string, unknown>) => x.label).sort();
  const vLabels = v.map((x: Record<string, unknown>) => x.label).sort();
  if (JSON.stringify(cLabels) !== JSON.stringify(vLabels)) {
    const added = cLabels.filter((l: string) => !vLabels.includes(l));
    const removed = vLabels.filter((l: string) => !cLabels.includes(l));
    if (added.length > 0) diffs.push(`${t('versions.checklistAdded')}: ${added.join(', ')}`);
    if (removed.length > 0) diffs.push(`${t('versions.checklistRemoved')}: ${removed.join(', ')}`);
  }
  // Check required flag changes
  const cMap = new Map(c.map((x: Record<string, unknown>) => [x.label, x.required]));
  const vMap = new Map(v.map((x: Record<string, unknown>) => [x.label, x.required]));
  for (const [label, req] of cMap.entries()) {
    if (vMap.has(label) && vMap.get(label) !== req) {
      diffs.push(`${t('versions.checklist')} "${label}": ${t('versions.checklistRequired')} ${req ? `→ ${t('common.yes')}` : `→ ${t('common.no')}`}`);
    }
  }
  return diffs;
}

function compareVariables(current: Record<string, unknown>[], version: Record<string, unknown>[], t: (k: string) => string): string[] {
  const diffs: string[] = [];
  const c = current || [];
  const v = version || [];
  if (c.length !== v.length) {
    diffs.push(`${t('versions.variables')}: ${c.length} (${t('versions.was')} ${v.length})`);
  }
  const cNames = c.map((x: Record<string, unknown>) => x.name).sort();
  const vNames = v.map((x: Record<string, unknown>) => x.name).sort();
  const added = cNames.filter((n: string) => !vNames.includes(n));
  const removed = vNames.filter((n: string) => !cNames.includes(n));
  if (added.length > 0) diffs.push(`${t('versions.variablesAdded')}: ${added.join(', ')}`);
  if (removed.length > 0) diffs.push(`${t('versions.variablesRemoved')}: ${removed.join(', ')}`);
  // Check type changes for variables that exist in both
  const cMap = new Map(c.map((x: Record<string, unknown>) => [x.name, x]));
  const vMap = new Map(v.map((x: Record<string, unknown>) => [x.name, x]));
  for (const [name, cv] of cMap.entries()) {
    const vv = vMap.get(name);
    if (vv) {
      if (cv.type !== vv.type) diffs.push(`${t('versions.variable')} "${name}": ${t('versions.type')} ${vv.type} → ${cv.type}`);
      if (cv.required !== vv.required) diffs.push(`${t('versions.variable')} "${name}": ${t('versions.required')} ${vv.required ? t('common.yes') : t('common.no')} → ${cv.required ? t('common.yes') : t('common.no')}`);
    }
  }
  return diffs;
}

/**
 * Deeply compares two node versions and extracts all meaningful changes.
 * Used for building audit trails and version history visual diffs.
 * 
 * @param current - The current node data
 * @param version - The older node version data to compare against
 * @param t - Translation function for localization
 * @returns An array of localized strings describing the differences
 */
export function deepCompareNode(current: Record<string, unknown>, version: Record<string, unknown>, t: (k: string) => string): string[] {
  const diffs: string[] = [];
  const cd = (current.data as Record<string, unknown>) || {};
  const vd = (version.data as Record<string, unknown>) || {};

  // Label
  if ((cd.label || '') !== (vd.label || '')) {
    diffs.push(`${t('versions.name')}: "${vd.label || `(${t('versions.none')})`}" → "${cd.label || `(${t('versions.none')})`}"`);
  }
  // Description
  if ((cd.description || '') !== (vd.description || '')) {
    diffs.push(`${t('versions.description')}: ${t('versions.changed')}`);
  }
  // SLA
  const cSla = cd.maxDuration ?? '';
  const vSla = vd.maxDuration ?? '';
  if (String(cSla) !== String(vSla)) {
    diffs.push(`SLA: ${vSla || `(${t('versions.none')})`} → ${cSla || `(${t('versions.none')})`}`);
  }
  const cUnit = cd.maxDurationUnit || 'h';
  const vUnit = vd.maxDurationUnit || 'h';
  if (cUnit !== vUnit && (cSla || vSla)) {
    diffs.push(`SLA ${t('versions.unit')}: ${vUnit} → ${cUnit}`);
  }
  // Cost
  const cCost = cd.cost ?? '';
  const vCost = vd.cost ?? '';
  if (String(cCost) !== String(vCost)) {
    diffs.push(`${t('versions.cost')}: ${vCost || `(${t('versions.none')})`} → ${cCost || `(${t('versions.none')})`} PLN`);
  }
  // External link
  if ((cd.externalLink || '') !== (vd.externalLink || '')) {
    diffs.push(`${t('versions.extLink')}: ${t('versions.changed')}`);
  }
  // Trigger type (start nodes) — legacy single + new multi
  const cTriggerTypes = (cd.triggerTypes as string[]) || (cd.triggerType ? [cd.triggerType as string] : []);
  const vTriggerTypes = (vd.triggerTypes as string[]) || (vd.triggerType ? [vd.triggerType as string] : []);
  if (JSON.stringify([...cTriggerTypes].sort()) !== JSON.stringify([...vTriggerTypes].sort())) {
    diffs.push(`${t('versions.trigger')}: "${vTriggerTypes.join(', ') || 'manual'}" → "${cTriggerTypes.join(', ') || 'manual'}"`);
  }
  // Action type (stop nodes) — legacy single + new multi
  const cActionTypes = (cd.actionTypes as string[]) || (cd.actionType ? [cd.actionType as string] : []);
  const vActionTypes = (vd.actionTypes as string[]) || (vd.actionType ? [vd.actionType as string] : []);
  if (JSON.stringify([...cActionTypes].sort()) !== JSON.stringify([...vActionTypes].sort())) {
    diffs.push(`${t('versions.finalAction')}: "${vActionTypes.join(', ') || 'none'}" → "${cActionTypes.join(', ') || 'none'}"`);
  }
  // Enter actions (standard nodes)
  const cEnterActions = (cd.enterActionTypes as string[]) || [];
  const vEnterActions = (vd.enterActionTypes as string[]) || [];
  if (JSON.stringify([...cEnterActions].sort()) !== JSON.stringify([...vEnterActions].sort())) {
    diffs.push(`${t('versions.enterAction')}: "${vEnterActions.join(', ') || 'none'}" → "${cEnterActions.join(', ') || 'none'}"`);
  }
  // Exit actions (standard nodes)
  const cExitActions = (cd.exitActionTypes as string[]) || [];
  const vExitActions = (vd.exitActionTypes as string[]) || [];
  if (JSON.stringify([...cExitActions].sort()) !== JSON.stringify([...vExitActions].sort())) {
    diffs.push(`${t('versions.exitAction')}: "${vExitActions.join(', ') || 'none'}" → "${cExitActions.join(', ') || 'none'}"`);
  }
  // Target workflow (subworkflow nodes)
  if ((cd.targetWorkflowId || '') !== (vd.targetWorkflowId || '')) {
    diffs.push(`${t('versions.subprocess')}: ${t('versions.changed')}`);
  }
  // Target node inside subworkflow
  if ((cd.targetNodeId || '') !== (vd.targetNodeId || '')) {
    const cTargetNode = cd.targetNodeLabel || cd.targetNodeId || t('versions.none');
    const vTargetNode = vd.targetNodeLabel || vd.targetNodeId || t('versions.none');
    diffs.push(`${t('versions.targetNode')}: "${vTargetNode}" → "${cTargetNode}"`);
  }
  // Editors
  diffs.push(...comparePersonList(cd.editors as Record<string, unknown>[], vd.editors as Record<string, unknown>[], t('versions.editors'), t));
  // Readers
  diffs.push(...comparePersonList(cd.readers as Record<string, unknown>[], vd.readers as Record<string, unknown>[], t('versions.readers'), t));
  // Checklist
  diffs.push(...compareChecklist(cd.checklist as Record<string, unknown>[], vd.checklist as Record<string, unknown>[], t));
  // Variables
  diffs.push(...compareVariables(cd.variables as Record<string, unknown>[], vd.variables as Record<string, unknown>[], t));
  // Rotation
  const cRot = (cd.rotation as number) || 0;
  const vRot = (vd.rotation as number) || 0;
  if (cRot !== vRot) {
    diffs.push(`${t('versions.rotation')}: ${vRot}° → ${cRot}°`);
  }
  // Position changes (big moves only, >50px)
  const cPos = (current.position as Record<string, number>) || {};
  const vPos = (version.position as Record<string, number>) || {};
  const dx = Math.abs((cPos.x || 0) - (vPos.x || 0));
  const dy = Math.abs((cPos.y || 0) - (vPos.y || 0));
  if (dx > 50 || dy > 50) {
    diffs.push(`${t('versions.position')}: ${t('versions.moved')}`);
  }

  // Enter email groups
  diffs.push(...comparePersonList(cd.enterEmailGroups as Record<string, unknown>[], vd.enterEmailGroups as Record<string, unknown>[], t('versions.enterEmailGroups'), t));
  // Exit email groups
  diffs.push(...comparePersonList(cd.exitEmailGroups as Record<string, unknown>[], vd.exitEmailGroups as Record<string, unknown>[], t('versions.exitEmailGroups'), t));

  return diffs;
}

/**
 * Deeply compares two edge versions to detect changes in connections, conditions, or rules.
 * 
 * @param current - The current edge data
 * @param version - The older edge version data to compare against
 * @param allCurrentNodes - All current nodes (used to resolve source/target labels)
 * @param allVersionNodes - All older version nodes (used to resolve source/target labels)
 * @param t - Translation function for localization
 * @returns An array of localized strings describing the differences
 */
export function deepCompareEdge(current: Record<string, unknown>, version: Record<string, unknown>, allCurrentNodes: Record<string, unknown>[], allVersionNodes: Record<string, unknown>[], t: (k: string) => string): string[] {
  const diffs: string[] = [];
  const cd = (current.data as Record<string, unknown>) || {};
  const vd = (version.data as Record<string, unknown>) || {};

  // Label
  const cLabel = cd.customText ?? (current.label as string) ?? '';
  const vLabel = vd.customText ?? (version.label as string) ?? '';
  if (cLabel !== vLabel) {
    diffs.push(`${t('versions.label')}: "${vLabel || t('versions.none')}" → "${cLabel || t('versions.none')}"`);
  }
  // Condition type
  const cCondType = cd.conditionType || 'text';
  const vCondType = vd.conditionType || 'text';
  if (cCondType !== vCondType) {
    diffs.push(`${t('versions.conditionType')}: ${vCondType} → ${cCondType}`);
  }
  // Rule combinator
  if ((cd.ruleCombinator || '') !== (vd.ruleCombinator || '') && (cCondType === 'rule' || vCondType === 'rule')) {
    diffs.push(`${t('versions.ruleCombinator')}: ${vd.ruleCombinator || 'AND'} → ${cd.ruleCombinator || 'AND'}`);
  }
  // Rules deep compare
  const cRules = cd.rules || [];
  const vRules = vd.rules || [];
  if (JSON.stringify(cRules) !== JSON.stringify(vRules)) {
    if (cRules.length !== vRules.length) {
      diffs.push(`${t('versions.rules')}: ${cRules.length} (${t('versions.was')} ${vRules.length})`);
    } else {
      diffs.push(`${t('versions.rules')}: ${t('versions.conditionsChanged')}`);
    }
  }
  // Database operation (db edges)
  const cDbOp = cd.dbOperation as string | undefined;
  const vDbOp = vd.dbOperation as string | undefined;
  if ((cDbOp || '') !== (vDbOp || '')) {
    diffs.push(`${t('versions.dbOperation')}: "${vDbOp || 'read'}" → "${cDbOp || 'read'}"`);
  }
  // Decision makers on edge
  diffs.push(...comparePersonList(cd.decisionMakers as Record<string, unknown>[], vd.decisionMakers as Record<string, unknown>[], t('versions.decisionMakers'), t));
  // Source/target changed
  if (current.source !== version.source) {
    const csrc = allCurrentNodes.find((n: Record<string, unknown>) => n.id === current.source);
    const vsrc = allVersionNodes.find((n: Record<string, unknown>) => n.id === version.source);
    const csrcData = csrc?.data as Record<string, unknown> | undefined;
    const vsrcData = vsrc?.data as Record<string, unknown> | undefined;
    diffs.push(`${t('versions.source')}: "${vsrcData?.label || version.source}" → "${csrcData?.label || current.source}"`);
  }
  if (current.target !== version.target) {
    const ctgt = allCurrentNodes.find((n: Record<string, unknown>) => n.id === current.target);
    const vtgt = allVersionNodes.find((n: Record<string, unknown>) => n.id === version.target);
    const ctgtData = ctgt?.data as Record<string, unknown> | undefined;
    const vtgtData = vtgt?.data as Record<string, unknown> | undefined;
    diffs.push(`${t('versions.target')}: "${vtgtData?.label || version.target}" → "${ctgtData?.label || current.target}"`);
  }

  return diffs;
}
