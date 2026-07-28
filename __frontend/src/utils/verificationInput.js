export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".txt",
  ".csv",
  ".xlsx",
  ".zip",
];

export const ACCEPTED_DOCUMENT_TYPES = ACCEPTED_DOCUMENT_EXTENSIONS.join(",");

export function isAcceptedDocument(file) {
  if (!file?.name) return false;
  const normalizedName = file.name.toLowerCase();
  return ACCEPTED_DOCUMENT_EXTENSIONS.some((extension) => (
    normalizedName.endsWith(extension)
  ));
}
