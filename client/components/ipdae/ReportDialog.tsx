import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { eulReul } from "./ConfirmDelete";
import {
  HIDE_AFTER_REPORTS,
  REPORT_REASONS,
  type ReportReason,
} from "@shared/posts";
import { cn } from "@/lib/utils";

/** What each 신고 사유 covers, in the words of 이용약관 제4조. */
const WHAT: Record<ReportReason, string> = {
  보안: "부대·훈련 일정 등 군사보안",
  "욕설·비방": "욕설, 비방, 차별, 성적 표현",
  광고: "광고·홍보, 같은 글 반복",
  기타: "그 밖에 알릴 내용",
};

/**
 * 신고: pick one reason and send it. The same person can only report a post
 * once; HIDE_AFTER_REPORTS different people hide it from everyone.
 */
export default function ReportDialog({
  what,
  open,
  saving,
  onCancel,
  onConfirm,
}: {
  /** "글", "댓글" … */
  what: string;
  open: boolean;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (reason: ReportReason) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  useEffect(() => {
    if (open) setReason(null);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="w-[calc(100%-32px)] max-w-[360px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            이 {eulReul(what)} 신고할까요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            사유를 하나 골라주세요. 서로 다른 사람의 신고가 {HIDE_AFTER_REPORTS}
            번 쌓이면 자동으로 숨겨져요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul
          className="flex flex-col gap-1.5"
          role="radiogroup"
          aria-label="신고 사유"
        >
          {REPORT_REASONS.map((r) => (
            <li key={r}>
              <button
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-xl border px-3.5 py-2 text-left",
                  reason === r
                    ? "border-primary bg-accent"
                    : "border-border bg-card",
                )}
              >
                <span className="text-[14px] font-bold">{r}</span>
                <span className="text-[12px] text-muted-foreground">
                  {WHAT[r]}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-xl">
            취소
          </AlertDialogCancel>
          <button
            type="button"
            disabled={!reason || saving}
            onClick={() => reason && onConfirm(reason)}
            className="h-10 flex-1 rounded-xl bg-destructive text-sm font-bold text-destructive-foreground disabled:opacity-50"
          >
            신고하기
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
