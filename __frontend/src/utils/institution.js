export function normalizePublicInstitutionId(value) {
  const normalized = value.trim().toUpperCase();
  if (
    normalized.length < 3
    || normalized.length > 48
    || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)
  ) {
    throw new Error(
      "Institution ID must be 3–48 letters or numbers with single hyphens between segments",
    );
  }
  return normalized;
}
