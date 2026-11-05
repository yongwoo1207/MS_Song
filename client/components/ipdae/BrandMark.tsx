/** Dog-tag mark + wordmark shown above the input headline. */
export default function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-primary"
      >
        <rect x="5" y="3" width="14" height="18" rx="7" />
        <circle cx="12" cy="7" r="1.2" />
        <path d="M9 13h6M9 16h4" />
      </svg>
      <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-primary">
        IPDAEGOK
      </span>
    </div>
  );
}
