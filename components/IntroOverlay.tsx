"use client";

export function IntroOverlay({
  visible,
  onSkip,
  placeCount,
}: {
  visible: boolean;
  onSkip: () => void;
  placeCount: number;
}) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end gap-6 px-4 pb-24 sm:justify-between sm:px-8 sm:py-28">
      <div className="hidden sm:block" />
      <div className="intro-rise max-w-xl">
        <p className="mono-label text-[var(--accent)]">Lagos right now · 6.5244° N 3.3792° E</p>
        <h1 className="mt-3 text-[clamp(2rem,6vw,4.4rem)] font-extralight uppercase leading-[0.95] tracking-[0.02em] text-white">
          Lagos Street
          <br />
          Culture Map
        </h1>
        <p className="mt-4 max-w-md text-[13px] font-light leading-relaxed text-white/70">
          A living index of the city&apos;s independent fashion, studios, galleries, stages and walls.
          Tilt the map, follow a creative walk, and move through the light.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
          <span className="font-mono">{placeCount} places</span>
          <span className="font-mono">10 neighbourhoods</span>
          <span className="font-mono">Creative walks</span>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-3 self-end sm:self-end">
        <button type="button" onClick={onSkip} className="btn glass rounded-full px-4 py-2 text-white">
          Skip intro
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
