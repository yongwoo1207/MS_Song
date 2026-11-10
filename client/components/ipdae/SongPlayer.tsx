import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { YouTubeMap } from "@shared/api";
import type { SongRef } from "@shared/posts";
import YouTubeFrame from "./YouTubeFrame";
import { PauseIcon, PlayIcon } from "./icons";

/** "artist|title" → YouTube video id (public/data/youtube.json). */
function useYouTubeMap() {
  return useQuery({
    queryKey: ["youtube-map"],
    queryFn: async (): Promise<YouTubeMap> => {
      const res = await fetch("/data/youtube.json");
      if (!res.ok) throw new Error(`youtube.json ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
  });
}

/**
 * One song playing on top of a list (the 커뮤니티 feed). The video stays on
 * screen while it plays, as YouTube's embed policy requires.
 */
export default function SongPlayer({
  song,
  onClose,
}: {
  song: SongRef;
  onClose: () => void;
}) {
  const videos = useYouTubeMap();
  const videoId = videos.data?.[song.key];
  const [playing, setPlaying] = useState(true);
  useEffect(() => setPlaying(true), [song.key]);

  // No video for this song: say so and close
  const missing = videos.isError || (videos.isSuccess && !videoId);
  useEffect(() => {
    if (!missing) return;
    toast(`'${song.title}' 영상을 찾지 못했어요`);
    onClose();
  }, [missing, song.title, onClose]);

  if (!videoId) return null;

  return (
    <section
      aria-label="지금 재생 중"
      className="sticky top-0 z-20 flex flex-col border-b bg-background"
    >
      <YouTubeFrame
        videoId={videoId}
        title={`${song.title} - ${song.artist}`}
        playing={playing}
        onPlayingChange={setPlaying}
        onEnded={() => setPlaying(false)}
        onError={() => {
          toast(`'${song.title}' 영상을 재생할 수 없어요`);
          onClose();
        }}
      />
      <div className="flex items-center gap-1 py-2 pl-4 pr-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{song.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {song.artist}
          </span>
        </div>
        <button
          type="button"
          aria-label={playing ? "일시정지" : "재생"}
          onClick={() => setPlaying(!playing)}
          className="flex size-10 items-center justify-center rounded-full text-foreground"
        >
          {playing ? (
            <PauseIcon className="size-[18px]" />
          ) : (
            <PlayIcon className="size-[18px]" />
          )}
        </button>
        <button
          type="button"
          aria-label="플레이어 닫기"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground"
        >
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
