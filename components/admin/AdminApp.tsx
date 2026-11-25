"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CATEGORIES, CATEGORY_MAP, categoryColor } from "@/lib/categories";
import { browserAuthClient } from "@/lib/supabase";
import type { CategoryId, Place, PlaceStatus } from "@/lib/types";
import { Logo } from "../ui/Logo";

type Tab = PlaceStatus | "all";

const STATUS_STYLES: Record<PlaceStatus, string> = {
  pending: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  approved: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  rejected: "border-rose-300/25 bg-rose-300/10 text-rose-100",
};

export function AdminApp() {
  const supabase = useMemo(() => browserAuthClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Place | null>(null);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const loadPlaces = useCallback(
    async (activeSession: Session) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/places", {
          headers: { authorization: `Bearer ${activeSession.access_token}` },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          places?: Place[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Could not load places.");
        setPlaces(payload.places ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load places.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (session) void loadPlaces(session);
  }, [session, loadPlaces]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    if (signInError) setAuthError(signInError.message);
    else setOtpSent(true);
  };

  const patch = async (place: Place, updates: Record<string, unknown>) => {
    if (!session) return;
    setBusyId(place.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/places/${place.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      const payload = (await response.json().catch(() => ({}))) as { place?: Place; error?: string };
      if (!response.ok || !payload.place) throw new Error(payload.error ?? "Update failed.");
      setPlaces((current) => current.map((row) => (row.id === place.id ? payload.place! : row)));
      setEditing((current) => (current?.id === place.id ? payload.place! : current));
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (place: Place) => {
    if (!session) return;
    if (!window.confirm(`Delete “${place.name}”? This cannot be undone.`)) return;
    setBusyId(place.id);
    try {
      const response = await fetch(`/api/admin/places/${place.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Delete failed.");
      setPlaces((current) => current.filter((row) => row.id !== place.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(
    () => ({
      pending: places.filter((place) => place.status === "pending").length,
      approved: places.filter((place) => place.status === "approved").length,
      rejected: places.filter((place) => place.status === "rejected").length,
      all: places.length,
    }),
    [places],
  );

  const visible = tab === "all" ? places : places.filter((place) => place.status === tab);

  if (!supabase) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6">
        <div className="glass max-w-md rounded-2xl p-6 text-center">
          <Logo className="mx-auto block" />
          <h1 className="mt-4 text-[20px] font-extralight">Moderation needs Supabase</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-white/55">
            Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY,
            run the migrations, then add your email to ADMIN_EMAILS and the admins table.
          </p>
          <Link href="/" className="btn btn-accent mt-5 inline-flex">
            Back to the map
          </Link>
        </div>
      </main>
    );
  }

  if (checking) {
    return (
      <main className="grid min-h-[100dvh] place-items-center">
        <p className="mono-label animate-pulse">Checking session…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6">
        <div className="glass w-full max-w-sm rounded-2xl p-6">
          <Logo />
          <p className="mono-label mt-4">Moderation</p>
          <h1 className="mt-1 text-[22px] font-extralight">Sign in</h1>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">
            Use an allowlisted email. We&apos;ll send a magic link.
          </p>
          {otpSent ? (
            <p className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-[11.5px] text-white/80">
              Check {email} for a sign-in link.
            </p>
          ) : (
            <form onSubmit={signIn} className="mt-4 space-y-3">
              <label htmlFor="admin-email" className="mono-label">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field"
                placeholder="you@example.com"
                autoComplete="email"
              />
              <button type="submit" className="btn btn-accent w-full">
                Send magic link
              </button>
              {authError ? <p className="text-[11px] text-rose-300">{authError}</p> : null}
            </form>
          )}
          <Link href="/" className="mono-label mt-5 block hover:text-white">
            ← Back to the map
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="mono-label">Moderation</p>
              <h1 className="text-[17px] font-light">Lagos Street Culture Map</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] text-white/40 sm:block">{session.user.email}</span>
            <Link href="/" className="btn">
              View map
            </Link>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="btn"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {(["pending", "approved", "rejected", "all"] as Tab[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              aria-pressed={tab === option}
              className="chip capitalize"
              data-active={tab === option}
            >
              {option}
              <span className="font-mono text-[9px] text-white/40">{counts[option]}</span>
            </button>
          ))}
          <button type="button" onClick={() => session && loadPlaces(session)} className="btn ml-auto h-8 text-[10.5px]">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {visible.length === 0 && !loading ? (
            <p className="glass rounded-xl px-4 py-6 text-center text-[12px] text-white/45">
              Nothing in this queue.
            </p>
          ) : null}

          {visible.map((place) => (
            <article key={place.id} className="glass rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: categoryColor(place.category) }}
                      aria-hidden="true"
                    />
                    <span className="mono-label text-[8.5px]">
                      {CATEGORY_MAP[place.category]?.shortLabel ?? place.category} · {place.neighbourhood}
                    </span>
                    <span className={`chip border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${STATUS_STYLES[place.status]}`}>
                      {place.status}
                    </span>
                    {place.verified ? <span className="chip px-2 py-0.5 text-[9px]">Verified</span> : null}
                    {place.approximate ? <span className="chip px-2 py-0.5 text-[9px]">Approx. location</span> : null}
                    <span className="chip px-2 py-0.5 text-[9px]">{place.source}</span>
                  </div>
                  <h2 className="mt-1.5 text-[15px] font-light text-white">{place.name}</h2>
                  <p className="mt-1 line-clamp-2 max-w-2xl text-[11.5px] leading-relaxed text-white/45">
                    {place.description ?? "No description."}
                  </p>
                  <p className="mt-1.5 font-mono text-[9px] text-white/30">
                    {place.lat.toFixed(4)}, {place.lng.toFixed(4)} · /place/{place.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {place.status !== "approved" ? (
                    <button
                      type="button"
                      disabled={busyId === place.id}
                      onClick={() => patch(place, { status: "approved" })}
                      className="btn border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[10.5px] text-emerald-50"
                    >
                      Approve
                    </button>
                  ) : null}
                  {place.status !== "rejected" ? (
                    <button
                      type="button"
                      disabled={busyId === place.id}
                      onClick={() => patch(place, { status: "rejected" })}
                      className="btn px-3 py-1 text-[10.5px]"
                    >
                      Reject
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === place.id}
                    onClick={() => patch(place, { verified: !place.verified })}
                    className="btn px-3 py-1 text-[10.5px]"
                  >
                    {place.verified ? "Unverify" : "Mark verified"}
                  </button>
                  <button type="button" onClick={() => setEditing(place)} className="btn px-3 py-1 text-[10.5px]">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(place)}
                    className="btn px-3 py-1 text-[10.5px] text-rose-200"
                  >
                    Delete
                  </button>
                  <Link href={`/place/${place.slug}`} target="_blank" className="btn px-3 py-1 text-[10.5px]">
                    Open
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {editing ? (
        <EditSheet
          place={editing}
          busy={busyId === editing.id}
          onClose={() => setEditing(null)}
          onSave={(updates) => patch(editing, updates)}
        />
      ) : null}
    </main>
  );
}

function EditSheet({
  place,
  busy,
  onClose,
  onSave,
}: {
  place: Place;
  busy: boolean;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(place.name);
  const [category, setCategory] = useState<CategoryId>(place.category);
  const [neighbourhood, setNeighbourhood] = useState(place.neighbourhood);
  const [description, setDescription] = useState(place.description ?? "");
  const [openingHours, setOpeningHours] = useState(place.opening_hours ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close editor" onClick={onClose} tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-labelledby="edit-title" className="glass relative w-full max-w-lg rounded-2xl p-5">
        <p className="mono-label">Edit listing</p>
        <h2 id="edit-title" className="mt-1 text-[18px] font-extralight">
          {place.name}
        </h2>
        <div className="mt-4 grid gap-3">
          <div>
            <label htmlFor="edit-name" className="mono-label">
              Name
            </label>
            <input id="edit-name" value={name} onChange={(event) => setName(event.target.value)} className="field mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-category" className="mono-label">
                Category
              </label>
              <select
                id="edit-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryId)}
                className="field mt-1"
              >
                {CATEGORIES.map((option) => (
                  <option key={option.id} value={option.id} className="bg-[#0b0f15]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-neighbourhood" className="mono-label">
                Neighbourhood
              </label>
              <input
                id="edit-neighbourhood"
                value={neighbourhood}
                onChange={(event) => setNeighbourhood(event.target.value)}
                className="field mt-1"
              />
            </div>
          </div>
          <div>
            <label htmlFor="edit-description" className="mono-label">
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="field mt-1 resize-none"
            />
          </div>
          <div>
            <label htmlFor="edit-hours" className="mono-label">
              Opening hours
            </label>
            <input
              id="edit-hours"
              value={openingHours}
              onChange={(event) => setOpeningHours(event.target.value)}
              className="field mt-1"
              placeholder="Tue–Sat, 11:00–19:00"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onSave({
                name,
                category,
                neighbourhood,
                description: description.trim() || null,
                opening_hours: openingHours.trim() || null,
              }).then(onClose)
            }
            className="btn btn-accent"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
