"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/** What the storefront API returns (from /store/banners) */
type BannerRecord = {
  id: string;
  image_url: string;
  alt?: string | null;
  collection_handle: string;
};

type Props = {
  /** Optional: limit to one collection’s banners */
  collectionHandle?: string;
  /** ms between slides */
  intervalMs?: number; // default 3500
  /** ms for fade */
  fadeMs?: number; // default 700
  /** Aspect control via padding-top %; tweak for height */
  aspectClassName?: string; // default "pt-[38%] sm:pt-[32%] md:pt-[28%]"
  className?: string;
  withDots?: boolean; // default true
};

export default function Banners({
  collectionHandle,
  intervalMs = 3500,
  fadeMs = 700,
  aspectClassName = "pt-[56%] sm:pt-[42%] md:pt-[34%] lg:pt-[30%] xl:pt-[28%]",
  className = "",
  withDots = true,
}: Props) {
  const [data, setData] = useState<BannerRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch banners from backend storefront route
  useEffect(() => {
    const ctrl = new AbortController();
    const run = async () => {
      try {
        setErr(null);
        setIndex(0);

        // Handle same-origin or separate API origin
        const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "";
        const url = new URL("/store/banners", base || window.location.origin);
        if (collectionHandle)
          url.searchParams.set("collection_handle", collectionHandle);

        const res = await fetch(url.toString(), {
          cache: "no-store",
          signal: ctrl.signal,
          headers: {
            // Medusa v2 store API key header
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
            // optional, but nice:
            Accept: "application/json",
          },
        });
        if (!res.ok) throw new Error(`Failed to load banners (${res.status})`);
        const json = await res.json();
        setData(Array.isArray(json?.banners) ? json.banners : []);
      } catch (e: any) {
        if (!ctrl.signal.aborted)
          setErr(e?.message || "Failed to load banners");
      }
    };
    run();
    return () => ctrl.abort();
  }, [collectionHandle]);
  function toAbsoluteMediaUrl(url?: string | null) {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url; // already absolute
    const base =
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "") ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/+$/, "") ||
      "";
    return base ? `${base}${url}` : url; // if no base, keep as-is
  }
  // Normalize to slider items
  const items = useMemo(
    () =>
      (data ?? []).map((b) => ({
        src: toAbsoluteMediaUrl(b.image_url),
        alt: b.alt || `Banner for ${b.collection_handle}`,
        href: `/collections/${b.collection_handle}`,
        key: b.id,
      })),
    [data]
  );

  const canCycle = items.length > 1;

  // Auto-advance
  useEffect(() => {
    if (!canCycle || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [intervalMs, items.length, canCycle, paused]);

  // Empty state / error state
  if (err) {
    return (
      <section className={`w-full ${className}`}>
        <div className="relative w-full overflow-hidden bg-bg-dark">
          <div className={aspectClassName} />
          <div className="absolute inset-0 grid place-items-center text-red-600 text-sm">
            {err}
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className={`w-full ${className}`}>
        <div className="relative w-full overflow-hidden bg-bg-dark">
          <div className={aspectClassName} />
          <div className="absolute inset-0 grid place-items-center text-text-muted text-sm">
            No banners
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`w-full ${className}`}
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative w-full overflow-hidden bg-bg-dark">
        <div className={aspectClassName} />
        <div className="absolute inset-0">
          {items.map((b, i) => {
            const visible = i === index;
            const Img = (
              <Image
                key={b.key}
                src={b.src!}
                alt={b.alt ?? "Banner"}
                fill
                sizes="(max-width: 640px) 100vw,
                       (max-width: 1024px) 100vw,
                       100vw"
                priority={i === 0}
                className={`object-cover transition-opacity ease-in-out ${
                  visible ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDuration: `${fadeMs}ms` }}
              />
            );
            return b.href ? (
              <Link
                key={b.key}
                href={b.href}
                aria-label={b.alt ?? "Banner link"}
                className={`absolute inset-0 ${
                  visible ? "pointer-events-auto" : "pointer-events-none"
                }`}
                tabIndex={visible ? 0 : -1}
              >
                {Img}
              </Link>
            ) : (
              <div key={b.key} className="absolute inset-0">
                {Img}
              </div>
            );
          })}
        </div>

        {withDots && items.length > 1 && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
            {items.map((b, i) => (
              <button
                key={b.key}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full border border-border transition ${
                  i === index ? "bg-primary" : "bg-bg/70 hover:bg-bg"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
