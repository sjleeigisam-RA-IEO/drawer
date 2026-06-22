export const MODEL_VERSION = "ra-parametric-3d-reviewer/v0.1";

export const editableHeightFields = [
  { key: "floorToFloorHeight", label: "층고", min: 2, max: 18, step: 0.1 },
  { key: "slabDepth", label: "슬라브", min: 0.08, max: 1.2, step: 0.02 },
  { key: "finishedCeilingHeight", label: "천정고", min: 0, max: 12, step: 0.1 },
  { key: "clearHeight", label: "유효고", min: 0, max: 18, step: 0.1 },
  { key: "ceilingVoid", label: "천정속", min: 0, max: 2.5, step: 0.05 },
  { key: "beamDepth", label: "보", min: 0, max: 3, step: 0.05 }
];

export function cloneModel(model) {
  return structuredClone(model);
}

export function normalizeModel(model) {
  const normalized = cloneModel(model);
  normalized.version = normalized.version || MODEL_VERSION;
  normalized.scenarios = normalized.scenarios?.length
    ? normalized.scenarios
    : [{ id: "base", name: "현재안", overrides: {} }];
  return normalized;
}

export function getScenario(model, scenarioId) {
  return model.scenarios.find((scenario) => scenario.id === scenarioId) || model.scenarios[0];
}

export function getLevelValue(model, level, scenarioId, key) {
  const scenario = getScenario(model, scenarioId);
  const override = scenario.overrides?.levels?.[level.id]?.[key];
  return override ?? level[key] ?? 0;
}

export function setScenarioLevelValue(model, scenarioId, levelId, key, value) {
  const scenario = getScenario(model, scenarioId);
  scenario.overrides ||= {};
  scenario.overrides.levels ||= {};
  scenario.overrides.levels[levelId] ||= {};
  scenario.overrides.levels[levelId][key] = Number(value);
}

export function duplicateScenario(model, sourceScenarioId) {
  const source = getScenario(model, sourceScenarioId);
  const id = `scenario-${Date.now()}`;
  const scenario = {
    id,
    name: `${source.name} 복제`,
    overrides: structuredClone(source.overrides || {})
  };
  model.scenarios.push(scenario);
  return scenario;
}

export function expandLevels(model, scenarioId) {
  const expanded = [];
  let y = 0;

  for (const level of model.levels) {
    const count = Number(level.count || 1);
    for (let index = 0; index < count; index += 1) {
      const runtime = {
        ...level,
        sourceLevelId: level.id,
        instanceIndex: index,
        name: count > 1 ? `${level.name} ${index + 1}` : level.name,
        y,
        floorToFloorHeight: getLevelValue(model, level, scenarioId, "floorToFloorHeight"),
        finishedCeilingHeight: getLevelValue(model, level, scenarioId, "finishedCeilingHeight"),
        clearHeight: getLevelValue(model, level, scenarioId, "clearHeight"),
        slabDepth: getLevelValue(model, level, scenarioId, "slabDepth"),
        beamDepth: getLevelValue(model, level, scenarioId, "beamDepth"),
        ceilingVoid: getLevelValue(model, level, scenarioId, "ceilingVoid"),
        dockHeight: getLevelValue(model, level, scenarioId, "dockHeight")
      };
      expanded.push(runtime);
      y += runtime.floorToFloorHeight;
    }
  }

  return { expanded, totalHeight: y };
}

export function summarizeModel(model, scenarioId) {
  const { expanded, totalHeight } = expandLevels(model, scenarioId);
  const officeLevels = expanded.filter((level) => level.use === "office");
  const logisticsLevels = expanded.filter((level) => level.use === "logistics");
  const representativeLogisticsLevel = logisticsLevels.reduce(
    (selected, level) => (!selected || (level.clearHeight || 0) > (selected.clearHeight || 0) ? level : selected),
    null
  );
  const levelForHeight = officeLevels[0] || representativeLogisticsLevel || expanded[0];

  return {
    totalHeight,
    levelCount: expanded.length,
    representativeUse: levelForHeight?.use || "-",
    representativeCeiling: levelForHeight?.finishedCeilingHeight || 0,
    representativeClear: levelForHeight?.clearHeight || 0
  };
}
