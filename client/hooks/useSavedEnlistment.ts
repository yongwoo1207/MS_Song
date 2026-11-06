import { useEffect } from "react";

const KEY = "ipdaegok:enlistment";

/**
 * Remembers the last enlistment query (?d=…&b=… plus any corrected dates) in
 * this browser only, so a returning visitor lands on their D-day. Storage can
 * be unavailable (private mode, blocked site data); everything still works
 * without it.
 */
export function loadSavedEnlistment(): string | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved && new URLSearchParams(saved).get("d") ? saved : null;
  } catch {
    return null;
  }
}

export function useSaveEnlistment(search: string, valid: boolean) {
  useEffect(() => {
    if (!valid) return;
    try {
      const params = new URLSearchParams(search);
      params.delete("edit");
      window.localStorage.setItem(KEY, params.toString());
    } catch {
      /* storage unavailable: nothing to remember */
    }
  }, [search, valid]);
}
