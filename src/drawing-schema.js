export const VECTOR_PACKAGE_VERSION = "ra-vector-drawing/v0.1";

export function normalizeVectorPackage(manifest) {
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : [];
  return {
    version: manifest?.version || VECTOR_PACKAGE_VERSION,
    id: manifest?.id || "unidentified-vector-package",
    sourceFile: manifest?.sourceFile || "unknown-source",
    sourceHash: manifest?.sourceHash || "",
    pageCount: Number(manifest?.pageCount || pages.length),
    units: manifest?.units || "pdf-points",
    pages: pages.map((page, index) => ({
      id: page.id || `page-${String(index + 1).padStart(2, "0")}`,
      index: Number(page.index || index + 1),
      title: page.title || `Page ${index + 1}`,
      drawingCount: Number(page.drawingCount || 0),
      width: Number(page.width || 0),
      height: Number(page.height || 0),
      svg: page.svg || "",
      textPreview: page.textPreview || ""
    }))
  };
}

export function createDrawingReview(asset, vectorPackage) {
  const review = asset?.drawingReview || {};
  return {
    assetId: asset?.assetId || asset?.id || "",
    packageId: vectorPackage?.id || review.packageId || "",
    status: review.status || (vectorPackage ? "draft" : "missing"),
    selectedPageId: vectorPackage?.pages?.[0]?.id || "",
    calibration: {
      status: review.calibration?.status || "not-started",
      scaleLabel: review.calibration?.scaleLabel || "",
      unitScaleToMeters: review.calibration?.unitScaleToMeters || null
    },
    annotationCount: Number(review.annotationCount || 0),
    validatedSpaceCandidates: review.validatedSpaceCandidates || [],
    publishedModelId: asset?.modelReview?.status === "published" ? asset.modelReview.modelSampleId : null,
    sourceHash: vectorPackage?.sourceHash || review.sourceHash || ""
  };
}

export function markReviewPublished(review, modelId) {
  return {
    ...review,
    status: "published",
    publishedModelId: modelId
  };
}

export function reviewStatusLabel(status) {
  return (
    {
      missing: "없음",
      draft: "초안",
      vectorized: "벡터화",
      "not-started": "대기",
      pending: "대기",
      calibrated: "보정됨",
      validated: "검증됨",
      published: "게시됨"
    }[status] || status || "-"
  );
}
