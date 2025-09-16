import { cn } from "@/lib/utils";
import { useMemo } from "react";

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ value, onChange, placeholder = "제목 또는 가수 검색", className }: SearchBarProps) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  const clearVisible = useMemo(() => value.length > 0, [value]);

  return (
    <div className={cn("relative", className)}>
      <input
        value={value}
        onChange={handle}
        className="w-full rounded-xl border bg-background/70 backdrop-blur px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-primary/40"
        placeholder={placeholder}
      />
      {clearVisible && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="검색어 지우기"
        >
          ✕
        </button>
      )}
    </div>
  );
}
