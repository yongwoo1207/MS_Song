import { useEffect, useRef } from "react";

interface YouTubeFrameProps {
  videoId: string;
  title: string;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
  /** Video removed, private or not embeddable (YouTube error 2/5/100/101/150). */
  onError: () => void;
}

const YT_ORIGINS = ["https://www.youtube-nocookie.com", "https://www.youtube.com"];

/**
 * Embedded player driven through the IFrame API's postMessage protocol, so no
 * extra script has to be loaded.
 */
export default function YouTubeFrame({
  videoId,
  title,
  playing,
  onPlayingChange,
  onEnded,
  onError,
}: YouTubeFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cb = useRef({ onPlayingChange, onEnded, onError });
  cb.current = { onPlayingChange, onEnded, onError };

  const send = (func: string, args: unknown[] = []) =>
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!YT_ORIGINS.includes(e.origin) || e.source !== ref.current?.contentWindow) return;
      let data: { event?: string; info?: unknown };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data.event === "onError") {
        cb.current.onError();
        return;
      }
      const state =
        data.event === "onStateChange"
          ? data.info
          : data.event === "infoDelivery"
            ? (data.info as { playerState?: number } | undefined)?.playerState
            : undefined;
      if (state === 0) cb.current.onEnded();
      else if (state === 1) cb.current.onPlayingChange(true);
      else if (state === 2) cb.current.onPlayingChange(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    send(playing ? "playVideo" : "pauseVideo");
  }, [playing]);

  const onLoad = () => {
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: videoId, channel: "widget" }),
      "*",
    );
    send("addEventListener", ["onStateChange"]);
  };

  const src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` +
    `?enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <iframe
      ref={ref}
      key={videoId}
      src={src}
      title={title}
      onLoad={onLoad}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      className="aspect-video min-h-[200px] w-full shrink-0 bg-foreground"
    />
  );
}
