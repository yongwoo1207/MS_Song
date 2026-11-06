import { toast } from "sonner";

/**
 * Native share sheet on phones; on desktop (or if sharing is cancelled for
 * lack of support) copy the text + link instead.
 */
export async function shareOrCopy(data: { title: string; text: string; url: string }) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return; // user closed the sheet
    }
  }
  try {
    await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
    toast("링크를 복사했어요");
  } catch {
    toast("공유하지 못했어요", { description: data.url });
  }
}
