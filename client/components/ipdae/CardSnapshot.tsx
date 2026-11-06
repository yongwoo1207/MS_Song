import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { type CardImageResult, saveCardImage } from "@/lib/cardImage";

interface CardSnapshotProps {
  children: ReactNode;
  fileName: string;
  title: string;
  text: string;
  /** Capture waits until the content has what it needs (e.g. chart data). */
  ready?: boolean;
  onDone: (result: CardImageResult) => void;
}

/** Fixed width of the saved image in CSS px (rendered at 3x → 1170px). */
const WIDTH = 390;

/**
 * Renders the given content off-screen, turns it into an image once, then
 * reports back. Mount it to start a capture.
 */
export default function CardSnapshot({
  children,
  fileName,
  title,
  text,
  ready = true,
  onDone,
}: CardSnapshotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!ready || started.current || !ref.current) return; // StrictMode runs effects twice
    started.current = true;
    const loading = toast.loading("이미지 만드는 중…");
    saveCardImage(ref.current, { fileName, title, text })
      .then((r) => done.current(r))
      .catch(() => {
        toast("이미지를 만들지 못했어요");
        done.current({});
      })
      .finally(() => toast.dismiss(loading));
  }, [ready, fileName, title, text]);

  return createPortal(
    <div
      aria-hidden="true"
      style={{ position: "fixed", left: -10000, top: 0, width: WIDTH }}
    >
      <div
        ref={ref}
        className="flex flex-col gap-3 bg-background p-4 font-sans text-foreground"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
