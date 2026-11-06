import { toBlob } from "html-to-image";
import { toast } from "sonner";
import { fontEmbedCss } from "./fontEmbed";

export interface CardImageResult {
  /** Object URL to show for long-press saving (phones without file sharing). */
  previewUrl?: string;
}

/**
 * Render a DOM node to a PNG and hand it to the user: the share sheet on
 * phones (it offers "이미지 저장"), a file download on desktop, and an
 * on-screen preview to long-press where neither works (in-app browsers).
 */
export async function saveCardImage(
  node: HTMLElement,
  { fileName, title, text }: { fileName: string; title: string; text: string },
): Promise<CardImageResult> {
  await document.fonts.ready;
  const fontEmbedCSS = await fontEmbedCss(node).catch(() => "");
  const blob = await toBlob(node, { pixelRatio: 3, cacheBust: false, fontEmbedCSS });
  if (!blob) throw new Error("이미지를 만들지 못했어요");
  const file = new File([blob], fileName, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return {};
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return {};
    }
  }

  const url = URL.createObjectURL(blob);
  if (window.matchMedia("(pointer: coarse)").matches) return { previewUrl: url };

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast("이미지를 저장했어요");
  return {};
}
