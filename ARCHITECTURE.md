# Drawing Review Architecture

## Positioning

This module is currently a standalone solution. It can later expose outputs to
dashboards or IM workflows, but its core should remain independent from any
specific dashboard page. The durable source of truth is not the PDF, DXF, or
rendered mesh. It is the validated 2D plan model plus floor/use/zone-specific
height rules.

The repository boundary is the static viewer plus reviewed/generated drawing
packages. Raw PDF/CAD source files stay outside Git and should be handled by a
private upload/storage pipeline. The sample `generated/**` packages are included
so the deployed app can show drawings and 3D models without requiring the raw
PDFs at runtime.

There should be two product entry points:

1. **Asset library mode**: drawings are uploaded, calibrated, validated, and
   stored against an asset before review. This is the production/default path
   for dashboard use and IM materials.
2. **Immediate upload mode**: a user drops a PDF/DXF into a staging workflow,
   picks a base template, and creates a draft intake record. Until parsers are
   connected, only normalized model JSON should load directly into the 3D
   generator. PDF/DXF/DWG files stay as staged evidence and should not imply
   automatic generation.

```text
PDF/DXF/DWG evidence
  -> Stage 1 vector package
  -> page/floor metadata
  -> calibration and review annotations
  -> published validated plan model
  -> scenario height resolution
  -> Stage 2 generated review mesh
  -> web viewer / IM snapshots / optional GLB
```

The work must be split into two visible stages:

1. **Vector drawing stage**: understand the PDF/CAD file, extract or preserve it
   as a zoomable web vector drawing, keep page/floor metadata, and let users
   inspect/calibrate the drawing before any 3D claim is made. This stage ends
   with a validated vector drawing package plus review annotations.
2. **3D modeling stage**: generate the parametric 3D model only from a published
   validated plan model. The mesh is disposable output, not the source of truth.

## Package Boundaries

Use these as adapters, not as the domain model.

| Boundary | First package choice | Role |
|---|---|---|
| PDF | `pdfjs-dist` | Render pages and extract vector/text primitives where available. |
| DXF | `dxf-parser` | Read 2D entities, layers, blocks, text. |
| DWG | server-side conversion to DXF | Keep outside the static prototype. |
| 2D geometry | `@flatten-js/core`, `polygon-clipping`, `earcut`, `rbush` | Polygon cleaning, booleans, triangulation, spatial lookup. |
| 3D viewer | `three`, `OrbitControls`, `TransformControls` | Web review, 360 orbit, section, scenario comparison. |
| Schema/persistence | `zod`, `Dexie` | Runtime validation and browser IndexedDB storage. |
| Later BIM/CAD | `web-ifc`, ThatOpen, `replicad`, OpenCascade.js | IFC/CAD-grade flows after the review model is proven. |

## Core Types

```ts
type SourceAsset = {
  id: string;
  kind: "pdf" | "dxf" | "dwg";
  hash: string;
  name: string;
};

type RawPrimitive = {
  id: string;
  assetId: string;
  layer?: string;
  kind: "line" | "polyline" | "arc" | "circle" | "text" | "image";
  geometry: unknown;
  bbox: [number, number, number, number];
};

type Calibration = {
  id: string;
  assetId: string;
  floorId: string;
  unitScaleToMeters: number;
  origin: [number, number];
  rotationDeg: number;
};

type Space = {
  id: string;
  floorId: string;
  use: "office" | "logistics" | "core" | "parking" | "void" | "retail" | "other";
  zoneId?: string;
  polygon: number[][][];
  provenance: Array<{ primitiveId?: string; manual?: boolean }>;
};

type AreaZone = {
  id: string;
  name: string;
  type: "warehouse" | "ramp" | "core" | "restroom" | "elevator" | "stair" | "common" | "dock" | "office";
  levelIds?: string[];
  x?: number;
  z?: number;
  width?: number;
  depth?: number;
  points?: Array<[number, number]>;
  area?: number;
  sourceNote?: string;
};

type HeightRule = {
  id: string;
  scope: "project" | "floor" | "use" | "zone" | "space";
  targetId?: string;
  floorToFloorM?: number;
  clearHeightM?: number;
  finishedCeilingHeightM?: number;
  slabM?: number;
  beamM?: number;
};

type Scenario = {
  id: string;
  name: string;
  baseModelVersion: string;
  overrides: Array<{
    targetType: "floor" | "use" | "zone" | "space";
    targetId: string;
    patch: Partial<HeightRule | Space>;
  }>;
};
```

## Height Resolution

Resolved height values must be deterministic:

```text
scenario space override
  > scenario zone/use/floor override
  > base space rule
  > base zone rule
  > base use rule
  > base floor rule
  > project default
```

Office and logistics can share the same engine because the data model separates
use-specific semantics from rendering. Office views emphasize finished ceiling
height, beams, and work area perception. Logistics views emphasize clear height,
dock height, rack clearance, yard/dock relationships, and grid spacing.

## Rollout Stages

1. Static parametric viewer with editable sample models.
2. Vector drawing stage: PDF pages are converted to web-ready SVG with page
   metadata and lazy-loaded in the browser.
3. Source-mode shell: asset-library selection and immediate-upload staging use
   the same internal model path.
4. Manual drawing overlay editor: import an image/PDF page, calibrate scale,
   draw/validate exterior, core, columns, dock, and zones.
5. DXF importer: read layers and create candidate primitives.
6. PDF vector importer: extract usable primitives from vector PDFs.
7. Raster assist: OpenCV/ImageTracer/OCR only for candidates, never as final
   truth without validation.
8. Optional integration: expose standalone model/output links to dashboards or
   asset-detail pages after the solution is stable.
9. Persistence: store source asset hash, validated plan JSON, scenarios,
   snapshots, and generated GLB per asset.

Current prototype scope is read-only review: asset selection, vector drawing
inspection, 3D orbit/section/plan views, floor focus/slice, layer toggles,
hover metrics, and snapshot/export actions. Parameter editing and direct upload
are intentionally hidden until the admin update path is implemented.

Core geometry is currently procedural review geometry. The modeler resolves
`plan.core` into shell walls plus elevator banks, stair rooms, restroom zones,
core corridor, and MEP risers. If a drawing-derived exact core layout is needed
later, add optional `plan.core.components[]` records with core-local coordinates
and keep the procedural layout as the fallback.

Zone area analysis is stored as `plan.areaZones[]`. Each zone is a drawing-dimension
review layer in model meters, either a rectangle (`x`, `z`, `width`, `depth`) or a
polygon (`points`). The app calculates `㎡ / 평`, shows the basis note in the
left review panel, and renders the same zones as purple overlays in the 3D/plan
viewer. These values are not certified GFA/NLA/rentable areas; overlapping core
sub-zones such as elevator, restroom, stair, and common corridor are allowed for
visual review and should not be blindly summed.

## Asset Mapping

Drawings should attach to the canonical asset identifier, not directly to funds
or projects. Funds and projects inherit access through asset relationships.

```text
asset_master.asset_id
  -> asset_drawing_sources
  -> asset_vector_reviews
  -> asset_3d_models
  -> asset_drawing_outputs
  -> asset_drawing_provenance
```

Suggested storage tables:

- `asset_drawing_sources`: raw file URI, file hash, file type, page/layer info,
  uploader, source date.
- `asset_vector_reviews`: asset id, vector package URI, status, calibration,
  page/floor metadata, review annotations, reviewer.
- `asset_3d_models`: asset id, source vector package id, model version, status,
  validated geometry JSON, height rules, reviewer.
- `asset_drawing_outputs`: model version, scenario id, snapshot URI, GLB URI,
  IM image URI, metrics JSON, generator version.
- `asset_drawing_provenance`: primitive/space id, source file hash, source
  page/layer, confidence, manual edit flag.

IM export should consume a published model version and immutable generated
artifacts. Draft upload outputs should remain marked as draft until validation.
