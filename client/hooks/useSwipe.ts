import { useRef } from "react";

/** How far a finger must travel sideways, in px, to count as a swipe. */
const MIN_DISTANCE = 60;

/**
 * Touch handlers for a sideways swipe: `onSwipe(1)` for a swipe to the
 * left (next), `onSwipe(-1)` to the right (previous). Mostly vertical
 * moves (scrolling) and swipes that start in a field or a sideways
 * scroller are ignored.
 */
export function useSwipe(onSwipe: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart(e: React.TouchEvent) {
      const t = e.touches[0];
      const target = e.target as HTMLElement;
      start.current =
        e.touches.length === 1 &&
        !target.closest("input, textarea, [data-no-swipe]")
          ? { x: t.clientX, y: t.clientY }
          : null;
    },
    onTouchEnd(e: React.TouchEvent) {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) {
        return;
      }
      onSwipe(dx < 0 ? 1 : -1);
    },
  };
}
