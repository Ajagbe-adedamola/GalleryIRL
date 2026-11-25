"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatCoords, instagramHandle, normaliseInstagram, normaliseWebsite, shareUrl, stripProtocol } from "@/lib/utils";
import type { Place } from "@/lib/types";
import { CategoryIcon } from "./ui/CategoryIcon";

interface PlacePanelProps {
  place: Place;
  onClose: () => void;
}

function Carousel({ place }: { place: Place }) {
  const [index, setIndex] = useState(0);
  const images = place.images.filter(Boolean);
  const poster = images[index];

  useEffect(() => setIndex(0), [place.id]);

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0b0f15]">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={`${place.name} — photo ${index + 1} of ${images.length}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: `radial-gradient(120% 120% at 20% 0%, ${CATEGORY_MAP[place.category].glow} 0%, rgba(7,10,14,0.95) 62%)`,
          }}
          role="img"
          aria-label={`${place.name} — no photo supplied`}
        >
          <span className="flex flex-col items-center gap-2 text-white/60">
            <span style={{ color: CATEGORY_MAP[place.category].color }}>
              <CategoryIcon category={place.category} size={30} />
            </span>
            <span className="mono-label">Photo pending</span>
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070a0f] via-transparent to-transparent" />

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setIndex((value) => (value + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Photos">
            {images.map((image, dotIndex) => (
              <button
                key={`${image}-${dotIndex}`}
                type="button"
                role="tab"
                aria-selected={dotIndex === index}
                aria-label={`Photo ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
                className={
                  dotIndex === index
                    ? "h-1.5 w-4 rounded-full bg-white"
                    : "h-1.5 w-1.5 rounded-full bg-white/40 hover:bg-white/70"
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlaceBody({ place, onClose }: PlacePanelProps) {
  const category = CATEGORY_MAP[place.category];
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const instagramUrl = normaliseInstagram(place.instagram);
  const websiteUrl = normaliseWebsite(place.website);

  useEffect(() => {
    setReportOpen(false);
    setStatus("idle");
    setReason("");
    setShareState("idle");
  }, [place.id]);

  const share = async () => {
    const url = shareUrl(place.slug);
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2000);
    } catch {
      setShareState("failed");
      window.setTimeout(() => setShareState("idle"), 2500);
    }
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) return;
    setStatus("sending");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: place.id, reason }),
      });
      if (!response.ok) throw new Error("failed");
      setStatus("sent");
      setReason("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <Carousel place={place} />

      <div className="panel-scroll flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mono-label" style={{ color: category.color }}>
              {place.neighbourhood}
              {place.approximate ? " · approximate" : ""}
            </p>
            <h2 className="mt-1.5 text-[22px] font-extralight leading-tight tracking-[-0.01em] text-white">
              {place.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close place panel"
            className="btn mt-0.5 h-8 w-8 shrink-0 rounded-full p-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="chip" data-active="true">
            <span style={{ color: category.color }}>
              <CategoryIcon category={place.category} size={13} />
            </span>
            {category.shortLabel}
          </span>
          {place.verified ? (
            <span className="chip border-[var(--accent)]/40 bg-[var(--accent-soft)] text-white">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m4 12 5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified
            </span>
          ) : null}
          <span className="chip font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
            {place.source === "osm" ? "OpenStreetMap" : place.source === "curated" ? "Curated" : "Community"}
          </span>
        </div>

        {place.description ? (
          <p className="mt-4 text-[12.5px] font-light leading-relaxed text-white/70">{place.description}</p>
        ) : (
          <p className="mt-4 text-[12px] italic leading-relaxed text-white/35">No description yet.</p>
        )}

        <dl className="mt-5 space-y-2.5 border-t border-white/[0.07] pt-4 text-[11.5px]">
          <div className="flex items-baseline gap-3">
            <dt className="mono-label w-[74px] shrink-0">Opening</dt>
            <dd className="text-white/70">{place.opening_hours ?? "Hours not listed"}</dd>
          </div>
          <div className="flex items-baseline gap-3">
            <dt className="mono-label w-[74px] shrink-0">Location</dt>
            <dd className="font-mono text-[10.5px] text-white/60">
              {formatCoords(place.lat, place.lng)}
              {place.approximate ? " (approx.)" : ""}
            </dd>
          </div>
          {instagramUrl ? (
            <div className="flex items-baseline gap-3">
              <dt className="mono-label w-[74px] shrink-0">Instagram</dt>
              <dd className="min-w-0">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-white/80 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  {instagramHandle(instagramUrl) ?? "Instagram"}
                </a>
              </dd>
            </div>
          ) : null}
          {websiteUrl ? (
            <div className="flex items-baseline gap-3">
              <dt className="mono-label w-[74px] shrink-0">Website</dt>
              <dd className="min-w-0">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-white/80 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  {stripProtocol(websiteUrl)}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

        {place.approximate ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-white/45">
            This is a home-based creative who chose an approximate location. The pin is rounded to roughly
            300 m and the exact address is never published.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent flex-1"
          >
            Directions
            <span aria-hidden="true">↗</span>
          </a>
          <button type="button" onClick={share} className="btn flex-1">
            {shareState === "copied" ? "Link copied" : shareState === "failed" ? "Copy failed" : "Share"}
          </button>
          <button
            type="button"
            onClick={() => setReportOpen((value) => !value)}
            aria-expanded={reportOpen}
            className="btn"
          >
            Report
          </button>
        </div>

        {status === "sent" ? (
          <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-[11px] text-white/80">
            Thanks — your report is queued for moderation.
          </p>
        ) : null}

        {reportOpen ? (
          <form onSubmit={submitReport} className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <label htmlFor="report-reason" className="mono-label">
              What is wrong?
            </label>
            <textarea
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              required
              minLength={5}
              placeholder="Closed down, wrong location, duplicate…"
              className="field mt-2 resize-none"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] text-white/35">{reason.length}/500</span>
              <button type="submit" disabled={status === "sending"} className="btn px-3 py-1.5 text-[10.5px]">
                {status === "sending" ? "Sending…" : "Send report"}
              </button>
            </div>
            {status === "error" ? (
              <p className="mt-2 text-[10.5px] text-rose-300">Could not send that report. Try again later.</p>
            ) : null}
          </form>
        ) : null}

        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
          /place/{place.slug}
        </p>
      </div>
    </>
  );
}

export function PlacePanel({ place, onClose }: PlacePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => {
    setExpanded(false);
    setDragHeight(null);
  }, [place.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <aside
        className="pointer-events-none absolute bottom-4 right-0 top-[86px] z-20 hidden w-[418px] px-4 lg:block"
        aria-label="Place details"
      >
        <div className="pointer-events-auto glass flex h-full flex-col overflow-hidden rounded-2xl">
          <PlaceBody place={place} onClose={onClose} />
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div
          ref={sheetRef}
          className="glass flex flex-col overflow-hidden rounded-t-2xl border-b-0"
          style={{
            height: dragHeight ?? (expanded ? "86dvh" : "54dvh"),
            transition: dragHeight === null ? "height 260ms cubic-bezier(0.22,0.8,0.3,1)" : "none",
          }}
          role="dialog"
          aria-modal="false"
          aria-label="Place details"
        >
          <div
            className="flex shrink-0 cursor-grab items-center justify-center py-2.5 active:cursor-grabbing"
            onPointerDown={(event) => {
              (event.target as HTMLElement).setPointerCapture(event.pointerId);
              dragStart.current = {
                y: event.clientY,
                height: sheetRef.current?.getBoundingClientRect().height ?? 380,
              };
            }}
            onPointerMove={(event) => {
              if (!dragStart.current) return;
              const next = dragStart.current.height + (dragStart.current.y - event.clientY);
              setDragHeight(Math.max(120, Math.min(window.innerHeight * 0.92, next)));
            }}
            onPointerUp={() => {
              if (dragHeight !== null) {
                if (dragHeight < window.innerHeight * 0.26) onClose();
                else setExpanded(dragHeight > window.innerHeight * 0.6);
              }
              dragStart.current = null;
              setDragHeight(null);
            }}
          >
            <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="absolute right-2 top-1 rounded-full px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/45"
              aria-label={expanded ? "Collapse place details" : "Expand place details"}
              aria-expanded={expanded}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <PlaceBody place={place} onClose={onClose} />
        </div>
      </div>
    </>
  );
}
