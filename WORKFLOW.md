# Drawing Update Workflow

This document describes the intended working method for adding or updating drawing assets.

## Current Manual Pipeline

1. Keep raw PDFs/CAD files outside this Git repository.
2. Convert the drawing set into a web vector package.
3. Commit only the generated SVG pages and manifest.
4. Add or update the asset record in `src/asset-library.js`.
5. Add or update the parametric review model in `src/samples.js`.
6. Validate the app locally.
7. Push the static app and generated packages.

## PDF To SVG Package

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Run extraction:

```powershell
python tools\extract_pdf_vector_pages.py "C:\private-drawings\sample.pdf" --out generated\my-asset
```

The output shape is:

```text
generated/my-asset/
  manifest.json
  pages/
    page-01.svg
    page-02.svg
```

`manifest.json` is what the browser loads. Each page entry points to the SVG file and carries page title, drawing count, size, and text preview metadata.

## Model Registration

After creating the generated package:

1. Register the package URL in `src/asset-library.js`.
2. Point `modelReview.modelSampleId` to a model in `src/samples.js`.
3. Keep source-file descriptions high level; do not store private source paths.
4. Mark the drawing status honestly: `vectorized`, `draft`, `validated`, or `published`.

## 3D Model Authoring

The current 3D model is parametric and approximate. It should capture review-critical geometry:

- plan width/depth or polygon outline
- grid lines and column size
- core position and dimensions
- floor-to-floor height
- slab depth
- beam depth
- ceiling void
- finished ceiling height
- logistics clear height, dock height, rack/dock hints where relevant

For zone-area review, add `plan.areaBasisNote` and `plan.areaZones[]` in `src/samples.js`.
Use model-meter coordinates from the reviewed drawing dimensions:

- rectangle zones: `x`, `z`, `width`, `depth`
- polygon zones: `points: [[x, z], ...]`
- optional verified area override: `area`
- applicable floors: `levelIds`
- review note: `sourceNote`

Use this for ramp area, east/west or north/south warehouse area, dock apron,
core, elevator, restroom, stair, and common-corridor estimates. The viewer will
calculate `㎡ / 평` and show purple overlays from the same records.

Do not present generated 3D geometry as certified BIM. The source of truth is the validated drawing package plus the model JSON.

## Future Admin Upload Path

For production use, add a private admin/update flow:

1. Upload raw file to controlled storage.
2. Hash and register the raw source.
3. Run server-side PDF/DXF/DWG extraction.
4. Store generated vector package.
5. Review/calibrate scale and page-to-floor mapping.
6. Publish a model version.
7. Serve immutable viewer URLs to dashboards, IM decks, or asset pages.

This keeps the public/embedded review page light while still allowing new assets to be updated without code edits later.
