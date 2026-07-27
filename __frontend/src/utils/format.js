export function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function verificationUrl(baseUrl, documentHash) {
  return `${baseUrl.replace(/\/$/, "")}/verify/${documentHash}`;
}
