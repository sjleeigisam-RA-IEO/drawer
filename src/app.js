import { samples } from "./samples.js?v=number-format-1";
import { assetLibrary } from "./asset-library.js?v=number-format-1";
import {
  cloneModel,
  duplicateScenario,
  editableHeightFields,
  expandLevels,
  getLevelValue,
  getScenario,
  normalizeModel,
  setScenarioLevelValue,
  summarizeModel
} from "./schema.js?v=number-format-1";
import {
  createDrawingReview,
  markReviewPublished,
  normalizeVectorPackage,
  reviewStatusLabel
} from "./drawing-schema.js?v=number-format-1";
import { createReviewModel } from "./modeler.js?v=number-format-1";
import { ReviewViewer } from "./viewer.js?v=number-format-1";

const APP_BOOT_ID = Date.now().toString(36);
const APP_BASE_URL = new URL("../", import.meta.url);
const shouldRedirectToHttpRuntime = window.location.protocol === "file:";

if (shouldRedirectToHttpRuntime) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("mode")) params.set("mode", "library");
  if (!params.has("assetId")) params.set("assetId", "asset-daechi2-pdf");
  if (!params.has("stage")) params.set("stage", "drawing");
  window.location.replace(`http://127.0.0.1:8899/drawing-review/?${params.toString()}`);
}

const defaultAsset =
  assetLibrary.find((asset) => asset.id === "asset-daechi2-pdf") || assetLibrary[0];
const defaultSample =
  samples.find((sample) => sample.id === defaultAsset.modelReview?.modelSampleId) || samples[0];

const state = {
  model: normalizeModel(cloneModel(defaultSample.model)),
  sampleId: defaultSample.id,
  sourceMode: "library",
  activeAssetId: defaultAsset.id,
  stagedUpload: null,
  uploadState: "empty",
  scenarioId: "base",
  activeShot: "perspective",
  options: {
    showStructure: true,
    showCeilings: true,
    showServices: true,
    showLabels: true,
    labelLevelId: "",
    focusLevelActive: false,
    section: false,
    planView: false
  }
};

const els = {
  sourceModeButtons: document.querySelectorAll("[data-source-mode]"),
  stageButtons: document.querySelectorAll("[data-stage]"),
  drawingStage: document.querySelector("#drawingStage"),
  drawingPageSelect: document.querySelector("#drawingPageSelect"),
  vectorPackageStatus: document.querySelector("#vectorPackageStatus"),
  calibrationStatus: document.querySelector("#calibrationStatus"),
  validationStatus: document.querySelector("#validationStatus"),
  publishModel: document.querySelector("#publishModel"),
  drawingViewport: document.querySelector("#drawingViewport"),
  drawingImage: document.querySelector("#drawingImage"),
  drawingLoadMessage: document.querySelector("#drawingLoadMessage"),
  zoomOut: document.querySelector("#zoomOut"),
  zoomIn: document.querySelector("#zoomIn"),
  zoomValue: document.querySelector("#zoomValue"),
  viewer: document.querySelector("#viewer"),
  libraryControls: document.querySelector("#libraryControls"),
  uploadControls: document.querySelector("#uploadControls"),
  assetSelect: document.querySelector("#assetSelect"),
  assetSourceStatus: document.querySelector("#assetSourceStatus"),
  drawingFile: document.querySelector("#drawingFile"),
  uploadLabel: document.querySelector("#uploadLabel"),
  uploadStatus: document.querySelector("#uploadStatus"),
  queueExtraction: document.querySelector("#queueExtraction"),
  templateRow: document.querySelector("#templateRow"),
  sampleSelect: document.querySelector("#sampleSelect"),
  scenarioSelect: document.querySelector("#scenarioSelect"),
  levelTable: document.querySelector("#levelTable"),
  metrics: document.querySelector("#metrics"),
  summary: document.querySelector("#summary"),
  resetCamera: document.querySelector("#resetCamera"),
  snapshot: document.querySelector("#snapshot"),
  exportJson: document.querySelector("#exportJson"),
  addScenario: document.querySelector("#addScenario"),
  toggleStructure: document.querySelector("#toggleStructure"),
  toggleCeilings: document.querySelector("#toggleCeilings"),
  toggleServices: document.querySelector("#toggleServices"),
  toggleLabels: document.querySelector("#toggleLabels"),
  labelLevelSelect: document.querySelector("#labelLevelSelect"),
  toggleSection: document.querySelector("#toggleSection"),
  shotGrid: document.querySelector("#shotGrid")
};

let viewer = null;
const drawingState = {
  stage: "drawing",
  vectorPackage: null,
  review: null,
  manifestUrl: "",
  loading: false,
  error: "",
  pageIndex: 0,
  zoom: 1
};

function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("embedded")) {
    document.body.classList.add("embedded-frame");
  }
  applyUrlParams(params);
  renderAssetOptions();
  renderSampleOptions();
  renderLabelLevelOptions();
  syncSourceMode();
  renderScenarioOptions();
  renderLevelTable();
  renderMetrics();
  bindEvents();
  syncStage();
  loadDrawingManifestForActiveAsset();
  window.lucide?.createIcons();
}

function bindEvents() {
  els.sourceModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.sourceMode = button.dataset.sourceMode;
      syncSourceMode();
      renderMetrics();
    });
  });

  els.stageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      drawingState.stage = button.dataset.stage;
      syncStage();
    });
  });

  els.drawingPageSelect.addEventListener("change", () => {
    drawingState.pageIndex = Number(els.drawingPageSelect.value || 0);
    renderDrawingPage();
  });

  els.drawingImage.addEventListener("error", () => {
    clearDrawingImage("SVG 도면 페이지를 불러오지 못했습니다. 생성된 SVG 파일 경로를 확인해야 합니다.");
  });

  els.drawingImage.addEventListener("load", () => {
    if (els.drawingImage.naturalWidth > 0) {
      els.drawingImage.hidden = false;
      els.drawingLoadMessage.hidden = true;
    }
  });

  els.zoomOut.addEventListener("click", () => {
    drawingState.zoom = Math.max(0.5, drawingState.zoom - 0.25);
    renderDrawingZoom();
  });

  els.zoomIn.addEventListener("click", () => {
    drawingState.zoom = Math.min(3, drawingState.zoom + 0.25);
    renderDrawingZoom();
  });

  els.publishModel.addEventListener("click", () => {
    if (!drawingState.review || !drawingState.vectorPackage) return;
    drawingState.review = markReviewPublished(drawingState.review, state.model.id);
    renderDrawingReviewStatus();
    drawingState.stage = "model";
    syncStage();
  });

  els.assetSelect.addEventListener("change", () => {
    loadAsset(els.assetSelect.value);
  });

  els.drawingFile.addEventListener("change", async () => {
    const file = els.drawingFile.files?.[0];
    state.stagedUpload = file
      ? {
          name: file.name,
          size: file.size,
          kind: file.name.split(".").pop()?.toLowerCase() || "file",
          stagedAt: new Date().toISOString()
        }
      : null;
    if (file && state.stagedUpload.kind === "json") {
      await loadUploadedJson(file);
    } else if (file) {
      state.uploadState = "parser-unavailable";
    } else {
      state.uploadState = "empty";
    }
    renderUploadStatus();
    renderMetrics();
  });

  els.sampleSelect.addEventListener("change", () => {
    const selected = samples.find((sample) => sample.id === els.sampleSelect.value) || samples[0];
    state.sampleId = selected.id;
    state.model = normalizeModel(cloneModel(selected.model));
    state.scenarioId = state.model.scenarios[0].id;
    state.options.focusLevelActive = false;
    renderScenarioOptions();
    renderLabelLevelOptions();
    renderLevelTable();
    refreshModelOutputs();
  });

  els.scenarioSelect.addEventListener("change", () => {
    state.scenarioId = els.scenarioSelect.value;
    renderLevelTable();
    refreshModelOutputs();
  });

  els.toggleStructure.addEventListener("change", () => {
    state.options.showStructure = els.toggleStructure.checked;
    refreshModelOutputs();
  });

  els.toggleCeilings.addEventListener("change", () => {
    state.options.showCeilings = els.toggleCeilings.checked;
    refreshModelOutputs();
  });

  els.toggleServices.addEventListener("change", () => {
    state.options.showServices = els.toggleServices.checked;
    refreshModelOutputs();
  });

  els.toggleLabels.addEventListener("change", () => {
    state.options.showLabels = els.toggleLabels.checked;
    refreshModelOutputs();
  });

  els.labelLevelSelect.addEventListener("change", () => {
    state.options.labelLevelId = els.labelLevelSelect.value;
    state.options.focusLevelActive = true;
    refreshModelOutputs({ focusLevel: true });
  });

  els.toggleSection.addEventListener("change", () => {
    state.options.section = els.toggleSection.checked;
    refreshModelOutputs();
  });

  els.resetCamera.addEventListener("click", () => {
    if (drawingState.stage === "model") {
      state.options.focusLevelActive = false;
      updateScene();
    }
  });
  els.snapshot.addEventListener("click", () => {
    if (drawingState.stage === "model") getViewer().snapshot(snapshotName("perspective"));
  });
  els.exportJson.addEventListener("click", exportCurrentModel);

  els.addScenario.addEventListener("click", () => {
    const scenario = duplicateScenario(state.model, state.scenarioId);
    state.scenarioId = scenario.id;
    renderScenarioOptions();
    renderLevelTable();
    refreshModelOutputs();
  });

  els.shotGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shot]");
    if (!button) return;
    if (drawingState.stage !== "model") return;
    const shot = button.dataset.shot;
    state.activeShot = shot;
    if (shot === "section") {
      state.options.planView = false;
      state.options.section = true;
      state.options.showStructure = true;
      state.options.showCeilings = true;
      state.options.showServices = true;
      els.toggleStructure.checked = true;
      els.toggleCeilings.checked = true;
      els.toggleServices.checked = true;
      els.toggleSection.checked = true;
      updateScene();
    } else if (shot === "top") {
      state.options.planView = true;
      state.options.section = false;
      els.toggleSection.checked = false;
      updateScene();
    } else if (shot === "elevation") {
      state.options.planView = false;
      state.options.section = false;
      els.toggleSection.checked = false;
      updateScene();
    } else {
      state.options.planView = false;
      state.options.section = false;
      els.toggleSection.checked = false;
      updateScene();
    }
    getViewer().setCameraPreset(shot);
    if (state.options.focusLevelActive) focusSelectedLevel();
    window.setTimeout(() => getViewer().snapshot(snapshotName(shot)), 80);
  });
}

function renderSampleOptions() {
  const sampleOptions = samples
    .map((sample) => `<option value="${sample.id}">${sample.name}</option>`)
    .join("");
  const customOption = samples.some((sample) => sample.id === state.sampleId)
    ? ""
    : `<option value="${state.sampleId}">${state.model.name}</option>`;
  els.sampleSelect.innerHTML = sampleOptions + customOption;
  els.sampleSelect.value = state.sampleId;
}

function renderLabelLevelOptions() {
  ensureLabelLevelSelection();
  const focusOptions = getFocusLevelOptions();
  els.labelLevelSelect.innerHTML = focusOptions
    .map((option) => `<option value="${option.id}">${option.label}</option>`)
    .join("");
  els.labelLevelSelect.value = state.options.labelLevelId;
  els.labelLevelSelect.disabled = !focusOptions.length;
}

function ensureLabelLevelSelection() {
  const focusOptions = getFocusLevelOptions();
  if (!focusOptions.length) {
    state.options.labelLevelId = "";
    return;
  }
  const current = focusOptions.find((option) => option.id === state.options.labelLevelId);
  if (current) return;
  const representative =
    focusOptions.find((option) => option.use === "office") ||
    focusOptions
      .filter((option) => option.use === "logistics")
      .reduce(
        (selected, option) =>
          !selected || (option.clearHeight || 0) > (selected.clearHeight || 0) ? option : selected,
        null
      ) ||
    focusOptions.find((option) => option.use !== "parking") ||
    focusOptions[0];
  state.options.labelLevelId = representative.id;
}

function getFocusLevelOptions() {
  const { expanded } = expandLevels(state.model, state.scenarioId);
  const counts = expanded.reduce((acc, level) => {
    acc[level.sourceLevelId] = (acc[level.sourceLevelId] || 0) + 1;
    return acc;
  }, {});
  return expanded.map((level) => {
    const sourceLevel = state.model.levels.find((item) => item.id === level.sourceLevelId) || level;
    const repeated = counts[level.sourceLevelId] > 1;
    return {
      id: repeated ? `${level.sourceLevelId}:${level.instanceIndex}` : level.sourceLevelId,
      sourceLevelId: level.sourceLevelId,
      use: level.use,
      clearHeight: level.clearHeight,
      label: repeated ? inferRepeatedLevelLabel(sourceLevel.name, level.instanceIndex) : sourceLevel.name
    };
  });
}

function inferRepeatedLevelLabel(name, index) {
  const range = /^(\d+)F-(\d+)F$/i.exec(name);
  if (range) {
    const floor = Number(range[1]) + index;
    if (floor <= Number(range[2])) return `${floor}F`;
  }
  return `${name} ${index + 1}`;
}

function renderAssetOptions() {
  els.assetSelect.innerHTML = assetLibrary
    .map((asset) => `<option value="${asset.id}">${asset.name}</option>`)
    .join("");
  els.assetSelect.value = state.activeAssetId;
  renderAssetStatus();
}

function loadAsset(assetId) {
  applyAssetModel(assetId);
  renderSampleOptions();
  renderScenarioOptions();
  renderLabelLevelOptions();
  renderLevelTable();
  renderAssetStatus();
  refreshModelOutputs();
  loadDrawingManifestForActiveAsset();
}

function syncSourceMode() {
  els.sourceModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sourceMode === state.sourceMode);
  });
  els.libraryControls.classList.toggle("is-hidden", state.sourceMode !== "library");
  els.uploadControls.classList.toggle("is-hidden", state.sourceMode !== "upload");
  els.templateRow.classList.toggle("is-hidden", state.sourceMode === "library");
  renderAssetStatus();
  renderUploadStatus();
}

function syncStage() {
  els.stageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.stage === drawingState.stage);
  });
  const drawingActive = drawingState.stage === "drawing";
  els.drawingStage.classList.toggle("is-hidden", !drawingActive);
  els.viewer.classList.toggle("is-hidden", drawingActive);
  els.drawingStage.hidden = !drawingActive;
  els.viewer.hidden = drawingActive;
  if (!drawingActive) {
    updateScene({ focusLevel: state.options.focusLevelActive });
    getViewer().resize();
  }
}

function renderAssetStatus() {
  const asset = getActiveAsset();
  if (!asset) return;
  const files = asset.sourceFiles
    .map((file) => `${file.name} · ${file.state}`)
    .join("<br>");
  const drawingStatus = reviewStatusLabel(asset.drawingReview?.status);
  const modelStatus = reviewStatusLabel(asset.modelReview?.status);
  els.assetSourceStatus.innerHTML = [
    asset.provenanceNote,
    `도면 검토 · ${drawingStatus}`,
    `3D 모델 · ${modelStatus}`,
    files
  ].join("<br>");
}

function renderUploadStatus() {
  els.uploadStatus.classList.remove("warning", "ready", "muted");
  if (!state.stagedUpload) {
    els.uploadLabel.textContent = "PDF/DXF/JSON 파일 선택";
    els.uploadStatus.textContent = "업로드 파일은 스테이징 상태로 보관됩니다.";
    els.uploadStatus.classList.add("muted");
    els.queueExtraction.disabled = true;
    return;
  }
  const sizeMb = state.stagedUpload.size / 1024 / 1024;
  els.uploadLabel.textContent = state.stagedUpload.name;
  if (state.uploadState === "loaded-json") {
    els.uploadStatus.textContent = `${state.stagedUpload.kind.toUpperCase()} · ${formatNumber(sizeMb)}MB · normalized model loaded`;
    els.uploadStatus.classList.add("ready");
    els.queueExtraction.disabled = true;
  } else if (state.uploadState === "invalid-json") {
    els.uploadStatus.textContent = `${state.stagedUpload.kind.toUpperCase()} · ${formatNumber(sizeMb)}MB · JSON 구조 확인 필요`;
    els.uploadStatus.classList.add("warning");
    els.queueExtraction.disabled = true;
  } else {
    els.uploadStatus.textContent = `${state.stagedUpload.kind.toUpperCase()} · ${formatNumber(sizeMb)}MB · 파서 연결 전`;
    els.uploadStatus.classList.add("warning");
    els.queueExtraction.disabled = true;
  }
}

async function loadDrawingManifestForActiveAsset() {
  const asset = getActiveAsset();
  drawingState.vectorPackage = null;
  drawingState.review = null;
  drawingState.manifestUrl = "";
  drawingState.loading = true;
  drawingState.error = "";
  drawingState.pageIndex = 0;
  drawingState.zoom = 1;
  els.drawingPageSelect.disabled = true;
  els.drawingPageSelect.innerHTML = `<option value="0">도면 패키지 로드 중</option>`;
  clearDrawingImage("도면 벡터 패키지를 불러오는 중입니다.");
  renderDrawingReviewStatus();

  const packageUrl = asset?.drawingReview?.packageUrl;
  if (!packageUrl) {
    drawingState.loading = false;
    drawingState.error = "missing-vector-package";
    els.drawingPageSelect.innerHTML = `<option value="0">벡터 도면 없음</option>`;
    clearDrawingImage("이 자산에는 아직 웹 벡터 도면 패키지가 없습니다.");
    renderDrawingZoom();
    renderDrawingReviewStatus();
    return;
  }

  try {
    const manifestUrl = resolveAppUrl(packageUrl);
    const response = await fetch(cacheBust(manifestUrl));
    if (!response.ok) throw new Error(`Manifest ${response.status}`);
    drawingState.vectorPackage = normalizeVectorPackage(await response.json());
    drawingState.review = createDrawingReview(asset, drawingState.vectorPackage);
    drawingState.manifestUrl = manifestUrl;
    drawingState.loading = false;
    els.drawingPageSelect.innerHTML = drawingState.vectorPackage.pages
      .map(
        (page, index) =>
          `<option value="${index}">${formatInteger(page.index)}. ${page.title} (${formatInteger(page.drawingCount)})</option>`
      )
      .join("");
    els.drawingPageSelect.disabled = false;
    renderDrawingReviewStatus();
    renderDrawingPage();
  } catch (error) {
    drawingState.loading = false;
    drawingState.error = error.message;
    els.drawingPageSelect.innerHTML = `<option value="0">도면 로드 실패</option>`;
    clearDrawingImage(
      window.location.protocol === "file:"
        ? "file://로 열리면 도면 manifest를 읽을 수 없습니다. 로컬 HTTP 주소로 열어야 합니다."
        : `도면 manifest를 읽지 못했습니다. ${error.message}`
    );
    drawingState.review = createDrawingReview(asset, null);
    renderDrawingReviewStatus();
  }
}

function renderDrawingPage() {
  const page = drawingState.vectorPackage?.pages?.[drawingState.pageIndex];
  if (!page) return;
  els.drawingPageSelect.value = String(drawingState.pageIndex);
  if (drawingState.review) {
    drawingState.review.selectedPageId = page.id;
  }
  els.drawingImage.hidden = true;
  els.drawingLoadMessage.textContent = `${page.title} SVG 도면을 불러오는 중입니다.`;
  els.drawingLoadMessage.hidden = false;
  els.drawingImage.src = cacheBust(new URL(page.svg, drawingState.manifestUrl).href);
  els.drawingImage.alt = `${page.title} vector drawing`;
  renderDrawingZoom();
  renderDrawingReviewStatus();
}

function clearDrawingImage(message) {
  els.drawingImage.removeAttribute("src");
  els.drawingImage.hidden = true;
  els.drawingLoadMessage.textContent = message;
  els.drawingLoadMessage.hidden = false;
}

function renderDrawingZoom() {
  els.zoomValue.textContent = `${formatInteger(Math.round(drawingState.zoom * 100))}%`;
  els.drawingViewport.style.setProperty("--drawing-width", `${drawingState.zoom * 100}%`);
}

function renderDrawingReviewStatus() {
  const vectorPackage = drawingState.vectorPackage;
  const review = drawingState.review;
  els.vectorPackageStatus.textContent = drawingState.loading
    ? "로드 중"
    : vectorPackage
    ? `${formatInteger(vectorPackage.pageCount)}p · ${vectorPackage.id}`
    : drawingState.error
    ? "로드 실패"
    : "벡터 패키지 없음";
  els.calibrationStatus.textContent = review
    ? `${reviewStatusLabel(review.calibration.status)}${review.calibration.scaleLabel ? ` · ${review.calibration.scaleLabel}` : ""}`
    : "대기";
  els.validationStatus.textContent = review
    ? `${reviewStatusLabel(review.status)} · 후보 ${formatInteger(review.validatedSpaceCandidates.length)} · 주석 ${formatInteger(review.annotationCount)}`
    : "대기";
  els.publishModel.disabled = !vectorPackage;
  els.publishModel.textContent = review?.publishedModelId ? "3D 모델 게시됨" : "3D 모델로 게시";
}

function renderScenarioOptions() {
  els.scenarioSelect.innerHTML = state.model.scenarios
    .map((scenario) => `<option value="${scenario.id}">${scenario.name}</option>`)
    .join("");
  els.scenarioSelect.value = state.scenarioId;
}

function renderLevelTable() {
  const headers = [
    "<th>층/구역</th>",
    "<th>용도</th>",
    "<th>반복</th>",
    ...editableHeightFields.map((field) => `<th>${field.label}</th>`)
  ];
  const tableHead = els.levelTable.closest("table")?.querySelector("thead tr");
  if (tableHead) tableHead.innerHTML = headers.join("");

  els.levelTable.innerHTML = state.model.levels
    .map((level) => {
      const cells = editableHeightFields
        .map((field) => {
          const value = getLevelValue(state.model, level, state.scenarioId, field.key);
          return `
            <td>
              <input
                type="number"
                min="${field.min}"
                max="${field.max}"
                step="${field.step}"
                value="${value}"
                data-level="${level.id}"
                data-field="${field.key}"
                aria-label="${level.name} ${field.label}"
              />
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <td><span class="level-name">${level.name}</span></td>
          <td><span class="use-pill">${useLabel(level.use)}</span></td>
          <td>${formatInteger(level.count || 1)}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  els.levelTable.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      setScenarioLevelValue(
        state.model,
        state.scenarioId,
        input.dataset.level,
        input.dataset.field,
        input.value
      );
      refreshModelOutputs();
    });
  });
}

function refreshModelOutputs(options = {}) {
  if (drawingState.stage === "model") {
    updateScene(options);
  } else {
    renderMetrics();
  }
}

function updateScene(options = {}) {
  const group = createReviewModel(state.model, state.scenarioId, state.options);
  const reviewViewer = getViewer();
  reviewViewer.setModel(group);
  reviewViewer.setHoverEnabled(state.options.showLabels);
  if (state.activeShot) {
    reviewViewer.setCameraPreset(state.activeShot);
  }
  if (options.focusLevel || state.options.focusLevelActive) focusSelectedLevel();
  renderMetrics();
}

function focusSelectedLevel() {
  return getViewer().focusLevel(state.options.labelLevelId, state.activeShot);
}

function getViewer() {
  if (!viewer) {
    viewer = new ReviewViewer(els.viewer);
  }
  return viewer;
}

function resolveAppUrl(path) {
  return new URL(path, APP_BASE_URL).href;
}

function cacheBust(url) {
  const resolved = new URL(url);
  resolved.searchParams.set("v", APP_BOOT_ID);
  return resolved.href;
}

function renderMetrics() {
  const active = summarizeModel(state.model, state.scenarioId);
  const base = summarizeModel(state.model, "base");
  const asset = getActiveAsset();
  const sourceLabel =
    state.sourceMode === "library"
      ? `자산 라이브러리 · ${asset?.status || "-"}`
      : state.stagedUpload
        ? `파일 업로드 · ${state.uploadState}`
        : "즉시 업로드 · 대기";
  const assetLabel =
    state.sourceMode === "library"
      ? asset?.name || state.model.name
      : state.stagedUpload?.name || state.model.name;

  const heightDelta = active.totalHeight - base.totalHeight;
  const ceilingDelta = active.representativeCeiling - base.representativeCeiling;
  const clearDelta = active.representativeClear - base.representativeClear;

  const metricItems = [
    ["총 높이", formatMeters(active.totalHeight), heightDelta],
    ["층수", formatInteger(active.levelCount), 0],
    ["대표 천정고", active.representativeCeiling ? formatMeters(active.representativeCeiling) : "-", ceilingDelta],
    ["대표 유효고", active.representativeClear ? formatMeters(active.representativeClear) : "-", clearDelta]
  ];

  els.metrics.innerHTML = metricItems
    .map(([label, value, delta]) => {
      const deltaText = delta ? `<span class="metric-delta">${formatSignedMeters(delta)}</span>` : "";
      return `
        <div class="metric-tile">
          <span class="metric-label">${label}</span>
          <span class="metric-value">${value}</span>
          ${deltaText}
        </div>
      `;
    })
    .join("");

  els.summary.innerHTML = [
    ["입구", sourceLabel],
    ["자산", assetLabel],
    ["용도", useLabel(active.representativeUse)],
    ["도면 단위", state.model.units],
    ["평면", `${formatMeters(state.model.plan.width)} x ${formatMeters(state.model.plan.depth)} (${formatArea(planFloorArea(state.model.plan))})`]
  ]
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function exportCurrentModel() {
  const payload = {
    exportedAt: new Date().toISOString(),
    activeScenarioId: state.scenarioId,
    model: state.model
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.model.id}-${state.scenarioId}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function snapshotName(shot) {
  return `${state.model.id}-${state.scenarioId}-${shot}.png`;
}

function useLabel(use) {
  return (
    {
      office: "업무",
      logistics: "물류",
      retail: "리테일",
      parking: "주차"
    }[use] || use
  );
}

function getActiveAsset() {
  return assetLibrary.find((asset) => asset.id === state.activeAssetId) || assetLibrary[0];
}

function applyUrlParams(params) {
  const mode = params.get("mode");
  if (mode === "library") {
    state.sourceMode = "library";
  }
  const stage = params.get("stage");
  if (stage === "drawing" || stage === "model") {
    drawingState.stage = stage;
  }
  const assetId = params.get("assetId");
  const asset = assetLibrary.find((item) => item.id === assetId || item.assetId === assetId);
  if (asset) {
    applyAssetModel(asset.id);
  }
}

function applyAssetModel(assetId) {
  const asset = assetLibrary.find((item) => item.id === assetId || item.assetId === assetId) || assetLibrary[0];
  const sampleId = asset.modelReview?.modelSampleId || asset.modelSampleId;
  const sample = samples.find((item) => item.id === sampleId) || samples[0];
  state.activeAssetId = asset.id;
  state.sampleId = sample.id;
  state.model = normalizeModel(cloneModel(sample.model));
  state.scenarioId = state.model.scenarios[0].id;
  state.options.focusLevelActive = false;
  ensureLabelLevelSelection();
}

async function loadUploadedJson(file) {
  try {
    const payload = JSON.parse(await file.text());
    const modelPayload = payload.model || payload;
    state.model = normalizeModel(modelPayload);
    state.sampleId = state.model.id || "uploaded-json";
    state.scenarioId = state.model.scenarios[0].id;
    state.options.focusLevelActive = false;
    state.uploadState = "loaded-json";
    renderSampleOptions();
    renderScenarioOptions();
    renderLabelLevelOptions();
    renderLevelTable();
    if (drawingState.stage === "model") {
      updateScene();
    } else {
      renderMetrics();
    }
  } catch {
    state.uploadState = "invalid-json";
  }
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  const fractionDigits = Math.abs(numeric) >= 100 ? 1 : 2;
  return numeric.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

function formatInteger(value) {
  return Number(value || 0).toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function formatMeters(value) {
  return `${formatNumber(value)}m`;
}

function formatSignedMeters(value) {
  const numeric = Number(value || 0);
  if (!numeric) return formatMeters(0);
  return `${numeric > 0 ? "+" : "-"}${formatMeters(Math.abs(numeric))}`;
}

function formatArea(value) {
  const sqm = Number(value || 0);
  const pyeong = sqm / 3.305785;
  return `${formatNumber(sqm)}㎡ / ${formatNumber(pyeong)}평`;
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

if (!shouldRedirectToHttpRuntime) {
  init();
}
