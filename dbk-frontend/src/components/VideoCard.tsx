"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

type VideoCardProps = {
  href: string;
  videoSrc: string;
  poster?: string;
  title: string;
  price: number;
  currency?: string; // default "₹"
  compareAtPrice?: number; // old price (MRP)
  playing?: boolean; // parent controls auto-play
  className?: string;
};

export default function VideoCard({
  href,
  videoSrc,
  poster,
  title,
  price,
  currency = "₹",
  playing = false,
  compareAtPrice,
  className = "",
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const percentOff = useMemo(() => {
    if (!compareAtPrice || compareAtPrice <= price) return null;
    const pct = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
    return `${pct}%`;
  }, [price, compareAtPrice]);

  console.log(compareAtPrice);

  return (
    <Link
      href={href}
      className={`block rounded-2xl bg-bg shadow-sm transition hover:shadow-md ${className}`}
      aria-label={title}
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[3/4]">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="p-3">
        <h3 className="text-normal leading-normal font-semibold text-text line-clamp-2">
          {title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="font-semibold text-text">
            {currency}
            {new Intl.NumberFormat("en-IN").format(price)}
          </div>
          {compareAtPrice && compareAtPrice > price && (
            <div className="flex flex-row gap-2 text-text-mutable line-through decoration-2 decoration-dashed decoration-[var(--text-mutable)]">
              <span
                className="
              text-text-mutable line-through decoration-2 decoration-dashed
              decoration-[var(--text-mutable)] font-normal
            "
              >
                {currency}
                {new Intl.NumberFormat("en-IN").format(compareAtPrice)}
              </span>
              <div className="">
                <span className="inline-grid h-7 w-10 sm:h-8 sm:w-12 place-items-center rounded-full bg-primary text-white text-xs sm:text-sm">
                  -{percentOff}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
function formatNumber(n: number) {
  // formats like 12,345 (you can swap to 'en-IN' if you prefer lakhs/crores)
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}
