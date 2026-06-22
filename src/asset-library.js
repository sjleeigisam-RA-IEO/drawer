export const assetLibrary = [
  {
    id: "asset-office-alpha",
    assetId: "asset-office-alpha",
    name: "강남 오피스 A",
    assetClass: "office",
    modelSource: "sample",
    status: "validated",
    updatedAt: "2026-06-20",
    drawingReview: {
      packageId: "office-alpha-vector",
      packageUrl: "",
      status: "validated",
      reviewedAt: "2026-06-20",
      calibration: { status: "calibrated", scaleLabel: "A1 1:100" },
      annotationCount: 18,
      validatedSpaceCandidates: ["typical-office", "core", "columns"]
    },
    modelReview: {
      modelSampleId: "office-typical",
      status: "published",
      sourceVectorPackageId: "office-alpha-vector"
    },
    sourceFiles: [
      { kind: "pdf", name: "기준층 평면도.pdf", state: "validated" },
      { kind: "pdf", name: "입면도.pdf", state: "referenced" }
    ],
    provenanceNote: "기준층 반복, 코어, 기둥 그리드 검증 완료"
  },
  {
    id: "asset-logistics-beta",
    assetId: "asset-logistics-beta",
    name: "수도권 물류센터 B",
    assetClass: "logistics",
    modelSource: "sample",
    status: "draft",
    updatedAt: "2026-06-20",
    drawingReview: {
      packageId: "logistics-beta-vector",
      packageUrl: "",
      status: "draft",
      reviewedAt: "",
      calibration: { status: "pending", scaleLabel: "A1 1:200" },
      annotationCount: 6,
      validatedSpaceCandidates: ["warehouse", "dock", "office-annex"]
    },
    modelReview: {
      modelSampleId: "logistics-core",
      status: "draft",
      sourceVectorPackageId: "logistics-beta-vector"
    },
    sourceFiles: [
      { kind: "pdf", name: "창고 평면도.pdf", state: "validated" },
      { kind: "pdf", name: "단면도.pdf", state: "draft" },
      { kind: "dxf", name: "dock_grid.dxf", state: "referenced" }
    ],
    provenanceNote: "clear height, 도크, 랙존 검토용 초안"
  },
  {
    id: "asset-daechi2-pdf",
    assetId: "asset-daechi2-pdf",
    name: "대치2빌딩 PDF 샘플",
    assetClass: "office",
    modelSource: "sample",
    status: "draft",
    updatedAt: "2026-06-22",
    drawingReview: {
      packageId: "daechi2-pdf-vector",
      packageUrl: "generated/daechi2/manifest.json",
      status: "vectorized",
      reviewedAt: "2026-06-22",
      calibration: { status: "pending", scaleLabel: "A1 1:100 / A3 1:200" },
      annotationCount: 20,
      validatedSpaceCandidates: ["b1-plan", "1f-plan", "typical-office-plan"]
    },
    modelReview: {
      modelSampleId: "daechi2-pdf-sample",
      status: "draft",
      sourceVectorPackageId: "daechi2-pdf-vector"
    },
    sourceFiles: [
      { kind: "pdf", name: "도면(B1F~19F)_평면도.pdf", state: "sampled" },
      { kind: "png", name: "test_sample_page_02.png", state: "rendered-preview" }
    ],
    provenanceNote: "B1F~19F 20페이지 평면도에서 층 목록과 visible dimension을 샘플링"
  },
  {
    id: "asset-hobup-gangnam",
    assetId: "asset-hobup-gangnam",
    name: "이천호법 물류센터 · 강남물류",
    assetClass: "logistics",
    modelSource: "sample",
    status: "draft",
    updatedAt: "2026-06-22",
    drawingReview: {
      packageId: "hobup-gangnam-vector",
      packageUrl: "generated/hobup-gangnam/manifest.json",
      status: "vectorized",
      reviewedAt: "2026-06-22",
      calibration: { status: "pending", scaleLabel: "A1 준공도면 PDF / 축척 페이지별 상이" },
      annotationCount: 22,
      validatedSpaceCandidates: ["b2-plan", "b1-plan", "warehouse-plan", "section", "duct-plan"]
    },
    modelReview: {
      modelSampleId: "hobup-gangnam-logistics-sample",
      status: "draft",
      sourceVectorPackageId: "hobup-gangnam-vector"
    },
    sourceFiles: [
      { kind: "pdf", name: "강남물류 건축 평면도 8장", state: "vectorized" },
      { kind: "pdf", name: "강남물류 건축 단면도 5장", state: "vectorized" },
      { kind: "pdf", name: "강남물류 건축 입면도 3장", state: "vectorized" },
      { kind: "pdf", name: "강남물류 환기덕트 평면도 6장", state: "vectorized" }
    ],
    provenanceNote: "이천호법 강남물류 준공 PDF에서 평면/단면/입면/환기덕트 도면 22장을 선별"
  },
  {
    id: "asset-hobup-dongsan",
    assetId: "asset-hobup-dongsan",
    name: "이천호법 물류센터 · 동산물류",
    assetClass: "logistics",
    modelSource: "sample",
    status: "draft",
    updatedAt: "2026-06-22",
    drawingReview: {
      packageId: "hobup-dongsan-vector",
      packageUrl: "generated/hobup-dongsan/manifest.json",
      status: "vectorized",
      reviewedAt: "2026-06-22",
      calibration: { status: "pending", scaleLabel: "A1 준공도면 PDF / 축척 페이지별 상이" },
      annotationCount: 22,
      validatedSpaceCandidates: ["b2-plan", "b1-plan", "warehouse-plan", "section", "duct-plan"]
    },
    modelReview: {
      modelSampleId: "hobup-dongsan-logistics-sample",
      status: "draft",
      sourceVectorPackageId: "hobup-dongsan-vector"
    },
    sourceFiles: [
      { kind: "pdf", name: "동산물류 건축 평면도 8장", state: "vectorized" },
      { kind: "pdf", name: "동산물류 주단면도 3장", state: "vectorized" },
      { kind: "pdf", name: "동산물류 건물입면도 4장", state: "vectorized" },
      { kind: "pdf", name: "동산물류 환기덕트 평면도 7장", state: "vectorized" }
    ],
    provenanceNote: "이천호법 동산물류 준공 PDF에서 평면/주단면/입면/환기덕트 도면 22장을 선별"
  }
];
