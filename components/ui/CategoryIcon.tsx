import type { CategoryId } from "@/lib/types";

const PATHS: Record<CategoryId, React.ReactNode> = {
  fashion: (
    <>
      <path d="M12 4a2 2 0 1 1 2 2v1.2L21 12v2.5H3V12l7-4.8V6" />
    </>
  ),
  "art-studios": (
    <>
      <path d="M4 20c3.5 0 4.5-2.2 4.5-4.5L16.5 7.5 20 5l-2.5 3.5-8 8C7.2 16.5 4 16.8 4 20Z" />
      <path d="M13 6.5 17.5 11" />
    </>
  ),
  photography: (
    <>
      <path d="M3.5 8h3.2L8.2 5.8h7.6L17.3 8h3.2v11h-17V8Z" />
      <circle cx="12" cy="13.2" r="3.2" />
    </>
  ),
  "music-venues": (
    <>
      <path d="M9 17.5V6l10-2v11" />
      <circle cx="6.8" cy="18" r="2.2" />
      <circle cx="16.8" cy="15.5" r="2.2" />
    </>
  ),
  "creative-spaces": (
    <>
      <path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z" />
      <path d="M3.5 12 12 16.5 20.5 12" />
      <path d="M3.5 16.5 12 21l8.5-4.5" />
    </>
  ),
  galleries: (
    <>
      <path d="M4 4h16v12H4z" />
      <path d="M4 9h16" />
      <path d="M9 20h6" />
    </>
  ),
  "street-art": (
    <>
      <path d="M9 9h6v11H9z" />
      <path d="M11 9V6h3v3" />
      <path d="M18 4h2M18 8h2M5 5h2" />
    </>
  ),
};

export function CategoryIcon({
  category,
  size = 14,
  className,
}: {
  category: CategoryId;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[category]}
    </svg>
  );
}
