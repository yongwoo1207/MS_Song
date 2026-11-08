const KEY = "ipdaegok:device";
let fallback: string | null = null;

const newToken = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/**
 * Random id for this browser, sent with every post request so the server
 * can tell "my" posts apart without a login. Only its hash is stored there.
 * If storage is blocked it lasts until reload.
 */
export function deviceToken(): string {
  try {
    let token = window.localStorage.getItem(KEY);
    if (!token) {
      token = newToken();
      window.localStorage.setItem(KEY, token);
    }
    return token;
  } catch {
    return (fallback ??= newToken());
  }
}
