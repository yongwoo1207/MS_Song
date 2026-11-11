import { useState } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Text box with the security warning, a length counter and cancel / submit,
 * used for 커뮤니티 글, 선후임 소통 글 and their replies.
 */
export default function PostComposer({
  id,
  label,
  help,
  hint,
  placeholder,
  maxLength,
  submitLabel,
  saving,
  autoFocus = true,
  titleMaxLength,
  titlePlaceholder = "제목",
  initialTitle = "",
  initialBody = "",
  onCancel,
  onSubmit,
}: {
  id: string;
  label: string;
  help?: string;
  /** Who it will show as */
  hint: string;
  placeholder: string;
  maxLength: number;
  submitLabel: string;
  saving: boolean;
  autoFocus?: boolean;
  /** Set to ask for a title above the text */
  titleMaxLength?: number;
  titlePlaceholder?: string;
  /** Editing: the text there now */
  initialTitle?: string;
  initialBody?: string;
  onCancel?: () => void;
  onSubmit: (body: string, done: () => void, title: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialBody);
  const [error, setError] = useState("");
  const withTitle = titleMaxLength !== undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withTitle && !title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    if (!text.trim()) {
      setError("내용을 입력해주세요");
      return;
    }
    onSubmit(
      text,
      () => {
        setText("");
        setTitle("");
      },
      title.trim(),
    );
  };

  return (
    <form
      id={id}
      onSubmit={submit}
      className="flex flex-col gap-1.5 rounded-xl bg-background px-3 pb-2.5 pt-2.5"
    >
      <label
        htmlFor={withTitle ? `${id}-title` : `${id}-text`}
        className="text-[12.5px] font-bold"
      >
        {label}
      </label>
      {help && (
        <p className="text-xs leading-normal text-muted-foreground">{help}</p>
      )}
      <p className="flex items-center gap-1 text-[11px] font-bold text-destructive">
        <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
        부대명, 위치, 일정, 실명은 쓰지 말아주세요
      </p>
      {withTitle && (
        <input
          id={`${id}-title`}
          autoFocus={autoFocus}
          value={title}
          maxLength={titleMaxLength}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError("");
          }}
          placeholder={titlePlaceholder}
          aria-invalid={!!error && !title.trim()}
          className="h-10 rounded-xl border border-input bg-field px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      )}
      <textarea
        id={`${id}-text`}
        aria-label={withTitle ? "내용" : undefined}
        autoFocus={autoFocus && !withTitle}
        value={text}
        maxLength={maxLength}
        rows={4}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError("");
        }}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={`${id}-help`}
        className="min-h-[88px] resize-none rounded-xl border border-input bg-field px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div
        id={`${id}-help`}
        className="flex items-center justify-between gap-2 text-[11px]"
      >
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-ink-icon">{hint}</span>
        )}
        <span className="shrink-0 font-mono text-ink-icon">
          {text.length}/{maxLength}
        </span>
      </div>
      <div className="flex gap-1.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 flex-1 rounded-xl border bg-card text-[13px] font-bold text-muted-foreground"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="h-10 flex-[2] rounded-xl bg-primary text-[13px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
