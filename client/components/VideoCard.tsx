import { cn } from "@/lib/utils";
import { memo } from "react";

export interface VideoCardProps {
  rank: number;
  title: string;
  artist: string;
  youtubeId: string;
  onPlay?: (id: string) => void;
}

const ytThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

export const VideoCard = memo(function VideoCard({ rank, title, artist, youtubeId, onPlay }: VideoCardProps) {
  return (
    <div className={cn("group grid grid-cols-[80px_1fr] gap-4 items-center rounded-xl bg-card/70 backdrop-blur border p-3 hover:shadow-lg transition")}
      role="button"
      tabIndex={0}
      onClick={() => onPlay?.(youtubeId)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPlay?.(youtubeId); }}
    >
      <div className="relative overflow-hidden rounded-lg aspect-video w-32">
        <img src={ytThumb(youtubeId)} alt={`${title} 썸네일`} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg">▶</span>
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">#{rank.toString().padStart(2, "0")}</div>
        <div className="font-semibold leading-tight">{title}</div>
        <div className="text-sm text-muted-foreground">{artist}</div>
      </div>
    </div>
  );
});

export default VideoCard;
