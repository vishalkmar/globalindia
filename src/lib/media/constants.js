/**
 * Media constants shared by server and admin UI. Pure data.
 */

const MB = 1024 * 1024;

/** Hard caps in code (Phase 7 todo 06). Admin settings may lower these, never raise them. */
export const HARD_LIMITS = Object.freeze({
  imageBytes: 5 * MB,
  pdfBytes: 10 * MB,
  filesPerBatch: 20,
});

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const PDF_MIME = ["application/pdf"];

export const MEDIA_FOLDERS = [
  { value: "library", label: "General" },
  { value: "products", label: "Products" },
  { value: "categories", label: "Categories" },
  { value: "pages", label: "Pages and banners" },
  { value: "gallery", label: "Gallery" },
  { value: "logos", label: "Logos" },
  { value: "insights", label: "Insights" },
  { value: "documents", label: "Documents (COA, SDS, TDS)" },
];
export const FOLDER_VALUES = MEDIA_FOLDERS.map((f) => f.value);

export const DOCUMENT_TYPES = [
  { value: "COA", label: "Certificate of Analysis (COA)" },
  { value: "SDS", label: "Safety Data Sheet (SDS / MSDS)" },
  { value: "TDS", label: "Technical Data Sheet (TDS)" },
  { value: "BROCHURE", label: "Brochure" },
  { value: "OTHER", label: "Other document" },
];

export const PUBLIC_ID_RE = /^gi_[a-f0-9]{32}$/;
