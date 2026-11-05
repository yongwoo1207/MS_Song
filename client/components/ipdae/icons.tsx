/** Filled transport icons from the design (lucide has no filled variants). */
type IconProps = { className?: string };

export const PlayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M7 4.5v15l12-7.5z" />
  </svg>
);

export const PauseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const PrevIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M17 5v14L7 12z" />
    <rect x="5" y="5" width="2.4" height="14" rx="1" />
  </svg>
);

export const NextIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M7 5v14l10-7z" />
    <rect x="16.6" y="5" width="2.4" height="14" rx="1" />
  </svg>
);
