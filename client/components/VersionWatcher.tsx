import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  deployedBundle,
  hasDraft,
  reloadFor,
  runningBundle,
} from "@/lib/version";

const CHECK_EVERY = 5 * 60_000; // on page changes
const CHECK_ON_RETURN = 60_000; // when the page comes back into view

/**
 * Reloads the page onto a newly deployed version: when the user moves to
 * another page or comes back to the tab, never while something is typed.
 * Renders nothing; place inside the router.
 */
export default function VersionWatcher() {
  const { pathname } = useLocation();
  const running = useRef(runningBundle());
  const stale = useRef<string | null>(null); // the newer bundle, once seen
  const lastCheck = useRef(Date.now());

  const check = useCallback(async (minGap: number) => {
    if (!running.current) return null; // dev server
    if (stale.current) return stale.current;
    if (Date.now() - lastCheck.current < minGap) return null;
    lastCheck.current = Date.now();
    const deployed = await deployedBundle();
    if (deployed && deployed !== running.current) stale.current = deployed;
    return stale.current;
  }, []);

  // Moved to another page: a good moment, nothing typed there yet
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void check(CHECK_EVERY).then((bundle) => {
      if (bundle && !hasDraft()) reloadFor(bundle);
    });
  }, [pathname, check]);

  // Back to a tab or in-app browser left open since an older deploy
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void check(CHECK_ON_RETURN).then((bundle) => {
        if (bundle && !hasDraft()) reloadFor(bundle);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [check]);

  return null;
}
