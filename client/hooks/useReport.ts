import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReportReason } from "@shared/posts";
import { memoryStore } from "@/lib/memories";
import { invalidatePosts } from "./postsCache";

/** 신고 a post or 댓글 someone else wrote, with one of REPORT_REASONS. */
export function useReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: ReportReason }) =>
      memoryStore.report(id, reason),
    onSuccess: () => invalidatePosts(qc),
  });
}
