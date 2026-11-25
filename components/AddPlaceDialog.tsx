"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { compressImage } from "@/lib/image-compress";
import { NEIGHBOURHOODS } from "@/lib/neighbourhoods";
import type { CategoryId } from "@/lib/types";
import type { TimeOfDayPreset } from "@/lib/time-of-day";
import { CategoryIcon } from "./ui/CategoryIcon";
import { LocationPicker } from "./map/LocationPicker";

const MAX_IMAGES = 4;

interface AddPlaceDialogProps {
  tod: TimeOfDayPreset;
  onClose: () => void;
}

export function AddPlaceDialog({ tod, onClose }: AddPlaceDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId>("street-art");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [approximate, setApproximate] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError(null);
    const room = MAX_IMAGES - images.length;
    const selection = Array.from(files).slice(0, room);
    if (files.length > room) setPhotoError(`Up to ${MAX_IMAGES} photos. Extra files were ignored.`);
    try {
      const compressed = await Promise.all(selection.map((file) => compressImage(file)));
      setImages((current) => [...current, ...compressed].slice(0, MAX_IMAGES));
    } catch (fileError) {
      setPhotoError(fileError instanceof Error ? fileError.message : "Could not read that image.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!coords) {
      setError("Set a location on the map before submitting.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          neighbourhood,
          description,
          instagram,
          website,
          lat: coords.lat,
          lng: coords.lng,
          approximate,
          images,
          company,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not submit this place.");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit this place.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-6">
      <button type="button" aria-label="Close add place form" onClick={onClose} className="absolute inset-0" tabIndex={-1} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-place-title"
        className="glass relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:max-h-[90dvh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="mono-label">Contribute</p>
            <h2 id="add-place-title" className="mt-1 text-[20px] font-extralight text-white">
              Add a place
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              Submissions are reviewed by a moderator before they appear on the map.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close form" className="btn h-8 w-8 rounded-full p-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="panel-scroll overflow-y-auto px-5 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" aria-hidden="true">
                <path d="m4 12 5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="mt-5 text-[20px] font-extralight text-white">Submitted for review</h3>
            <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-white/55">
              Thanks. A moderator will check the details before it joins the map. Nothing appears publicly
              until it is approved.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button type="button" onClick={onClose} className="btn btn-accent">
                Back to the map
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setDescription("");
                  setInstagram("");
                  setWebsite("");
                  setImages([]);
                  setCoords(null);
                }}
                className="btn"
              >
                Add another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="panel-scroll flex-1 overflow-y-auto px-5 py-5">
            {!configured ? (
              <p className="mb-4 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100/80">
                Supabase is not configured in this environment, so submissions will not be stored. Add
                your project keys to enable the review pipeline.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="place-name" className="mono-label">
                  Name <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  id="place-name"
                  ref={nameRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={90}
                  className="field mt-1.5"
                  placeholder="Studio, brand, wall or venue name"
                />
              </div>

              <fieldset className="sm:col-span-2">
                <legend className="mono-label">Category *</legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCategory(option.id)}
                      aria-pressed={category === option.id}
                      className="chip"
                      data-active={category === option.id}
                    >
                      <span style={{ color: option.color }}>
                        <CategoryIcon category={option.id} size={13} />
                      </span>
                      {option.shortLabel}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="place-neighbourhood" className="mono-label">
                  Neighbourhood <span className="text-[var(--accent)]">*</span>
                </label>
                <input
                  id="place-neighbourhood"
                  value={neighbourhood}
                  onChange={(event) => setNeighbourhood(event.target.value)}
                  required
                  list="neighbourhood-options"
                  className="field mt-1.5"
                  placeholder="Yaba, Surulere, Lekki…"
                />
                <datalist id="neighbourhood-options">
                  {NEIGHBOURHOODS.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="place-instagram" className="mono-label">
                  Instagram
                </label>
                <input
                  id="place-instagram"
                  value={instagram}
                  onChange={(event) => setInstagram(event.target.value)}
                  className="field mt-1.5"
                  placeholder="@handle"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="place-website" className="mono-label">
                  Website
                </label>
                <input
                  id="place-website"
                  type="text"
                  inputMode="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="field mt-1.5"
                  placeholder="https://"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="place-description" className="mono-label">
                  Description
                </label>
                <textarea
                  id="place-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={900}
                  className="field mt-1.5 resize-none"
                  placeholder="What happens here? Who should visit?"
                />
                <p className="mt-1 text-right font-mono text-[9px] text-white/30">{description.length}/900</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mono-label">Photos <span className="text-white/30">— up to 4, compressed on your device</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <div key={`${image.slice(-24)}-${index}`} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white/80"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES ? (
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/25 text-white/50 transition hover:border-[var(--accent)] hover:text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em]">Add</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        void handleFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
              {photoError ? <p className="mt-2 text-[10.5px] text-amber-200/80">{photoError}</p> : null}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="mono-label">Location <span className="text-[var(--accent)]">*</span></p>
                <p className="font-mono text-[9px] text-white/35">
                  {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "not set"}
                </p>
              </div>
              <div className="mt-2">
                <LocationPicker value={coords} onChange={setCoords} tod={tod} />
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <input
                  type="checkbox"
                  checked={approximate}
                  onChange={(event) => setApproximate(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-[11.5px] text-white/85">Approximate location</span>
                  <span className="mt-0.5 block text-[10.5px] leading-relaxed text-white/40">
                    For home-based creatives: rounds the pin to about 300 m and hides the exact address.
                  </span>
                </span>
              </label>
            </div>

            {/* Honeypot — hidden from humans and assistive tech */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[#080b10]/80 py-3 backdrop-blur">
              <p className="max-w-[55%] text-[9.5px] leading-relaxed text-white/30">
                By submitting you confirm this is a real place and images are yours to share.
              </p>
              <button type="submit" disabled={busy} className="btn btn-accent px-5">
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
