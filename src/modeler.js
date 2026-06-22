import * as THREE from "three";
import { expandLevels, summarizeModel } from "./schema.js";

const materials = {
  slab: new THREE.MeshStandardMaterial({
    color: "#b9c2ca",
    emissive: "#1c242b",
    emissiveIntensity: 0.08,
    roughness: 0.82
  }),
  wall: new THREE.MeshStandardMaterial({ color: "#d7d4ca", roughness: 0.76 }),
  glass: new THREE.MeshStandardMaterial({
    color: "#d3d8d8",
    transparent: true,
    opacity: 0.16,
    roughness: 0.86,
    metalness: 0,
    depthWrite: false
  }),
  core: new THREE.MeshStandardMaterial({ color: "#b68b62", roughness: 0.7 }),
  column: new THREE.MeshStandardMaterial({ color: "#e6e2d6", roughness: 0.7 }),
  beam: new THREE.MeshStandardMaterial({
    color: "#6f8090",
    emissive: "#111820",
    emissiveIntensity: 0.08,
    roughness: 0.78
  }),
  ceiling: new THREE.MeshStandardMaterial({
    color: "#f4dda2",
    emissive: "#5d4814",
    emissiveIntensity: 0.16,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  }),
  serviceVoid: new THREE.MeshStandardMaterial({
    color: "#a7d8ff",
    emissive: "#113d62",
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide
  }),
  duct: new THREE.MeshStandardMaterial({
    color: "#7ff7d4",
    emissive: "#0f5a4c",
    emissiveIntensity: 0.34,
    roughness: 0.42
  }),
  pipe: new THREE.MeshStandardMaterial({
    color: "#ff7568",
    emissive: "#4a1613",
    emissiveIntensity: 0.2,
    roughness: 0.42
  }),
  shaft: new THREE.MeshStandardMaterial({
    color: "#1f2933",
    transparent: true,
    opacity: 0.76,
    roughness: 0.7
  }),
  clearVolume: new THREE.MeshStandardMaterial({
    color: "#e5b85c",
    transparent: true,
    opacity: 0.13,
    side: THREE.DoubleSide
  }),
  dock: new THREE.MeshStandardMaterial({ color: "#36404b", roughness: 0.8 }),
  rack: new THREE.MeshStandardMaterial({ color: "#d49a4b", roughness: 0.65 }),
  cutPlane: new THREE.MeshStandardMaterial({
    color: "#e06d5f",
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide
  })
};

const edgeMaterials = {
  service: new THREE.LineBasicMaterial({ color: "#dffff6", transparent: true, opacity: 0.96 }),
  core: new THREE.LineBasicMaterial({ color: "#e5a85f", transparent: true, opacity: 0.86 }),
  beam: new THREE.LineBasicMaterial({ color: "#d5e4ef", transparent: true, opacity: 0.86 }),
  dimension: new THREE.LineBasicMaterial({ color: "#f4d074", transparent: true, opacity: 0.9 })
};

export function createReviewModel(model, scenarioId, options = {}) {
  const root = new THREE.Group();
  root.name = `${model.name}:${scenarioId}`;

  const { expanded, totalHeight } = expandLevels(model, scenarioId);
  const plan = model.plan;
  root.userData.camera = plan.camera;
  const focusedLevel = options.focusLevelActive ? selectFocusedExpandedLevel(expanded, options.labelLevelId) : null;
  const renderExpanded = focusedLevel ? [focusedLevel] : expanded;

  if (options.planView) {
    const planLevel = focusedLevel || selectPlanViewLevel(expanded, options.labelLevelId);
    addLevel(
      root,
      plan,
      {
        ...planLevel,
        y: 0,
        floorToFloorHeight: Math.min(planLevel.floorToFloorHeight || 3.5, 3.5),
        slabDepth: 0.12
      },
      plan.depth,
      0,
      {
        ...options,
        section: false,
        showCeilings: false,
        planView: true
      }
    );
    const outline = getOutline(plan, 0);
    if (outline) addFootprintGuide(root, outline, 0.6);
    attachPlanLevelFocusTargets(root, expanded, groupExpandedLevels(expanded), plan, plan.depth);
    root.userData.metrics = summarizeModel(model, scenarioId);
    root.userData.planView = true;
    return root;
  }

  const sectionDepth = options.section ? plan.depth * 0.56 : plan.depth;
  const sectionOffset = options.section ? -(plan.depth - sectionDepth) / 2 : 0;

  for (const level of renderExpanded) {
    addLevel(root, plan, level, sectionDepth, sectionOffset, options);
  }

  if (!focusedLevel) {
    addRoof(root, plan, totalHeight, sectionDepth, sectionOffset);
  }

  if (model.buildingType === "logistics") {
    const primaryLogisticsLevel =
      (focusedLevel?.use === "logistics" ? focusedLevel : null) ||
      expanded.find((level) => level.use === "logistics" && (level.clearHeight || 0) >= 5) ||
      expanded.find((level) => level.use === "logistics") ||
      expanded[0];
    if (primaryLogisticsLevel?.use === "logistics") {
      addLogisticsDetails(root, plan, primaryLogisticsLevel, options);
    }
  }

  if (options.section && !focusedLevel) {
    addCutPlane(root, plan, totalHeight);
  }

  attachLevelFocusTargets(root, expanded, groupExpandedLevels(expanded), plan, sectionDepth, sectionOffset);
  root.userData.metrics = summarizeModel(model, scenarioId);
  return root;
}

function addLevel(root, plan, level, depth, zOffset, options) {
  const width = plan.width;
  const y = level.y;
  const h = level.floorToFloorHeight;
  const slabDepth = Math.max(level.slabDepth || 0.25, 0.08);
  const outline = getOutline(plan, zOffset);
  const slabInfo = createSpaceHoverInfo(plan, level);
  const upperSlabInfo = createSlabHoverInfo(plan, level, "상부 슬라브");

  if (outline) {
    addShapeSlab(root, outline, slabDepth, y, materials.slab, "slab", slabInfo);
  } else {
    addBox(root, width, slabDepth, depth, 0, y + slabDepth / 2, zOffset, materials.slab, "slab", slabInfo);
  }

  if (options.showStructure) {
    addColumns(root, plan, level, depth, zOffset);
    if (level.use !== "logistics") {
      addCore(root, plan, level, depth, zOffset, options);
    }
  }

  addPerimeter(root, plan, level, depth, zOffset, options.section);
  addPlanFeatures(root, plan, level, zOffset);

  if (options.showCeilings) {
    addHeightVolume(root, plan, level, depth, zOffset);
  }

  if (options.showServices) {
    addInteriorServiceLayer(root, plan, level, depth, zOffset, options);
  }

  if (level.use === "logistics") {
    addDockWall(root, plan, level, depth, zOffset);
  }

  if (level.use === "office") {
    addOfficeWorkplane(root, plan, level, depth, zOffset);
  }

  if (options.planView) return;

  if (outline) {
    addShapeSlab(root, outline, slabDepth, y + h - slabDepth, materials.slab, "upper-slab", upperSlabInfo);
  } else {
    addBox(root, width, slabDepth, depth, 0, y + h - slabDepth / 2, zOffset, materials.slab, "upper-slab", upperSlabInfo);
  }
}

function selectPlanViewLevel(expanded, selectedLevelId) {
  const representativeLogisticsLevel = expanded
    .filter((level) => level.use === "logistics")
    .reduce(
      (selected, level) =>
        !selected || (level.clearHeight || 0) > (selected.clearHeight || 0) ? level : selected,
      null
    );
  return (
    expanded.find((level) => level.sourceLevelId === selectedLevelId) ||
    expanded.find((level) => level.use === "office") ||
    representativeLogisticsLevel ||
    expanded.find((level) => level.use !== "parking") ||
    expanded[0]
  );
}

function selectFocusedExpandedLevel(expanded, selectedLevelId) {
  if (!selectedLevelId) return null;
  const [sourceLevelId, instanceIndex] = String(selectedLevelId).split(":");
  if (instanceIndex !== undefined) {
    const selectedIndex = Number(instanceIndex);
    return (
      expanded.find(
        (level) => level.sourceLevelId === sourceLevelId && level.instanceIndex === selectedIndex
      ) || null
    );
  }
  return expanded.find((level) => level.sourceLevelId === sourceLevelId) || null;
}

function createSpaceHoverInfo(plan, level) {
  return {
    title: `공간 · ${hoverLevelName(level)}`,
    accent: "#55c2a5",
    priority: 1,
    rows: [
      { label: "1개층 바닥면적", value: formatArea(planFloorArea(plan)) },
      { label: "용도", value: useTypeLabel(level.use) },
      { label: "층고", value: formatMeters(level.floorToFloorHeight) },
      { label: "슬라브", value: formatMeters(level.slabDepth) },
      { label: "천정고", value: formatMeters(level.finishedCeilingHeight) },
      { label: "유효고", value: formatMeters(level.clearHeight) },
      { label: "천정속", value: formatMeters(level.ceilingVoid) }
    ]
  };
}

function createSlabHoverInfo(plan, level, title) {
  return {
    title: `${title} · ${hoverLevelName(level)}`,
    accent: "#b9c2ca",
    priority: 2,
    rows: [
      { label: "슬라브 두께", value: formatMeters(level.slabDepth) },
      { label: "1개층 바닥면적", value: formatArea(planFloorArea(plan)) },
      { label: "층고", value: formatMeters(level.floorToFloorHeight) }
    ]
  };
}

function createColumnHoverInfo(plan, level, size, height) {
  const spacing = gridSpacing(plan);
  return {
    title: `기둥 · ${hoverLevelName(level)}`,
    accent: "#e6e2d6",
    priority: 5,
    rows: [
      { label: "기둥 크기", value: `${formatMeters(size)} x ${formatMeters(size)}` },
      { label: "기둥 높이", value: formatMeters(height) },
      { label: "X방향 간격", value: spacing.x },
      { label: "Y방향 간격", value: spacing.z },
      { label: "층고", value: formatMeters(level.floorToFloorHeight) }
    ]
  };
}

function createCoreHoverInfo(plan, level) {
  const core = plan.core;
  if (!core) return null;
  return {
    title: `코어 · ${hoverLevelName(level)}`,
    accent: "#e5a85f",
    priority: 4,
    rows: [
      { label: "코어 크기", value: `${formatMeters(core.width)} x ${formatMeters(core.depth)}` },
      { label: "층 높이", value: formatMeters(level.floorToFloorHeight - (level.slabDepth || 0.25)) },
      { label: "EV / ST / MEP", value: `${core.elevators || 0} / ${core.stairs || 0} / ${core.risers || 0}` }
    ]
  };
}

function createCeilingHoverInfo(level) {
  return {
    title: `텍스/천장면 · ${hoverLevelName(level)}`,
    accent: "#f4dda2",
    priority: 3,
    rows: [
      { label: "천정고", value: formatMeters(level.finishedCeilingHeight) },
      { label: "유효고", value: formatMeters(level.clearHeight) },
      { label: "천정속", value: formatMeters(level.ceilingVoid) },
      { label: "슬라브", value: formatMeters(level.slabDepth) }
    ]
  };
}

function createServiceVoidHoverInfo(level, voidHeight) {
  return {
    title: `천정속 공간 · ${hoverLevelName(level)}`,
    accent: "#a7d8ff",
    priority: 2,
    rows: [
      { label: "천정속 높이", value: formatMeters(voidHeight) },
      { label: "천정고", value: formatMeters(level.finishedCeilingHeight) },
      { label: "상부 보 깊이", value: formatMeters(level.beamDepth) }
    ]
  };
}

function createServiceHoverInfo(level, name, width, height, depth) {
  const title = name.includes("pipe")
    ? "배관"
    : name.includes("riser")
      ? "MEP 라이저"
      : "덕트";
  return {
    title: `${title} · ${hoverLevelName(level)}`,
    accent: name.includes("pipe") ? "#ff7568" : "#7ff7d4",
    priority: 6,
    rows: [
      { label: "크기", value: `${formatMeters(width)} x ${formatMeters(depth)} x ${formatMeters(height)}` },
      { label: "설치 높이", value: formatMeters(level.finishedCeilingHeight + (level.slabDepth || 0.25)) },
      { label: "천정속", value: formatMeters(level.ceilingVoid) }
    ]
  };
}

function createBeamHoverInfo(plan, level, width, height, depth) {
  const spacing = gridSpacing(plan);
  return {
    title: `보/구조 프레임 · ${hoverLevelName(level)}`,
    accent: "#d5e4ef",
    priority: 4,
    rows: [
      { label: "보 크기", value: `${formatMeters(width)} x ${formatMeters(depth)} x ${formatMeters(height)}` },
      { label: "보 깊이", value: formatMeters(level.beamDepth) },
      { label: "X방향 기둥간격", value: spacing.x },
      { label: "Y방향 기둥간격", value: spacing.z }
    ]
  };
}

function createGenericHoverInfo(title, rows, accent = "#55c2a5", priority = 2) {
  return { title, rows, accent, priority };
}

function attachHoverInfo(object, info) {
  if (!object || !info) return object;
  object.userData.hoverInfo = info;
  return object;
}

function hoverLevelName(level) {
  const raw = String(level?.name || "-");
  const repeated = /^(\d+)F-(\d+)F\s+(\d+)$/i.exec(raw);
  if (repeated) {
    const floor = Number(repeated[1]) + Number(repeated[3]) - 1;
    if (floor <= Number(repeated[2])) return `${floor}F`;
  }
  return raw;
}

function useTypeLabel(use) {
  if (use === "office") return "업무";
  if (use === "retail") return "리테일";
  if (use === "parking") return "주차";
  if (use === "logistics") return "물류";
  return use || "-";
}

function gridSpacing(plan) {
  return {
    x: averageSpacingLabel(plan.gridX),
    z: averageSpacingLabel(plan.gridZ)
  };
}

function averageSpacingLabel(values = []) {
  const sorted = [...values].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length < 2) return "-";
  const diffs = [];
  for (let index = 1; index < sorted.length; index += 1) {
    diffs.push(Math.abs(sorted[index] - sorted[index - 1]));
  }
  const average = diffs.reduce((sum, value) => sum + value, 0) / diffs.length;
  return `약 ${formatMeters(average)}`;
}

function planFloorArea(plan) {
  if (Array.isArray(plan.outline) && plan.outline.length >= 3) return polygonArea(plan.outline);
  return Number(plan.width || 0) * Number(plan.depth || 0);
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, z1] = points[index];
    const [x2, z2] = points[(index + 1) % points.length];
    area += x1 * z2 - x2 * z1;
  }
  return Math.abs(area) / 2;
}

function formatArea(value) {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(1).replace(/\.0$/, "")}m2`;
}

function addColumns(root, plan, level, depth, zOffset) {
  const size = plan.columnSize || 0.7;
  const height = Math.max(level.clearHeight || level.floorToFloorHeight - level.slabDepth, 0.5);
  const baseY = level.y + (level.slabDepth || 0.25);
  const maxZ = depth / 2;
  const minZ = -depth / 2;
  const outline = getOutline(plan, zOffset);
  const hoverInfo = createColumnHoverInfo(plan, level, size, height);

  for (const x of plan.gridX || []) {
    for (const z of plan.gridZ || []) {
      if (z < minZ || z > maxZ) continue;
      if (outline && !pointInPolygon([x, z + zOffset], outline)) continue;
      addBox(
        root,
        size,
        height,
        size,
        x,
        baseY + height / 2,
        z + zOffset,
        materials.column,
        "column",
        hoverInfo
      );
    }
  }
}

function addCore(root, plan, level, depth, zOffset, options = {}) {
  if (!plan.core) return;
  const core = plan.core;
  if (Math.abs(core.z) > depth / 2) return;
  if (options.planView) {
    addCorePlanDetails(root, plan, level, zOffset);
    return;
  }
  const height = level.floorToFloorHeight - (level.slabDepth || 0.25);
  addBox(
    root,
    core.width,
    height,
    Math.min(core.depth, depth),
    core.x,
    level.y + (level.slabDepth || 0.25) + height / 2,
    core.z + zOffset,
    materials.core,
    "core",
    createCoreHoverInfo(plan, level)
  );
  if (options.section) {
    addCoreVerticalShafts(root, plan, level, zOffset);
  }
}

function addPerimeter(root, plan, level, depth, zOffset, section) {
  const outline = getOutline(plan, zOffset);
  const wall = plan.perimeterWallThickness || 0.3;
  const height = Math.max(level.floorToFloorHeight - (level.slabDepth || 0.25), 0.5);
  const y = level.y + (level.slabDepth || 0.25) + height / 2;
  if (outline) {
    for (let index = 0; index < outline.length; index += 1) {
      const start = outline[index];
      const end = outline[(index + 1) % outline.length];
      addWallSegment(root, start, end, wall, height, y, materials.glass, "facade");
    }
    return;
  }
  const zFront = zOffset + depth / 2 - wall / 2;
  const zBack = zOffset - depth / 2 + wall / 2;

  addBox(root, plan.width, height, wall, 0, y, zBack, materials.glass, "facade");
  if (!section) {
    addBox(root, plan.width, height, wall, 0, y, zFront, materials.glass, "facade");
  }
  addBox(root, wall, height, depth, -plan.width / 2 + wall / 2, y, zOffset, materials.wall, "wall");
  addBox(root, wall, height, depth, plan.width / 2 - wall / 2, y, zOffset, materials.wall, "wall");
}

function addHeightVolume(root, plan, level, depth, zOffset) {
  const outline = getOutline(plan, zOffset, 0.8);
  const usableHeight =
    level.use === "logistics"
      ? level.clearHeight
      : level.finishedCeilingHeight || level.clearHeight || 0;
  if (!usableHeight) return;

  const baseY = level.y + (level.slabDepth || 0.25);
  const ceilingInfo = createCeilingHoverInfo(level);
  if (outline) {
    addShapeSlab(root, outline, usableHeight, baseY, materials.clearVolume, "usable-volume");
    if (level.use !== "logistics") {
      addShapePlane(root, outline, baseY + usableHeight, materials.ceiling, "ceiling-plane", ceilingInfo);
    }
    return;
  }

  addBox(
    root,
    plan.width - 1.4,
    usableHeight,
    depth - 1.4,
    0,
    baseY + usableHeight / 2,
    zOffset,
    materials.clearVolume,
    "usable-volume"
  );

  if (level.use !== "logistics") {
    addPlane(
      root,
      plan.width - 1.2,
      depth - 1.2,
      0,
      baseY + usableHeight,
      zOffset,
      materials.ceiling,
      "ceiling-plane",
      ceilingInfo
    );
  }
}

function addInteriorServiceLayer(root, plan, level, depth, zOffset, options) {
  if (level.use === "logistics") {
    addLogisticsServiceLayer(root, plan, level, depth, zOffset, options);
    return;
  }
  if (options.planView) {
    addPlanServiceRoute(root, plan, level, zOffset);
    return;
  }
  const slabDepth = Math.max(level.slabDepth || 0.25, 0.08);
  const beamDepth = Math.max(level.beamDepth || 0, 0);
  const finishedCeiling = level.finishedCeilingHeight || level.clearHeight || 0;
  if (!finishedCeiling) return;

  const baseY = level.y + slabDepth;
  const ceilingY = baseY + finishedCeiling;
  const upperSlabBottom = level.y + level.floorToFloorHeight - slabDepth;
  const voidHeight = Math.max(upperSlabBottom - ceilingY, level.ceilingVoid || 0);
  if (voidHeight <= 0.08) return;

  const voidCenterY = ceilingY + voidHeight / 2;
  const serviceDepth = Math.max(depth - 2.2, 1);
  const serviceWidth = Math.max(plan.width - 2.2, 1);
  addBox(
    root,
    serviceWidth,
    voidHeight,
    serviceDepth,
    0,
    voidCenterY,
    zOffset,
    materials.serviceVoid,
    "ceiling-service-void",
    createServiceVoidHoverInfo(level, voidHeight)
  );

  const ductY = ceilingY + Math.min(voidHeight * 0.58, 0.42);
  const mainDuctWidth = Math.max(serviceWidth * 0.52, 5);
  const core = plan.core || { x: 0, z: 0 };
  addBox(
    root,
    mainDuctWidth,
    0.34,
    0.82,
    core.x + mainDuctWidth * 0.18,
    ductY,
    core.z + zOffset,
    materials.duct,
    "main-duct",
    createServiceHoverInfo(level, "main-duct", mainDuctWidth, 0.34, 0.82)
  );
  addBox(
    root,
    0.58,
    0.26,
    Math.max(serviceDepth * 0.48, 4),
    core.x,
    ductY - 0.02,
    core.z + zOffset + 2.8,
    materials.duct,
    "branch-duct",
    createServiceHoverInfo(level, "branch-duct", 0.58, 0.26, Math.max(serviceDepth * 0.48, 4))
  );
  addBox(
    root,
    0.18,
    0.18,
    Math.max(serviceDepth * 0.56, 4),
    core.x + 1.1,
    ductY + 0.18,
    core.z + zOffset + 2.4,
    materials.pipe,
    "service-pipe",
    createServiceHoverInfo(level, "service-pipe", 0.18, 0.18, Math.max(serviceDepth * 0.56, 4))
  );
  addVisibleServiceRun(root, plan, level, depth, zOffset, ductY, serviceWidth, serviceDepth);

  if (options.section && beamDepth > 0.05) {
    addBeamGrid(root, plan, level, depth, zOffset, slabDepth, beamDepth);
  }
}

function addLogisticsServiceLayer(root, plan, level, depth, zOffset, options) {
  const slabDepth = Math.max(level.slabDepth || 0.25, 0.08);
  const beamDepth = Math.max(level.beamDepth || 0.8, 0.35);
  const clearHeight = level.clearHeight || level.floorToFloorHeight - slabDepth - beamDepth;

  if (options.planView) {
    addLogisticsPlanServiceRoute(root, plan, level, zOffset);
    return;
  }

  const baseY = level.y + slabDepth;
  const upperServiceLimit = level.y + level.floorToFloorHeight - slabDepth - beamDepth * 0.45;
  const targetServiceY = baseY + clearHeight + Math.min(0.8, Math.max(level.ceilingVoid || 0.6, 0.35));
  const serviceY = Math.min(upperServiceLimit, targetServiceY);
  if (!Number.isFinite(serviceY) || serviceY <= baseY + 1.2) return;

  const serviceWidth = Math.max(plan.width * 0.72, Math.min(plan.width - 10, 16));
  const branchDepth = Math.max(depth * 0.62, 12);
  const spineZ = zOffset + depth * 0.12;
  addBox(
    root,
    serviceWidth,
    0.55,
    0.78,
    0,
    serviceY,
    spineZ,
    materials.duct,
    "warehouse-main-duct",
    createServiceHoverInfo(level, "warehouse-main-duct", serviceWidth, 0.55, 0.78)
  );
  addBox(
    root,
    0.54,
    0.36,
    branchDepth,
    -plan.width * 0.24,
    serviceY - 0.04,
    zOffset - depth * 0.03,
    materials.duct,
    "warehouse-branch-duct",
    createServiceHoverInfo(level, "warehouse-branch-duct", 0.54, 0.36, branchDepth)
  );
  addBox(
    root,
    0.54,
    0.36,
    branchDepth,
    plan.width * 0.24,
    serviceY - 0.04,
    zOffset - depth * 0.03,
    materials.duct,
    "warehouse-branch-duct",
    createServiceHoverInfo(level, "warehouse-branch-duct", 0.54, 0.36, branchDepth)
  );
  addBox(
    root,
    serviceWidth * 0.7,
    0.2,
    0.22,
    0,
    serviceY + 0.38,
    spineZ + 0.75,
    materials.pipe,
    "warehouse-service-pipe",
    createServiceHoverInfo(level, "warehouse-service-pipe", serviceWidth * 0.7, 0.2, 0.22)
  );

  if (options.section && beamDepth > 0.05) {
    addBeamGrid(root, plan, level, depth, zOffset, slabDepth, beamDepth);
  }
}

function addLogisticsPlanServiceRoute(root, plan, level, zOffset) {
  const y = level.y + Math.max(level.slabDepth || 0.25, 0.08) + 1.05;
  const routeZ = zOffset + plan.depth * 0.22;
  const mainWidth = Math.max(plan.width * 0.72, 12);
  const branchDepth = Math.max(plan.depth * 0.52, 8);
  addBox(root, mainWidth, 0.18, 0.36, 0, y, routeZ, materials.duct, "plan-warehouse-main-duct", createServiceHoverInfo(level, "plan-warehouse-main-duct", mainWidth, 0.18, 0.36));
  addBox(root, 0.22, 0.16, branchDepth, -plan.width * 0.24, y + 0.04, zOffset, materials.duct, "plan-warehouse-branch-duct", createServiceHoverInfo(level, "plan-warehouse-branch-duct", 0.22, 0.16, branchDepth));
  addBox(root, 0.22, 0.16, branchDepth, plan.width * 0.24, y + 0.04, zOffset, materials.duct, "plan-warehouse-branch-duct", createServiceHoverInfo(level, "plan-warehouse-branch-duct", 0.22, 0.16, branchDepth));
}

function addVisibleServiceRun(root, plan, level, depth, zOffset, ductY, serviceWidth, serviceDepth) {
  const core = plan.core || { x: 0, z: 0, width: 0 };
  const cutFaceZ = zOffset + depth / 2 - 1.15;
  const sideDuctWidth = Math.max(serviceWidth * 0.66, 5);
  const sideDuctX = Math.min(core.x + sideDuctWidth * 0.16, plan.width / 2 - sideDuctWidth / 2 - 1);
  const branchDepth = Math.max(serviceDepth * 0.45, 4);
  const pipeDepth = Math.max(serviceDepth * 0.5, 4);
  addBox(root, sideDuctWidth, 0.42, 0.58, sideDuctX, ductY + 0.05, cutFaceZ, materials.duct, "exposed-main-duct", createServiceHoverInfo(level, "exposed-main-duct", sideDuctWidth, 0.42, 0.58));
  addBox(root, 0.46, 0.3, branchDepth, core.x + core.width / 2 + 1.2, ductY + 0.02, zOffset + 0.6, materials.duct, "exposed-branch-duct", createServiceHoverInfo(level, "exposed-branch-duct", 0.46, 0.3, branchDepth));
  addBox(root, 0.2, 0.2, pipeDepth, core.x + core.width / 2 + 1.9, ductY + 0.25, zOffset + 0.2, materials.pipe, "exposed-service-pipe", createServiceHoverInfo(level, "exposed-service-pipe", 0.2, 0.2, pipeDepth));
}

function addPlanServiceRoute(root, plan, level, zOffset) {
  const core = plan.core;
  if (!core) return;
  const slabDepth = Math.max(level.slabDepth || 0.25, 0.08);
  const y = level.y + slabDepth + 0.62;
  const routeZ = core.z + zOffset + core.depth * 0.18;
  const spineDepth = Math.max(core.depth * 0.78, 4);
  const branchWidth = Math.max(plan.width * 0.42, 6);
  addBox(root, 0.42, 0.2, spineDepth, core.x + core.width / 2 + 0.9, y, core.z + zOffset, materials.duct, "plan-service-spine", createServiceHoverInfo(level, "plan-service-spine", 0.42, 0.2, spineDepth));
  addBox(root, branchWidth, 0.18, 0.38, core.x + core.width / 2 + branchWidth / 2 + 1.1, y + 0.02, routeZ, materials.duct, "plan-service-branch", createServiceHoverInfo(level, "plan-service-branch", branchWidth, 0.18, 0.38));
  addBox(root, 0.18, 0.18, spineDepth * 0.7, core.x + core.width / 2 + 1.55, y + 0.18, core.z + zOffset + 0.6, materials.pipe, "plan-service-pipe", createServiceHoverInfo(level, "plan-service-pipe", 0.18, 0.18, spineDepth * 0.7));
}

function addBeamGrid(root, plan, level, depth, zOffset, slabDepth, beamDepth) {
  const y = level.y + level.floorToFloorHeight - slabDepth - beamDepth / 2;
  const outline = getOutline(plan, zOffset);
  for (const z of plan.gridZ || []) {
    const worldZ = z + zOffset;
    if (worldZ < zOffset - depth / 2 || worldZ > zOffset + depth / 2) continue;
    if (outline && !pointInPolygon([0, worldZ], outline)) continue;
    addBox(root, plan.width * 0.92, beamDepth, 0.16, 0, y, worldZ, materials.beam, "beam-x", createBeamHoverInfo(plan, level, plan.width * 0.92, beamDepth, 0.16));
  }
  for (const x of plan.gridX || []) {
    if (outline && !pointInPolygon([x, zOffset], outline)) continue;
    addBox(root, 0.16, beamDepth, depth * 0.82, x, y, zOffset, materials.beam, "beam-z", createBeamHoverInfo(plan, level, 0.16, beamDepth, depth * 0.82));
  }
}

function addCorePlanDetails(root, plan, level, zOffset) {
  const core = plan.core;
  const baseY = level.y + (level.slabDepth || 0.25) + 0.08;
  const left = core.x - core.width / 2;
  const back = core.z + zOffset - core.depth / 2;
  const wall = 0.18;
  const wallHeight = 0.32;

  const coreInfo = createCoreHoverInfo(plan, level);
  addBox(root, core.width, wallHeight, wall, core.x, baseY, back, materials.core, "core-wall", coreInfo);
  addBox(root, core.width, wallHeight, wall, core.x, baseY, back + core.depth, materials.core, "core-wall", coreInfo);
  addBox(root, wall, wallHeight, core.depth, left, baseY, core.z + zOffset, materials.core, "core-wall", coreInfo);
  addBox(root, wall, wallHeight, core.depth, left + core.width, baseY, core.z + zOffset, materials.core, "core-wall", coreInfo);

  const elevatorCount = core.elevators || 2;
  const elevatorW = Math.min(1.55, core.width / (elevatorCount + 1));
  const elevatorD = Math.min(1.75, core.depth * 0.22);
  for (let index = 0; index < elevatorCount; index += 1) {
    const x = left + 1.1 + index * (elevatorW + 0.34);
    addBox(root, elevatorW, 0.2, elevatorD, x, baseY + 0.14, back + 1.35, materials.shaft, "elevator-shaft", createGenericHoverInfo(`EV 샤프트 · ${hoverLevelName(level)}`, [{ label: "크기", value: `${formatMeters(elevatorW)} x ${formatMeters(elevatorD)}` }], "#e5a85f", 4));
  }

  const stairW = Math.min(2.2, core.width * 0.3);
  const stairD = Math.min(4.2, core.depth * 0.34);
  addBox(root, stairW, 0.18, stairD, left + stairW / 2 + 0.7, baseY + 0.2, back + core.depth - stairD / 2 - 0.8, materials.shaft, "stair-core", createGenericHoverInfo(`계단실 · ${hoverLevelName(level)}`, [{ label: "크기", value: `${formatMeters(stairW)} x ${formatMeters(stairD)}` }], "#e5a85f", 4));
  addStairTreads(root, left + stairW / 2 + 0.7, baseY + 0.36, back + core.depth - stairD / 2 - 0.8, stairW, stairD);

  const riserCount = core.risers || 2;
  for (let index = 0; index < riserCount; index += 1) {
    addBox(
      root,
      0.55,
      0.22,
      0.75,
      left + core.width - 1 - index * 0.78,
      baseY + 0.2,
      back + core.depth - 1.05,
      materials.duct,
      "mep-riser",
      createServiceHoverInfo(level, "mep-riser", 0.55, 0.22, 0.75)
    );
  }
}

function addStairTreads(root, x, y, z, width, depth) {
  const count = 7;
  const treadDepth = depth / count;
  for (let index = 0; index < count; index += 1) {
    addBox(
      root,
      width * 0.92,
      0.04,
      0.035,
      x,
      y + index * 0.018,
      z - depth / 2 + treadDepth * index,
      materials.column,
      "stair-tread"
    );
  }
}

function addCoreVerticalShafts(root, plan, level, zOffset) {
  const core = plan.core;
  if (!core) return;
  const height = Math.max(level.floorToFloorHeight - (level.slabDepth || 0.25), 0.5);
  const baseY = level.y + (level.slabDepth || 0.25) + height / 2;
  const left = core.x - core.width / 2;
  const back = core.z + zOffset - core.depth / 2;
  const shaftHeight = height * 0.96;
  addBox(root, 1.1, shaftHeight, 1.2, left + 1.4, baseY, back + 1.4, materials.shaft, "elevator-shaft-volume", createGenericHoverInfo(`EV 샤프트 · ${hoverLevelName(level)}`, [{ label: "샤프트 높이", value: formatMeters(shaftHeight) }, { label: "크기", value: "1.1m x 1.2m" }], "#e5a85f", 4));
  addBox(root, 0.72, shaftHeight, 0.86, left + core.width - 1.4, baseY, back + core.depth - 1.2, materials.duct, "mep-riser-volume", createServiceHoverInfo(level, "mep-riser-volume", 0.72, shaftHeight, 0.86));
}

function addOfficeWorkplane(root, plan, level, depth, zOffset) {
  if (plan.showFurniture === false) return;
  const baseY = level.y + (level.slabDepth || 0.25) + 0.74;
  const rows = 4;
  const desksPerRow = 6;
  const deskMaterial = new THREE.MeshStandardMaterial({ color: "#3d5863", roughness: 0.8 });

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < desksPerRow; col += 1) {
      const x = -plan.width / 2 + 8 + col * 5.6;
      const z = -depth / 2 + 6 + row * 6 + zOffset;
      addBox(root, 2.2, 0.12, 1.1, x, baseY, z, deskMaterial, "desk");
    }
  }
}

function addDockWall(root, plan, level, depth, zOffset) {
  const dockCount = plan.dockDoors || 0;
  if (!dockCount) return;
  const doorWidth = Math.min(4, plan.width / Math.max(dockCount, 1) - 0.4);
  const gap = plan.width / dockCount;
  const y = level.y + (level.dockHeight || 1.2) + 1.4;
  const z = zOffset + depth / 2 + 0.08;
  for (let index = 0; index < dockCount; index += 1) {
    const x = -plan.width / 2 + gap * index + gap / 2;
    addBox(root, doorWidth, 2.8, 0.18, x, y, z, materials.dock, "dock-door", createGenericHoverInfo(`도크 도어 · ${hoverLevelName(level)}`, [{ label: "도어 크기", value: `${formatMeters(doorWidth)} x 2.8m` }, { label: "도크 높이", value: formatMeters(level.dockHeight || 1.2) }], "#d49a4b", 3));
  }
}

function addLogisticsDetails(root, plan, level, options) {
  if (!level || !options.showStructure) return;
  const rows = plan.rackRows || 0;
  const rackHeight = Math.max((level.clearHeight || 8) - 1.2, 2);
  const rackMaterial = materials.rack;
  for (let row = 0; row < rows; row += 1) {
    const z = -plan.depth / 2 + 9 + row * 8;
    addBox(root, plan.width - 14, rackHeight, 0.55, 0, level.y + rackHeight / 2 + 0.3, z, rackMaterial, "rack", createGenericHoverInfo(`랙 구역 · ${hoverLevelName(level)}`, [{ label: "랙 높이", value: formatMeters(rackHeight) }, { label: "유효고", value: formatMeters(level.clearHeight) }], "#d49a4b", 3));
  }
}

function addPlanFeatures(root, plan, level, zOffset) {
  if (!Array.isArray(plan.features)) return;
  for (const feature of plan.features) {
    if (feature.levelIds && !feature.levelIds.includes(level.sourceLevelId)) continue;
    const material = feature.material === "dock" ? materials.dock : materials.core;
    addBox(
      root,
      feature.width,
      feature.height,
      feature.depth,
      feature.x,
      level.y + (level.slabDepth || 0.25) + feature.y,
      feature.z + zOffset,
      material,
      feature.name || "plan-feature",
      createGenericHoverInfo(feature.name || `계획 요소 · ${hoverLevelName(level)}`, [
        { label: "크기", value: `${formatMeters(feature.width)} x ${formatMeters(feature.depth)} x ${formatMeters(feature.height)}` },
        { label: "층", value: hoverLevelName(level) }
      ], feature.material === "dock" ? "#d49a4b" : "#e5a85f", 3)
    );
  }
}

function addRoof(root, plan, totalHeight, depth, zOffset) {
  const outline = getOutline(plan, zOffset, -0.3);
  if (outline) {
    addShapeSlab(root, outline, 0.3, totalHeight, materials.slab, "roof");
    if (plan.showFootprintGuide) {
      addFootprintGuide(root, outline, totalHeight + 0.42);
    }
  } else {
    addBox(root, plan.width + 0.8, 0.3, depth + 0.8, 0, totalHeight + 0.15, zOffset, materials.slab, "roof");
  }
}

function addCutPlane(root, plan, totalHeight) {
  addBox(
    root,
    plan.width + 1.2,
    totalHeight + 0.8,
    0.12,
    0,
    totalHeight / 2,
    plan.depth * 0.08,
    materials.cutPlane,
    "cut-plane"
  );
}

function addVerticalValueLabels(root, plan, expanded, totalHeight, depth, zOffset, options) {
  const groups = groupExpandedLevels(expanded);
  const labelX = options.isolateLevelView ? 0 : plan.width / 2 + 3.1;
  const lineX = options.isolateLevelView ? plan.width / 2 + 0.95 : plan.width / 2 + 1.15;
  const labelZ = zOffset + depth / 2 + (options.section ? 1.6 : 2.4);

  if (!options.isolateLevelView) {
    addDimensionLine(root, [lineX, 0, labelZ], [lineX, totalHeight, labelZ], true);
    addLabelSprite(
      root,
      ["총 높이", `${formatMeters(totalHeight)}`],
      [labelX + 1.1, totalHeight + 0.45, labelZ],
      { accent: "#f4d074", width: 6.8, height: 1.75 }
    );
  }

  for (const group of groups) {
    const level = group.level;
    const startY = group.startY;
    const endY = group.endY;
    const midY = (startY + endY) / 2;
    const isSelected = group.sourceLevelId === focusSourceLevelId(options.labelLevelId);
    const labelLines = [
      levelDisplayName(level, group.count),
      `층고 ${formatMeters(level.floorToFloorHeight)} · 슬라브 ${formatMeters(level.slabDepth)}`,
      `천정 ${formatMeters(level.finishedCeilingHeight)} · 유효 ${formatMeters(level.clearHeight)}`,
      `천장속 ${formatMeters(level.ceilingVoid)} · 보 ${formatMeters(level.beamDepth)}`
    ];
    addDimensionLine(root, [lineX, startY, labelZ], [lineX, endY, labelZ], false);
    addDimensionTick(root, lineX, startY, labelZ);
    addDimensionTick(root, lineX, endY, labelZ);
    const labelPosition = options.isolateLevelView
      ? [0, endY + 0.75, zOffset]
      : [labelX, midY, labelZ];
    addLabelSprite(root, labelLines, labelPosition, {
      accent: isSelected ? "#f4d074" : level.use === "parking" ? "#95a3b3" : level.use === "retail" ? "#f4d074" : "#55c2a5",
      width: options.isolateLevelView ? 7.8 : isSelected ? 9.2 : 8.8,
      height: options.isolateLevelView ? 2.28 : isSelected ? 2.58 : 2.45
    });
  }
}

function addPlanValueLabels(root, plan, level) {
  const y = level.y + (level.slabDepth || 0.12) + 1.05;
  addLabelSprite(
    root,
    ["평면", `${formatMeters(plan.width)} x ${formatMeters(plan.depth)}`],
    [0, y, plan.depth / 2 + 2.6],
    { accent: "#f4d074", width: 7.2, height: 1.8 }
  );

  if (plan.core) {
    const core = plan.core;
    addLabelSprite(
      root,
      ["코어", `${formatMeters(core.width)} x ${formatMeters(core.depth)}`, `EV ${core.elevators || 0} · ST ${core.stairs || 0} · MEP ${core.risers || 0}`],
      [core.x + core.width / 2 + 3.3, y + 0.15, core.z],
      { accent: "#e5a85f", width: 7.1, height: 2.05 }
    );
  }

  addLabelSprite(
    root,
    ["기준층", `층고 ${formatMeters(level.floorToFloorHeight)}`, `천정 ${formatMeters(level.finishedCeilingHeight)} · 유효 ${formatMeters(level.clearHeight)}`],
    [-plan.width / 2 + 4.5, y + 0.15, -plan.depth / 2 - 2],
    { accent: "#55c2a5", width: 7.2, height: 2.05 }
  );
}

function groupExpandedLevels(expanded) {
  const groups = [];
  for (const level of expanded) {
    const previous = groups[groups.length - 1];
    if (previous && previous.sourceLevelId === level.sourceLevelId) {
      previous.count += 1;
      previous.endY = level.y + level.floorToFloorHeight;
      continue;
    }
    groups.push({
      sourceLevelId: level.sourceLevelId,
      level,
      count: 1,
      startY: level.y,
      endY: level.y + level.floorToFloorHeight
    });
  }
  return groups;
}

function attachLevelFocusTargets(root, expanded, groups, plan, depth, zOffset) {
  const focusTargets = {};
  const sourceCounts = countBySourceLevel(expanded);
  for (const level of expanded) {
    const id = focusLevelId(level, sourceCounts);
    focusTargets[id] = {
      center: { x: 0, y: level.y + level.floorToFloorHeight / 2, z: zOffset },
      size: { x: plan.width, y: Math.max(level.floorToFloorHeight, 0.5), z: depth },
      sourceLevelId: level.sourceLevelId,
      startY: level.y,
      endY: level.y + level.floorToFloorHeight
    };
  }
  for (const group of groups) {
    const height = Math.max(group.endY - group.startY, 0.5);
    focusTargets[group.sourceLevelId] = {
      center: { x: 0, y: group.startY + height / 2, z: zOffset },
      size: { x: plan.width, y: height, z: depth },
      sourceLevelId: group.sourceLevelId,
      startY: group.startY,
      endY: group.endY
    };
  }
  root.userData.levelFocusTargets = focusTargets;
}

function attachPlanLevelFocusTargets(root, expanded, groups, plan, depth) {
  const focusTargets = {};
  const sourceCounts = countBySourceLevel(expanded);
  for (const level of expanded) {
    focusTargets[focusLevelId(level, sourceCounts)] = {
      center: { x: 0, y: 1.75, z: 0 },
      size: { x: plan.width, y: 3.5, z: depth },
      sourceLevelId: level.sourceLevelId,
      startY: 0,
      endY: 3.5
    };
  }
  for (const group of groups) {
    focusTargets[group.sourceLevelId] = {
      center: { x: 0, y: 1.75, z: 0 },
      size: { x: plan.width, y: 3.5, z: depth },
      sourceLevelId: group.sourceLevelId,
      startY: 0,
      endY: 3.5
    };
  }
  root.userData.levelFocusTargets = focusTargets;
}

function countBySourceLevel(expanded) {
  return expanded.reduce((counts, level) => {
    counts[level.sourceLevelId] = (counts[level.sourceLevelId] || 0) + 1;
    return counts;
  }, {});
}

function focusLevelId(level, sourceCounts) {
  return sourceCounts[level.sourceLevelId] > 1
    ? `${level.sourceLevelId}:${level.instanceIndex}`
    : level.sourceLevelId;
}

function focusSourceLevelId(levelId = "") {
  return String(levelId).split(":")[0];
}

function levelDisplayName(level, groupCount) {
  const baseName = String(level.name || "").replace(/\s+\d+$/, "");
  const range = /^(\d+)F-(\d+)F$/i.exec(baseName);
  if (range && Number.isFinite(level.instanceIndex)) {
    const floor = Number(range[1]) + level.instanceIndex;
    if (floor <= Number(range[2])) return `${floor}F`;
  }
  return groupCount > 1 ? `${baseName} x${groupCount}` : level.name;
}

function addDimensionLine(root, start, end, isGuide) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ]);
  const line = new THREE.Line(geometry, edgeMaterials.dimension);
  line.name = isGuide ? "dimension-guide-line" : "dimension-line";
  root.add(line);
}

function addDimensionTick(root, x, y, z) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x - 0.42, y, z),
    new THREE.Vector3(x + 0.42, y, z)
  ]);
  const tick = new THREE.Line(geometry, edgeMaterials.dimension);
  tick.name = "dimension-tick";
  root.add(tick);
}

function addLabelSprite(root, lines, position, options = {}) {
  const sprite = createLabelSprite(lines, options);
  sprite.position.set(position[0], position[1], position[2]);
  sprite.name = "value-label";
  root.add(sprite);
  return sprite;
}

function createLabelSprite(lines, options = {}) {
  const dpr = 2;
  const paddingX = 16;
  const paddingY = 12;
  const titleSize = 24;
  const bodySize = 20;
  const lineGap = 7;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const textLines = Array.isArray(lines) ? lines : [lines];
  ctx.font = `700 ${titleSize}px Segoe UI, sans-serif`;
  const titleWidth = ctx.measureText(textLines[0] || "").width;
  ctx.font = `600 ${bodySize}px Segoe UI, sans-serif`;
  const bodyWidth = Math.max(0, ...textLines.slice(1).map((line) => ctx.measureText(line).width));
  const width = Math.max(220, Math.ceil(Math.max(titleWidth, bodyWidth) + paddingX * 2));
  const height = Math.ceil(paddingY * 2 + titleSize + Math.max(textLines.length - 1, 0) * (bodySize + lineGap));

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  drawRoundRect(ctx, 0, 0, width, height, 10, "rgba(14, 17, 21, 0.82)", "rgba(237, 240, 242, 0.2)");
  ctx.fillStyle = options.accent || "#55c2a5";
  ctx.fillRect(0, 0, 5, height);
  ctx.fillStyle = "#f6f8f9";
  ctx.font = `700 ${titleSize}px Segoe UI, sans-serif`;
  ctx.fillText(textLines[0] || "", paddingX, paddingY + titleSize - 2);
  ctx.fillStyle = "#cbd5df";
  ctx.font = `600 ${bodySize}px Segoe UI, sans-serif`;
  textLines.slice(1).forEach((line, index) => {
    ctx.fillText(line, paddingX, paddingY + titleSize + lineGap + (index + 1) * bodySize + index * lineGap - 2);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  material.userData.disposeWithObject = true;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(options.width || width / 44, options.height || height / 44, 1);
  return sprite;
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function formatMeters(value) {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}m`;
}

function addBox(root, width, height, depth, x, y, z, material, name, hoverInfo = null) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  attachHoverInfo(mesh, hoverInfo);
  addBoxEdges(mesh, geometry, name);
  root.add(mesh);
  return mesh;
}

function addBoxEdges(mesh, geometry, name) {
  const edgeMaterial = edgeMaterialFor(name);
  if (!edgeMaterial) return;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
  edges.name = `${name}-edges`;
  mesh.add(edges);
}

function edgeMaterialFor(name = "") {
  if (name.includes("duct") || name.includes("pipe") || name.includes("service")) return edgeMaterials.service;
  if (name.includes("core") || name.includes("shaft") || name.includes("riser") || name.includes("stair")) return edgeMaterials.core;
  if (name.includes("beam")) return edgeMaterials.beam;
  return null;
}

function addWallSegment(root, start, end, thickness, height, y, material, name, hoverInfo = null) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return null;
  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((start[0] + end[0]) / 2, y, (start[1] + end[1]) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  attachHoverInfo(mesh, hoverInfo);
  root.add(mesh);
  return mesh;
}

function addShapeSlab(root, outline, height, y, material, name, hoverInfo = null) {
  const shape = createShape(outline);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false
  });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  attachHoverInfo(mesh, hoverInfo);
  root.add(mesh);
  return mesh;
}

function addShapePlane(root, outline, y, material, name, hoverInfo = null) {
  const geometry = new THREE.ShapeGeometry(createShape(outline));
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.name = name;
  attachHoverInfo(mesh, hoverInfo);
  root.add(mesh);
  return mesh;
}

function addFootprintGuide(root, outline, y) {
  const points = outline.map(([x, z]) => new THREE.Vector3(x, y, z));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: "#e5b85c" });
  const line = new THREE.LineLoop(geometry, material);
  line.name = "source-footprint-guide";
  root.add(line);
}

function createShape(outline) {
  const shape = new THREE.Shape();
  outline.forEach(([x, z], index) => {
    const y = -z;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

function getOutline(plan, zOffset = 0, inset = 0) {
  if (!Array.isArray(plan.outline) || plan.outline.length < 3) return null;
  const points = plan.outline.map(([x, z]) => [x, z + zOffset]);
  if (!inset) return points;

  const centroid = points.reduce(
    (acc, point) => [acc[0] + point[0] / points.length, acc[1] + point[1] / points.length],
    [0, 0]
  );
  return points.map(([x, z]) => {
    const dx = x - centroid[0];
    const dz = z - centroid[1];
    const length = Math.hypot(dx, dz) || 1;
    return [x - (dx / length) * inset, z - (dz / length) * inset];
  });
}

function pointInPolygon(point, polygon) {
  const [x, z] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const zi = polygon[i][1];
    const xj = polygon[j][0];
    const zj = polygon[j][1];
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function addPlane(root, width, depth, x, y, z, material, name, hoverInfo = null) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.name = name;
  attachHoverInfo(mesh, hoverInfo);
  root.add(mesh);
  return mesh;
}
