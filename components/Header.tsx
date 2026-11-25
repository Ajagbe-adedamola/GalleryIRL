"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { categoryColor, categoryLabel } from "@/lib/categories";
import { TIME_OF_DAY_PRESETS, type TimeOfDayId, type TimeOfDayPreset } from "@/lib/time-of-day";
import type { Place } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "./ui/Logo";

interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  results: Place[];
  onPickResult: (place: Place) => void;
  tod: TimeOfDayPreset;
  onTodChange: (id: TimeOfDayId) => void;
  mode: "3d" | "2d";
  onModeChange: (mode: "3d" | "2d") => void;
  onToggleFilters: () => void;
  filtersActive: boolean;
  onAddPlace: () => void;
}

export function Header({
  query,
  onQueryChange,
  results,
  onPickResult,
  tod,
  onTodChange,
  mode,
  onModeChange,
  onToggleFilters,
  filtersActive,
  onAddPlace,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const visible = open && trimmed.length > 0 && results.length > 0;
  const suggestions = useMemo(() => results.slice(0, 6), [results]);

  useEffect(() => setHighlight(0), [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commit = (place: Place) => {
    onPickResult(place);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-2.5 pt-2.5 sm:px-4 sm:pt-4">
      <div className="pointer-events-auto glass rounded-2xl px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Lagos Street Culture Map home">
            <Logo />
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13px] font-normal tracking-[0.01em] text-white">
                Lagos Street Culture
              </span>
              <span className="mono-label mt-0.5 block text-[8.5px]">Map · Lagos, Nigeria</span>
            </span>
          </Link>

          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 transition-colors focus-within:border-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="shrink-0 text-white/45">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.4-3.4" />
              </svg>
              <label htmlFor="place-search" className="sr-only">
                Search places, neighbourhoods or tags
              </label>
              <input
                id="place-search"
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  onQueryChange(event.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => window.setTimeout(() => setOpen(false), 140)}
                onKeyDown={(event) => {
                  if (!visible) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlight((index) => (index + 1) % suggestions.length);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlight((index) => (index - 1 + suggestions.length) % suggestions.length);
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const place = suggestions[highlight];
                    if (place) commit(place);
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Search name, neighbourhood or tag…"
                className="w-full bg-transparent text-[13px] font-light text-white outline-none placeholder:text-white/35"
                autoComplete="off"
                role="combobox"
                aria-expanded={visible}
                aria-controls="search-results"
                aria-autocomplete="list"
              />
              <kbd className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/30 lg:block">
                ⌘K
              </kbd>
            </div>

            {visible ? (
              <ul
                id="search-results"
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-white/10 bg-[#080b10]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
              >
                {suggestions.map((place, index) => (
                  <li key={place.id} role="option" aria-selected={index === highlight}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commit(place)}
                      onMouseEnter={() => setHighlight(index)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                        index === highlight ? "bg-white/[0.07]" : "hover:bg-white/[0.05]",
                      )}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: categoryColor(place.category) }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-white/90">{place.name}</span>
                        <span className="mono-label mt-0.5 block text-[8.5px]">
                          {place.neighbourhood} · {categoryLabel(place.category)}
                        </span>
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Open</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1 md:flex">
            {TIME_OF_DAY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onTodChange(preset.id)}
                aria-pressed={tod.id === preset.id}
                title={preset.label}
                className={cn(
                  "rounded-full px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] transition-colors",
                  tod.id === preset.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/75",
                )}
              >
                {preset.short}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1" role="group" aria-label="Map dimension">
              {(["3d", "2d"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onModeChange(option)}
                  aria-pressed={mode === option}
                  className={cn(
                    "rounded-full px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors",
                    mode === option ? "bg-white/10 text-white" : "text-white/40 hover:text-white/75",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleFilters}
              aria-label="Filters and layers"
              aria-pressed={filtersActive}
              className={cn(
                "btn h-9 w-9 rounded-full p-0",
                filtersActive ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white" : "",
              )}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
            </button>

            <button type="button" onClick={onAddPlace} className="btn btn-accent h-9 rounded-full pl-2.5 pr-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <span className="hidden text-[11px] sm:inline">Add a place</span>
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 md:hidden">
          <div className="flex flex-1 items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1">
            {TIME_OF_DAY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onTodChange(preset.id)}
                aria-pressed={tod.id === preset.id}
                className={cn(
                  "flex-1 rounded-full px-1 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] transition-colors",
                  tod.id === preset.id ? "bg-white/10 text-white" : "text-white/40",
                )}
              >
                {preset.short}
              </button>
            ))}
          </div>
          <span className="mono-label hidden text-[8px] sm:block">Light</span>
        </div>
      </div>
    </header>
  );
}
