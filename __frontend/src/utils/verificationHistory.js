const STORAGE_KEY = "pramaanchain.verificationHistory";
const MAX_ENTRIES = 100;

/**
 * The backend does not persist per-citizen verification history or document
 * ownership (see docs/FRONTEND_INTEGRATION.md — no citizen sessions yet), so
 * this is stored locally in the browser. It's a convenience list of what
 * *this device* has checked, not an authoritative or shared record.
 */
export function getVerificationHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addVerificationEntry(entry) {
  const history = getVerificationHistory();

  const next = [
    { ...entry, checkedAt: Date.now() },
    ...history,
  ].slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — history simply won't persist.
  }

  return next;
}

export function clearVerificationHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
