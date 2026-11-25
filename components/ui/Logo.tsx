export function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="13.5" stroke="var(--accent)" strokeOpacity="0.5" />
        <path d="M2.5 16h27" stroke="var(--accent)" strokeOpacity="0.28" strokeDasharray="2 3" />
        <path
          d="M16 2.5c4.4 3.6 6.6 8.2 6.6 13.5S20.4 25.9 16 29.5C11.6 25.9 9.4 21.3 9.4 16S11.6 6.1 16 2.5Z"
          stroke="var(--accent)"
          strokeOpacity="0.45"
        />
        <circle cx="16" cy="16" r="3.4" fill="var(--accent)" />
      </svg>
    </span>
  );
}
