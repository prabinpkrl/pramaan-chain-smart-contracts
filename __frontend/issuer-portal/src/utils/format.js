export function shortAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function verificationUrl(baseUrl, documentHash) {
  return `${baseUrl.replace(/\/$/, "")}/verify?hash=${encodeURIComponent(documentHash)}`;
}
