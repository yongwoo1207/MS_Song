import { type RefObject, useEffect, useRef } from "react";

const CLOSE_DISTANCE = 90; // px pulled down
const CLOSE_VELOCITY = 0.5; // px/ms flick
const SLOP = 6; // px before a move counts as a drag

/**
 * Pull a bottom panel down to close it.
 * - Touch: from the grab area, or from the list when it is scrolled to the
 *   top, so normal list scrolling keeps working.
 * - Mouse: drag the grab area (desktop browsers have no touch events).
 */
export function useDragToClose(
  panelRef: RefObject<HTMLElement>,
  handleRef: RefObject<HTMLElement>,
  listRef: RefObject<HTMLElement>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    const handle = handleRef.current;
    if (!panel || !handle) return;

    let startY = 0;
    let startT = 0;
    let dy = 0;
    let armed = false; // may become a drag
    let dragging = false;

    const setOffset = (y: number, animate: boolean) => {
      panel.style.transition = animate ? "transform 180ms ease-out" : "none";
      panel.style.transform = y ? `translateY(${y}px)` : "";
    };

    const begin = (y: number, t: number) => {
      startY = y;
      startT = t;
      dy = 0;
      dragging = false;
    };

    /** Returns true once the gesture is a downward drag. */
    const track = (y: number) => {
      if (!armed) return false;
      dy = y - startY;
      if (!dragging) {
        if (dy < -SLOP) armed = false; // moving up: leave it to scrolling
        if (dy < SLOP) return false;
        dragging = true;
      }
      setOffset(Math.max(0, dy), false);
      return true;
    };

    const finish = (t: number) => {
      const wasDragging = dragging;
      armed = dragging = false;
      if (!wasDragging) return;
      const velocity = dy / Math.max(1, t - startT);
      if (dy > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
        setOffset(panel.offsetHeight, true);
        window.setTimeout(() => closeRef.current(), 170);
      } else {
        setOffset(0, true);
      }
    };

    // Touch
    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as Node;
      const list = listRef.current;
      armed =
        handle.contains(target) ||
        (!!list?.contains(target) && list.scrollTop <= 0);
      begin(e.touches[0].clientY, e.timeStamp);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (track(e.touches[0].clientY)) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => finish(e.timeStamp);

    // Mouse
    const onMouseMove = (e: PointerEvent) => track(e.clientY);
    const onMouseUp = (e: PointerEvent) => {
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
      finish(e.timeStamp);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as Element).closest("button")) return; // keep the X clickable
      armed = true;
      begin(e.clientY, e.timeStamp);
      window.addEventListener("pointermove", onMouseMove);
      window.addEventListener("pointerup", onMouseUp);
    };

    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
    panel.addEventListener("touchend", onTouchEnd);
    panel.addEventListener("touchcancel", onTouchEnd);
    handle.addEventListener("pointerdown", onPointerDown);
    return () => {
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
      panel.removeEventListener("touchend", onTouchEnd);
      panel.removeEventListener("touchcancel", onTouchEnd);
      handle.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
    };
  }, [panelRef, handleRef, listRef]);
}
