import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * "지울까요?" asked inside the page. window.confirm is blocked or answered
 * "no" right away by some in-app browsers, which silently stopped deletes.
 */
export default function ConfirmDelete({
  what,
  open,
  onCancel,
  onConfirm,
}: {
  /** "댓글", "글" … */
  what: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="w-[calc(100%-32px)] max-w-[360px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            이 {eulReul(what)} 지울까요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            지운 글은 되돌릴 수 없어요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-xl">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-10 flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            지우기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "글" → "글을", "댓글" → "댓글을", "노래" → "노래를" */
export function eulReul(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const final = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${final ? "을" : "를"}`;
}
