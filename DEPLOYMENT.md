# Deployment Notes

## Static Hosting

The app is static. A deploy target only needs to serve:

- `index.html`
- `styles.css`
- `src/**`
- `generated/**`

No server process is required after the SVG packages are generated.

## GitHub Pages

This repo can be published directly from the `main` branch root.

Expected project-site URL:

```text
https://sjleeigisam-ra-ieo.github.io/drawer/
```

Useful deployed URLs:

```text
https://sjleeigisam-ra-ieo.github.io/drawer/?mode=library&assetId=asset-daechi2-pdf&stage=model
https://sjleeigisam-ra-ieo.github.io/drawer/?mode=library&assetId=asset-hobup-gangnam&stage=drawing
https://sjleeigisam-ra-ieo.github.io/drawer/?embedded=1&mode=library&assetId=asset-hobup-dongsan&stage=model
```

The repository includes `.nojekyll` so GitHub Pages serves the static files without Jekyll processing.

## External Runtime Dependencies

The HTML import map currently loads these browser libraries from `unpkg.com`:

- Three.js `0.164.1`
- Three.js addons
- Lucide icons

For an internal production deployment, vendor these files or pin them behind an internal CDN if outbound CDN access is not guaranteed.

## Embedding

Example iframe:

```html
<iframe
  src="https://assets.example.com/drawing-review/?embedded=1&mode=library&assetId=asset-daechi2-pdf&stage=model"
  title="RA Drawing Review"
  loading="lazy"
  style="width: 100%; height: 760px; border: 0;"
></iframe>
```

If the parent site uses a restrictive Content Security Policy, allow:

- `frame-src` or `child-src` for the hosted drawing-review URL
- `script-src` for the app and vendored/CDN libraries
- `img-src` for same-origin SVG pages and data URLs if snapshots are used

## URL Contract

Supported query parameters:

- `mode=library`: load pre-registered asset records.
- `assetId=<id>`: select an asset from `src/asset-library.js`.
- `stage=drawing|model`: open the drawing or 3D stage.
- `embedded=1`: hide the standalone topbar for iframe use.

Examples:

```text
/drawing-review/?embedded=1&mode=library&assetId=asset-hobup-gangnam&stage=model
/drawing-review/?mode=library&assetId=asset-hobup-dongsan&stage=drawing
```

## What Is Not Deployed

Raw source drawings are not deployed from this repository. Production should keep source PDFs/CAD in private object storage and publish only reviewed vector/model artifacts to the static viewer.
