import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Heart, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { YouTubeMap } from "@shared/api";
import type { PostRank, SongRef } from "@shared/posts";
import {
  useSongCounts,
  useSongLikes,
  useToggleSongLike,
} from "@/hooks/useMyPosts";
import type { MemoryAuthor } from "@/lib/memories";
import { cn } from "@/lib/utils";
import MemoriesPanel from "./MemoriesPanel";
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
 * screen while it plays, as YouTube's embed policy requires. Under it the
 * song can be hearted and its 한마디 read and written, as on the 입대곡 tab.
 */
export default function SongPlayer({
  song,
  author,
  rank,
  aboutMonth,
  onClose,
}: {
  song: SongRef;
  /** Who a heart or a 한마디 from here is from */
  author: MemoryAuthor;
  /** The rank the listener holds now; null when they hold none */
  rank: PostRank | null;
  /** 'YYYY-MM' chart month a 한마디 files under */
  aboutMonth: string;
  onClose: () => void;
}) {
  const videos = useYouTubeMap();
  const videoId = videos.data?.[song.key];
  const [playing, setPlaying] = useState(true);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const counts = useSongCounts();
  const total = counts?.[song.key] ?? 0;
  const { likes, liked } = useSongLikes();
  const toggleLike = useToggleSongLike();
  const hearted = liked.has(song.key);
  const hearts = likes[song.key] ?? 0;
  useEffect(() => setPlaying(true), [song.key]);
  useEffect(() => setMemoriesOpen(false), [song.key]);

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
      <div className="flex h-10 items-stretch border-t border-muted">
        <button
          type="button"
          onClick={() =>
            toggleLike.mutate(
              {
                key: song.key,
                title: song.title,
                artist: song.artist,
                rank,
                author,
              },
              { onError: (err) => toast(err.message) },
            )
          }
          aria-pressed={hearted}
          aria-label={`${song.title} 좋아요 ${hearts}`}
          className={cn(
            "flex shrink-0 items-center gap-1 border-r border-muted pl-4 pr-3 text-[13px] font-bold",
            hearted ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Heart
            className={cn("size-4", hearted && "fill-current")}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="font-mono text-xs">{hearts}</span>
        </button>
        <button
          type="button"
          onClick={() => setMemoriesOpen(true)}
          aria-haspopup="dialog"
          className="flex min-w-0 flex-1 items-center gap-1.5 pl-3 pr-4 text-left text-[13px]"
        >
          <MessageCircle
            className="size-4 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="font-bold">이 노래의 한마디</span>
          <span className="font-mono text-xs text-ink-icon">{total}</span>
          <span className="flex-1" />
          <span className="text-xs font-bold text-primary">나도 남기기</span>
          <ChevronRight
            className="size-4 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>
      {memoriesOpen && (
        <MemoriesPanel
          song={song}
          rank={rank}
          aboutMonth={aboutMonth}
          author={author}
          onClose={() => setMemoriesOpen(false)}
        />
      )}
    </section>
  );
}
