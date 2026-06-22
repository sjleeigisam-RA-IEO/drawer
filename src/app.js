import { samples } from "./samples.js?v=area-zones-1";
import { assetLibrary } from "./asset-library.js?v=area-zones-1";
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
} from "./schema.js?v=area-zones-1";
import {
  createDrawingReview,
  markReviewPublished,
  normalizeVectorPackage,
  reviewStatusLabel
} from "./drawing-schema.js?v=area-zones-1";
import { createReviewModel } from "./modeler.js?v=area-zones-1";
import { ReviewViewer } from "./viewer.js?v=area-zones-1";

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
  activeAreaZoneId: "",
  hoveredAreaZoneId: "",
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
  levelInsight: document.querySelector("#levelInsight"),
  zoneAreaInsight: document.querySelector("#zoneAreaInsight"),
  buildingInsight: document.querySelector("#buildingInsight"),
  drawingInsight: document.querySelector("#drawingInsight"),
  modelViewToolbar: document.querySelector("#modelViewToolbar"),
  resetCamera: document.querySelector("#resetCamera"),
  snapshot: document.querySelector("#snapshot"),
  exportJson: document.querySelector("#exportJson"),
  snapshotPreview: document.querySelector("#snapshotPreview"),
  snapshotPreviewImage: document.querySelector("#snapshotPreviewImage"),
  snapshotPreviewMeta: document.querySelector("#snapshotPreviewMeta"),
  snapshotPreviewClose: document.querySelector("#snapshotPreviewClose"),
  snapshotPreviewDismiss: document.querySelector("#snapshotPreviewDismiss"),
  snapshotPreviewDownload: document.querySelector("#snapshotPreviewDownload"),
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
const snapshotPreviewState = {
  objectUrl: "",
  filename: ""
};

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

  els.viewer.addEventListener("area-zone-hover", (event) => {
    state.hoveredAreaZoneId = event.detail?.zoneId || "";
    syncZoneAreaCards();
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
    clearAreaZoneState();
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
  els.snapshot.addEventListener("click", () => openSnapshotPreview());
  els.exportJson.addEventListener("click", exportCurrentModel);
  els.snapshotPreviewClose.addEventListener("click", closeSnapshotPreview);
  els.snapshotPreviewDismiss.addEventListener("click", closeSnapshotPreview);
  els.snapshotPreviewDownload.addEventListener("click", downloadSnapshotPreview);
  els.snapshotPreview.addEventListener("click", (event) => {
    if (event.target.closest("[data-preview-close]")) closeSnapshotPreview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.snapshotPreview.hidden) closeSnapshotPreview();
  });

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
    activateShot(button.dataset.shot);
  });
}

function activateShot(shot) {
  if (!["perspective", "elevation", "section", "top"].includes(shot)) return;
  state.activeShot = shot;
  applyShotOptions(shot);
  syncShotButtons();
  updateScene();
  getViewer().setCameraPreset(shot);
  if (state.options.focusLevelActive) focusSelectedLevel();
}

function applyShotOptions(shot) {
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
    return;
  }
  if (shot === "top") {
    state.options.planView = true;
    state.options.section = false;
    els.toggleSection.checked = false;
    return;
  }
  state.options.planView = false;
  state.options.section = false;
  els.toggleSection.checked = false;
}

function syncShotButtons() {
  els.shotGrid.querySelectorAll("[data-shot]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.shot === state.activeShot);
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
  els.modelViewToolbar.classList.toggle("is-hidden", drawingActive);
  els.drawingStage.hidden = !drawingActive;
  els.viewer.hidden = drawingActive;
  els.modelViewToolbar.hidden = drawingActive;
  syncShotButtons();
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
  reviewViewer.setActiveAreaZone(state.activeAreaZoneId);
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

  renderInsightPanels(active);
}

function renderInsightPanels(activeSummary) {
  const selectedLevel = getSelectedLevelSnapshot();
  const plan = state.model.plan || {};
  const core = plan.core || null;
  const source = state.model.source || {};
  const asset = getActiveAsset();
  const vectorPackage = drawingState.vectorPackage;
  const selectedSourceLevelId = selectedLevel?.id || String(state.options.labelLevelId || "").split(":")[0];
  const selectedZones = getAreaZonesForLevel(plan, selectedSourceLevelId);
  const selectedLevelName =
    els.labelLevelSelect.selectedOptions?.[0]?.textContent || selectedLevel?.name || "-";

  els.levelInsight.innerHTML = renderDefinitionRows([
    ["선택 층", selectedLevelName],
    ["용도", useLabel(selectedLevel?.use)],
    ["반복", `${formatInteger(selectedLevel?.count || 1)}개 층`],
    ["1개층 면적", formatArea(planFloorArea(plan))],
    ["층고", formatMeters(selectedLevel?.floorToFloorHeight)],
    ["천정고", selectedLevel?.finishedCeilingHeight ? formatMeters(selectedLevel.finishedCeilingHeight) : "오픈 천장"],
    ["유효고", formatMeters(selectedLevel?.clearHeight)],
    ["천정속", formatMeters(selectedLevel?.ceilingVoid)],
    ["보 깊이", formatMeters(selectedLevel?.beamDepth)]
  ]);

  renderZoneAreaInsight(selectedZones, plan);

  els.buildingInsight.innerHTML = renderDefinitionRows([
    ["전체 층수", `${formatInteger(activeSummary.levelCount)}개 층`],
    ["총 높이", formatMeters(activeSummary.totalHeight)],
    ["외곽", `${formatMeters(plan.width)} x ${formatMeters(plan.depth)}`],
    ["외벽 두께", formatMeters(plan.perimeterWallThickness || 0)],
    ["기둥", `${formatMeters(plan.columnSize || 0)} x ${formatMeters(plan.columnSize || 0)}`],
    ["X 그리드", averageSpacingLabel(plan.gridX)],
    ["Y 그리드", averageSpacingLabel(plan.gridZ)],
    ["코어", core ? `${formatMeters(core.width)} x ${formatMeters(core.depth)}` : "-"],
    ["EV / 계단 / MEP", core ? `${formatInteger(core.elevators || 0)} / ${formatInteger(core.stairs || 0)} / ${formatInteger(core.risers || 0)}` : "-"],
    plan.dockDoors ? ["도크", `${formatInteger(plan.dockDoors)}개`] : null,
    plan.rackRows ? ["랙 구역", `${formatInteger(plan.rackRows)}열`] : null
  ]);

  els.drawingInsight.innerHTML = renderDefinitionRows([
    ["원천", source.fileName || asset?.sourceFiles?.[0]?.name || "-"],
    ["PDF 페이지", source.pageCount ? `${formatInteger(source.pageCount)}p` : "-"],
    ["추출층", source.extractedFloorTitles?.length ? `${formatInteger(source.extractedFloorTitles.length)}개` : "-"],
    ["웹 도면", vectorPackage ? `${formatInteger(vectorPackage.pageCount)}p 벡터화` : reviewStatusLabel(asset?.drawingReview?.status)],
    ["캘리브레이션", drawingState.review?.calibration?.scaleLabel || "검토 필요"],
    ["모델 상태", reviewStatusLabel(asset?.modelReview?.status)]
  ]);
}

function renderZoneAreaInsight(zones, plan) {
  if (!els.zoneAreaInsight) return;
  if (!zones.length) {
    clearAreaZoneState();
    els.zoneAreaInsight.innerHTML = `<div class="zone-empty">선택 층에 등록된 구획 산정값이 없습니다.</div>`;
    return;
  }
  const visibleIds = new Set(zones.map((zone) => String(zone.id || "")));
  if (state.activeAreaZoneId && !visibleIds.has(state.activeAreaZoneId)) clearAreaZoneState();
  const basis = plan.areaBasisNote || "도면 외곽/코어/그리드 치수 기반";
  els.zoneAreaInsight.innerHTML = [
    `<div class="zone-basis">${escapeHtml(basis)}</div>`,
    ...zones.map((zone) => {
      const zoneId = String(zone.id || "");
      const area = zoneArea(zone);
      const footprint = planFloorArea(plan);
      const ratio = footprint ? (area / footprint) * 100 : 0;
      const selected = zoneId && zoneId === state.activeAreaZoneId;
      return `
        <div class="zone-area-card${selected ? " is-selected" : ""}" data-zone-id="${escapeHtml(zoneId)}" role="button" tabindex="0" aria-pressed="${selected ? "true" : "false"}">
          <div class="zone-area-head">
            <span class="zone-swatch"></span>
            <strong>${escapeHtml(zone.name || zone.id)}</strong>
            <em>${escapeHtml(zoneTypeLabel(zone.type))}</em>
          </div>
          <div class="zone-area-value">${formatArea(area)}</div>
          <div class="zone-area-meta">전체 평면 대비 ${formatNumber(ratio)}% · ${escapeHtml(zoneSourceLabel(zone))}</div>
        </div>
      `;
    })
  ].join("");
  bindZoneAreaCards();
}

function bindZoneAreaCards() {
  if (!els.zoneAreaInsight) return;
  els.zoneAreaInsight.querySelectorAll("[data-zone-id]").forEach((card) => {
    const zoneId = card.dataset.zoneId || "";
    card.addEventListener("mouseenter", () => setHoveredAreaZone(zoneId));
    card.addEventListener("mouseleave", () => setHoveredAreaZone(""));
    card.addEventListener("focus", () => setHoveredAreaZone(zoneId));
    card.addEventListener("blur", () => setHoveredAreaZone(""));
    card.addEventListener("click", () => toggleAreaZoneSelection(zoneId));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleAreaZoneSelection(zoneId);
    });
  });
  syncZoneAreaCards();
}

function toggleAreaZoneSelection(zoneId) {
  if (!zoneId) return;
  state.activeAreaZoneId = state.activeAreaZoneId === zoneId ? "" : zoneId;
  if (viewer) viewer.setActiveAreaZone(state.activeAreaZoneId);
  syncZoneAreaCards();
}

function setHoveredAreaZone(zoneId) {
  state.hoveredAreaZoneId = zoneId || "";
  if (viewer) viewer.setHoveredAreaZone(state.hoveredAreaZoneId);
  syncZoneAreaCards();
}

function clearAreaZoneState() {
  state.activeAreaZoneId = "";
  state.hoveredAreaZoneId = "";
  if (viewer) {
    viewer.setActiveAreaZone("");
    viewer.setHoveredAreaZone("");
  }
}

function syncZoneAreaCards() {
  if (!els.zoneAreaInsight) return;
  els.zoneAreaInsight.querySelectorAll("[data-zone-id]").forEach((card) => {
    const zoneId = card.dataset.zoneId || "";
    const selected = zoneId === state.activeAreaZoneId;
    const hovered = zoneId === state.hoveredAreaZoneId;
    card.classList.toggle("is-selected", selected);
    card.classList.toggle("is-hovered", hovered);
    card.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function getAreaZonesForLevel(plan, levelId) {
  return (plan.areaZones || [])
    .filter((zone) => zoneAppliesToLevel(zone, levelId))
    .filter((zone) => zoneArea(zone) > 0);
}

function zoneAppliesToLevel(zone, levelId) {
  if (!Array.isArray(zone.levelIds) || !zone.levelIds.length) return true;
  return zone.levelIds.includes(levelId);
}

function zoneArea(zone) {
  if (Number.isFinite(Number(zone.area))) return Number(zone.area);
  if (Array.isArray(zone.segments) && zone.segments.length) {
    return zone.segments.reduce((sum, segment) => sum + zoneArea(segment), 0);
  }
  if (Array.isArray(zone.points) && zone.points.length >= 3) return polygonArea(zone.points);
  return Number(zone.width || 0) * Number(zone.depth || 0);
}

function zoneSourceLabel(zone) {
  return zone.sourceNote || "도면 치수 기반";
}

function zoneTypeLabel(type) {
  return (
    {
      warehouse: "창고",
      ramp: "램프",
      core: "코어",
      restroom: "화장실",
      elevator: "EV",
      stair: "계단실",
      common: "공용부",
      dock: "도크",
      office: "전용부"
    }[type] || "구획"
  );
}

function getSelectedLevelSnapshot() {
  const selectedSourceLevelId = String(state.options.labelLevelId || "").split(":")[0];
  const level =
    state.model.levels.find((item) => item.id === selectedSourceLevelId) ||
    state.model.levels.find((item) => item.use === activeUseFallback()) ||
    state.model.levels[0] ||
    {};
  return {
    ...level,
    floorToFloorHeight: getLevelValue(state.model, level, state.scenarioId, "floorToFloorHeight"),
    finishedCeilingHeight: getLevelValue(state.model, level, state.scenarioId, "finishedCeilingHeight"),
    clearHeight: getLevelValue(state.model, level, state.scenarioId, "clearHeight"),
    slabDepth: getLevelValue(state.model, level, state.scenarioId, "slabDepth"),
    beamDepth: getLevelValue(state.model, level, state.scenarioId, "beamDepth"),
    ceilingVoid: getLevelValue(state.model, level, state.scenarioId, "ceilingVoid")
  };
}

function activeUseFallback() {
  return state.model.buildingType === "logistics" ? "logistics" : "office";
}

function renderDefinitionRows(rows) {
  return rows
    .filter(Boolean)
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? "-")}</dd></div>`)
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

async function openSnapshotPreview() {
  if (drawingState.stage !== "model") {
    drawingState.stage = "model";
    syncStage();
  }
  els.snapshot.disabled = true;
  els.snapshotPreviewDownload.disabled = true;
  try {
    const reviewViewer = getViewer();
    reviewViewer.setCameraPreset(state.activeShot);
    if (state.options.focusLevelActive) focusSelectedLevel();
    await nextAnimationFrame();
    const blob = await reviewViewer.capturePngBlob();
    if (snapshotPreviewState.objectUrl) URL.revokeObjectURL(snapshotPreviewState.objectUrl);
    snapshotPreviewState.objectUrl = URL.createObjectURL(blob);
    snapshotPreviewState.filename = snapshotName(state.activeShot);
    els.snapshotPreviewImage.src = snapshotPreviewState.objectUrl;
    els.snapshotPreviewMeta.textContent = `${getActiveAsset()?.name || state.model.name} · ${shotLabel(state.activeShot)}`;
    els.snapshotPreview.classList.remove("is-hidden");
    els.snapshotPreview.hidden = false;
    els.snapshotPreviewDownload.disabled = false;
  } finally {
    els.snapshot.disabled = false;
  }
}

function closeSnapshotPreview() {
  els.snapshotPreview.classList.add("is-hidden");
  els.snapshotPreview.hidden = true;
  els.snapshotPreviewImage.removeAttribute("src");
  if (snapshotPreviewState.objectUrl) URL.revokeObjectURL(snapshotPreviewState.objectUrl);
  snapshotPreviewState.objectUrl = "";
  snapshotPreviewState.filename = "";
}

function downloadSnapshotPreview() {
  if (!snapshotPreviewState.objectUrl) return;
  const link = document.createElement("a");
  link.download = snapshotPreviewState.filename || snapshotName(state.activeShot);
  link.href = snapshotPreviewState.objectUrl;
  link.click();
}

function nextAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

function shotLabel(shot) {
  return (
    {
      perspective: "투시",
      elevation: "입면",
      section: "단면",
      top: "평면"
    }[shot] || "투시"
  );
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
  clearAreaZoneState();
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
    clearAreaZoneState();
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
