/**
 * Keeps open pages on the deployed version. A page keeps running the
 * bundle it first loaded (a tab left open, an in-app browser), so after a
 * deploy it shows old screens and calls APIs that have changed. We compare
 * the bundle this page runs with the one the live index.html names, and
 * reload once they differ (see VersionWatcher).
 */

const BUNDLE = /<script\b[^>]*\bsrc="([^"]*\/assets\/[^"]+\.js)"/;

/** The entry bundle an index.html loads, e.g. "/assets/index-abc.js". */
export function bundleOf(html: string): string | null {
  const m = BUNDLE.exec(html);
  return m ? new URL(m[1], "https://x.invalid").pathname : null;
}

/** The bundle this page runs; null on the dev server, which has none. */
export function runningBundle(): string | null {
  const el = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src*="/assets/"]',
  );
  return el ? new URL(el.src, document.baseURI).pathname : null;
}

/** The bundle the site serves now; null when it can't be told. */
export async function deployedBundle(): Promise<string | null> {
  try {
    const res = await fetch("/", {
      cache: "no-store",
      headers: { accept: "text/html" },
    });
    return res.ok ? bundleOf(await res.text()) : null;
  } catch {
    return null;
  }
}

/** Something typed and not sent yet, which a reload would lose. */
export function hasDraft(): boolean {
  return [
    ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'textarea, input[type="text"], input[type="search"], input:not([type])',
    ),
  ].some((el) => el.value.trim() !== "");
}

const RELOADED_FOR = "ipdaegok:reloaded-for";

/**
 * Reload to pick up `bundle`. Only once per bundle per tab, so a stale
 * cache can never loop; without session storage, never.
 */
export function reloadFor(bundle: string): void {
  try {
    if (sessionStorage.getItem(RELOADED_FOR) === bundle) return;
    sessionStorage.setItem(RELOADED_FOR, bundle);
  } catch {
    return;
  }
  window.location.reload();
}
