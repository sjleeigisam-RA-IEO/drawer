# RA Drawing Review

PDF/CAD drawing evidence를 웹에서 검토 가능한 벡터 도면과 3D 검토 모델로 나누어 다루는 독립형 프로토타입입니다.

현재 버전의 핵심은 "원본 도면을 바로 3D라고 주장하지 않는다"는 점입니다. 먼저 PDF/CAD를 웹용 SVG 패키지로 변환해 확대 가능한 2D 도면으로 확인하고, 검토가 끝난 모델 데이터만 3D 뷰어로 넘깁니다.

## What Is Included

- `index.html`, `styles.css`: standalone web app shell.
- `src/`: asset library, drawing review state, parametric model schema, Three.js viewer.
- `generated/`: committed sample SVG drawing packages and manifests.
  - `daechi2`: office PDF sample.
  - `hobup-gangnam`: Icheon Hobup logistics center, Gangnam logistics building.
  - `hobup-dongsan`: Icheon Hobup logistics center, Dongsan logistics building.
- `tools/extract_pdf_vector_pages.py`: PDF pages to SVG + manifest extraction utility.
- `ARCHITECTURE.md`, `WORKFLOW.md`, `DESIGN.md`, `DEPLOYMENT.md`: solution structure, operating process, UX/design rules, deployment notes.

Raw drawing PDFs are intentionally not committed. They should stay in private storage or a controlled upload pipeline; the repo carries the derived web-ready SVG packages used by the sample viewer.

## Run Locally

From this repository root:

```powershell
python -m http.server 8899
```

Open:

```text
http://127.0.0.1:8899/
```

When this folder is mounted under another static site, the app also works from a subpath such as:

```text
http://127.0.0.1:8899/drawing-review/
```

The app must be served over HTTP because browser module loading and SVG manifest fetches do not work reliably from `file://`.

## Useful URLs

```text
http://127.0.0.1:8899/?mode=library&assetId=asset-daechi2-pdf&stage=drawing
http://127.0.0.1:8899/?mode=library&assetId=asset-daechi2-pdf&stage=model
http://127.0.0.1:8899/?mode=library&assetId=asset-hobup-gangnam&stage=model
http://127.0.0.1:8899/?mode=library&assetId=asset-hobup-dongsan&stage=drawing
```

For iframe embedding, add `embedded=1`:

```html
<iframe
  src="https://your-host.example/drawing-review/?embedded=1&mode=library&assetId=asset-hobup-gangnam&stage=model"
  title="RA Drawing Review"
></iframe>
```

## Product Shape

The current app is read-only for review:

1. Select an asset from the left panel.
2. Inspect extracted vector drawing pages in the drawing stage.
3. Switch to the 3D model stage for orbit, elevation, section, and plan views.
4. Use layer toggles for structure, ceilings, service void/ducts, hover metrics, and section mode.
5. Use the floor selector to focus or slice a floor while keeping labels and hover metrics available.
6. Export snapshots for IM or review materials.

Parameter editing and upload/admin workflows are deliberately deferred. The next production step should be a controlled asset-update pipeline rather than ad hoc client-side PDF parsing.

## Validate Before Commit

```powershell
node --check src\app.js
node --check src\viewer.js
node --check src\modeler.js
node --check src\schema.js
node --check src\asset-library.js
node --check src\samples.js
python -m py_compile tools\extract_pdf_vector_pages.py
```

## Repository Boundary

This repository is the standalone solution boundary. It can be embedded in the RA dashboard later, but it should not depend on dashboard runtime code. Dashboards should link to published asset/model URLs or embed the static app URL with query parameters.
