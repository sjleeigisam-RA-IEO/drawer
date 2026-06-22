# Design Notes

## Product Principle

The viewer is a review surface, not a modeling workstation. The current UI prioritizes fast inspection of existing asset state: select asset, inspect drawing, orbit model, read hover metrics, export view.

## Layout

- Left panel: asset selection, floor selection, layer toggles, summary, and IM view actions.
- Main panel: drawing or 3D viewport.
- Right panel: removed for now to maximize drawing/model area.
- Upload and parameter editing: hidden until the controlled admin workflow exists.

The same app can run standalone or inside an iframe. `embedded=1` hides the topbar and lets the viewport fill the frame.

## Drawing Stage

The drawing stage shows the generated SVG package directly in the browser:

- page dropdown for multi-page PDFs
- zoom controls for plan/elevation/section inspection
- status strip for vector package, calibration, and validation state

The SVG drawing is a preserved review artifact. It is not replaced by a screenshot unless the original source is raster-only.

## 3D Stage

The model stage is deliberately simple and legible:

- subdued dark grid background
- brighter differentiated slab, ceiling, service void, duct, and pipe colors
- transparent volume cues for usable clear space
- section and plan camera presets
- floor focus/slice behavior for single-floor inspection

Fixed metric cards were removed from the model surface. Metrics now appear as hover tooltips tied to the object under the pointer:

- column: size, height, grid spacing
- floor/space: area, floor-to-floor height, clear height, ceiling height
- slab/ceiling/service: relevant vertical build-up values

## Visual Semantics

- Slab: light grey structural mass.
- Wall/facade: neutral, low-opacity enclosure.
- Core: warm neutral solid block.
- Ceiling: warm pale band.
- Service void: light blue transparent layer.
- Duct: mint/green service run.
- Pipe: coral accent.
- Clear volume: amber transparent usable-space cue.

The palette is intentionally brighter than the initial dark prototype so ducts, slab, and ceiling zones remain distinguishable in screenshots.
