import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class ReviewViewer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0e1115");

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(58, 38, 66);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 10, 0);

    this.modelRoot = null;
    this.hoverEnabled = true;
    this.hoverTargets = [];
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.activeAreaZoneId = "";
    this.hoveredAreaZoneId = "";
    this.hoverTooltip = this.createHoverTooltip();
    this.renderer.domElement.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    this.renderer.domElement.addEventListener("pointerdown", (event) => this.handlePointerMove(event));
    this.renderer.domElement.addEventListener("pointerleave", () => {
      this.hideHoverTooltip();
      this.setHoveredAreaZone("");
    });
    this.installScene();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }

  installScene() {
    const hemi = new THREE.HemisphereLight("#ffffff", "#48505a", 1.2);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight("#fff4dc", 2.2);
    sun.position.set(40, 70, 26);
    sun.castShadow = true;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);

    const grid = new THREE.GridHelper(150, 30, "#39434d", "#252b31");
    grid.name = "review-grid";
    this.scene.add(grid);

    const axes = new THREE.AxesHelper(8);
    axes.name = "review-axes";
    this.scene.add(axes);
  }

  setModel(group) {
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      this.disposeObject(this.modelRoot);
    }
    this.modelRoot = group;
    this.scene.add(group);
    this.collectHoverTargets();
    this.hideHoverTooltip();
    this.updateAreaZoneHighlights();
    this.frameModel();
  }

  setHoverEnabled(enabled) {
    this.hoverEnabled = Boolean(enabled);
    if (!this.hoverEnabled) {
      this.hideHoverTooltip();
      this.setHoveredAreaZone("");
    }
  }

  setActiveAreaZone(zoneId = "") {
    const nextId = String(zoneId || "");
    if (this.activeAreaZoneId === nextId) return;
    this.activeAreaZoneId = nextId;
    this.updateAreaZoneHighlights();
  }

  setHoveredAreaZone(zoneId = "") {
    const nextId = String(zoneId || "");
    if (this.hoveredAreaZoneId === nextId) return;
    this.hoveredAreaZoneId = nextId;
    this.updateAreaZoneHighlights();
    this.container.dispatchEvent(
      new CustomEvent("area-zone-hover", {
        detail: { zoneId: nextId }
      })
    );
  }

  frameModel() {
    if (!this.modelRoot) return;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.25;
    const cameraHint = this.modelRoot.userData.camera || {};
    const xSign = cameraHint.xSign || 1;
    const zSign = cameraHint.zSign || 1;
    this.controls.target.copy(center);
    this.camera.position.set(center.x + distance * xSign, center.y + distance * 0.55, center.z + distance * zSign);
    this.camera.near = Math.max(distance / 1000, 0.1);
    this.camera.far = distance * 8;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setCameraPreset(preset) {
    if (!this.modelRoot) return;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.35;
    this.controls.target.copy(center);

    if (preset === "top") {
      this.camera.position.set(center.x, center.y + distance * 1.4, center.z + 0.01);
    } else if (preset === "elevation") {
      this.camera.position.set(center.x + distance * 1.35, center.y, center.z + 0.01);
    } else if (preset === "section") {
      this.camera.position.set(center.x + distance, center.y + distance * 0.22, center.z + 4);
    } else {
      this.camera.position.set(center.x + distance, center.y + distance * 0.55, center.z + distance);
    }

    this.camera.lookAt(center);
    this.controls.update();
  }

  focusLevel(levelId, preset = "perspective") {
    if (!this.modelRoot || !levelId) return false;
    const focusTarget = this.modelRoot.userData.levelFocusTargets?.[levelId];
    if (!focusTarget) return false;

    const fullBox = new THREE.Box3().setFromObject(this.modelRoot);
    const fullSize = fullBox.getSize(new THREE.Vector3());
    const center = new THREE.Vector3(focusTarget.center.x, focusTarget.center.y, focusTarget.center.z);
    const size = focusTarget.size;
    const horizontalSpan = Math.max(size.x || 1, size.z || 1);
    const verticalSpan = Math.max(size.y || 1, 1);
    const distance = Math.max(horizontalSpan * 0.78, verticalSpan * 5.2, 14);
    const cameraHint = this.modelRoot.userData.camera || {};
    const xSign = cameraHint.xSign || 1;
    const zSign = cameraHint.zSign || 1;

    this.controls.target.copy(center);
    if (preset === "top") {
      this.camera.position.set(center.x, center.y + distance * 1.15, center.z + 0.01);
    } else if (preset === "elevation") {
      this.camera.position.set(center.x + distance * 1.05 * xSign, center.y, center.z + 0.01);
    } else if (preset === "section") {
      this.camera.position.set(center.x + distance * 0.95 * xSign, center.y + distance * 0.12, center.z + 4 * zSign);
    } else {
      this.camera.position.set(center.x + distance * xSign, center.y + distance * 0.32, center.z + distance * zSign);
    }

    this.camera.near = Math.max(distance / 1000, 0.1);
    this.camera.far = Math.max(Math.max(fullSize.x, fullSize.y, fullSize.z) * 8, distance * 8);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    return true;
  }

  snapshot(filename = "ra-3d-review.png") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = this.renderer.domElement.toDataURL("image/png");
    link.click();
  }

  capturePngBlob() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve, reject) => {
      this.renderer.domElement.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PNG 캡처를 생성하지 못했습니다."));
        }
      }, "image/png");
    });
  }

  createHoverTooltip() {
    const tooltip = document.createElement("div");
    tooltip.className = "model-hover-tooltip is-hidden";
    tooltip.setAttribute("role", "status");
    this.container.appendChild(tooltip);
    return tooltip;
  }

  collectHoverTargets() {
    this.hoverTargets = [];
    if (!this.modelRoot) return;
    this.modelRoot.traverse((object) => {
      if (object.isMesh && object.userData?.hoverInfo) {
        this.hoverTargets.push(object);
      }
    });
  }

  handlePointerMove(event) {
    if (!this.hoverEnabled || !this.modelRoot || !this.hoverTargets.length) {
      this.hideHoverTooltip();
      this.setHoveredAreaZone("");
      return;
    }

    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;

    this.pointer.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.pickHoverTarget(this.raycaster.intersectObjects(this.hoverTargets, false));
    if (!hit) {
      this.hideHoverTooltip();
      this.setHoveredAreaZone("");
      return;
    }

    this.setHoveredAreaZone(hit.info.areaZoneId || hit.object?.userData?.areaZoneId || "");
    const containerRect = this.container.getBoundingClientRect();
    this.showHoverTooltip(hit.info, event.clientX - containerRect.left, event.clientY - containerRect.top);
  }

  pickHoverTarget(intersections) {
    const nearestDistance = intersections[0]?.distance;
    const nearLimit = Number.isFinite(nearestDistance) ? nearestDistance + 2.4 : Infinity;
    let selected = null;
    for (const intersection of intersections) {
      if (intersection.distance > nearLimit) continue;
      const info = intersection.object?.userData?.hoverInfo;
      if (!info) continue;
      const score = Number(info.priority || 0) * 10 - intersection.distance;
      if (!selected || score > selected.score) {
        selected = { object: intersection.object, info, score };
      }
    }
    return selected;
  }

  updateAreaZoneHighlights() {
    if (!this.modelRoot) return;
    this.modelRoot.traverse((object) => {
      const zoneId = object.userData?.areaZoneId;
      if (!zoneId || !object.material) return;
      const active = zoneId === this.activeAreaZoneId || zoneId === this.hoveredAreaZoneId;
      const part = object.userData.areaZonePart || "fill";
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.color) material.color.set(active ? "#b96dff" : "#9aa6ad");
        if (material.emissive) {
          material.emissive.set(active ? "#4e1f7a" : "#000000");
          material.emissiveIntensity = active ? 0.18 : 0;
        }
        material.transparent = true;
        material.opacity = active ? (part === "outline" ? 0.96 : 0.36) : part === "outline" ? 0.16 : 0.018;
        if (part !== "outline") material.depthWrite = false;
        material.needsUpdate = true;
      }
    });
  }

  showHoverTooltip(info, x, y) {
    this.hoverTooltip.replaceChildren();

    const title = document.createElement("strong");
    title.className = "model-hover-title";
    title.textContent = info.title || "검토 수치";
    title.style.borderColor = info.accent || "#55c2a5";
    this.hoverTooltip.appendChild(title);

    const list = document.createElement("dl");
    list.className = "model-hover-list";
    for (const row of info.rows || []) {
      const wrapper = document.createElement("div");
      const label = document.createElement("dt");
      const value = document.createElement("dd");
      label.textContent = row.label || "";
      value.textContent = row.value || "-";
      wrapper.append(label, value);
      list.appendChild(wrapper);
    }
    this.hoverTooltip.appendChild(list);

    const tooltipWidth = this.hoverTooltip.offsetWidth || 420;
    const tooltipHeight = this.hoverTooltip.offsetHeight || 170;
    const maxX = Math.max(this.container.clientWidth - tooltipWidth - 8, 8);
    const maxY = Math.max(this.container.clientHeight - tooltipHeight - 8, 8);
    this.hoverTooltip.style.left = `${Math.min(Math.max(x + 14, 8), maxX)}px`;
    this.hoverTooltip.style.top = `${Math.min(Math.max(y + 14, 8), maxY)}px`;
    this.hoverTooltip.classList.remove("is-hidden");
  }

  hideHoverTooltip() {
    this.hoverTooltip.classList.add("is-hidden");
  }

  resize() {
    const { clientWidth, clientHeight } = this.container;
    if (!clientWidth || !clientHeight) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) this.disposeMaterial(child.material);
    });
  }

  disposeMaterial(material) {
    const materials = Array.isArray(material) ? material : [material];
    for (const item of materials) {
      if (!item?.userData?.disposeWithObject) continue;
      if (item.map) item.map.dispose();
      item.dispose();
    }
  }
}
