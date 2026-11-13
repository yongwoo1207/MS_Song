import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * 글쓰기 on a screen of its own: the whole phone, over the board, instead
 * of a box squeezed in at the top of the list. The page behind it stops
 * scrolling while it is open, so the keyboard never pushes the board about.
 */
export default function WriteScreen({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const body = document.body;
    const before = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = before;
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-0 z-50 bg-background duration-150 animate-in fade-in"
    >
      <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col">
        <header className="flex items-center gap-1 border-b px-2.5 py-2">
          <button
            type="button"
            aria-label="글쓰기 닫기"
            onClick={onClose}
            className="flex size-10 items-center justify-center text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
          <h1 className="flex-1 text-[15px] font-bold">{title}</h1>
        </header>
        <div className="flex min-h-0 flex-1 flex-col pb-[max(env(safe-area-inset-bottom),8px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
