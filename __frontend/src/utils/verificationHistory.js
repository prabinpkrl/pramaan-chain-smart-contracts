const STORAGE_KEY = "pramaanchain.verificationHistory";
const MAX_ENTRIES = 100;

/**
 * Public verification history is a local browser convenience only. Private
 * citizen certificate assignments come from the application backend and are
 * deliberately separate from this non-authoritative device history.
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
