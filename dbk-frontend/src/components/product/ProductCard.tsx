"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ProductCardProps = {
  href?: string;
  images: string[];
  title: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  className?: string;
};

export default function ProductCard({
  href = "#",
  images,
  title,
  price,
  compareAtPrice,
  currency = "₹",
  className = "",
}: ProductCardProps) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canCycle = images?.length > 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!canCycle) return;
    const shouldPlay = isMobile || hovering;
    if (!shouldPlay) return;
    intervalRef.current = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      1200
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (!isMobile) setIndex(0);
    };
  }, [hovering, isMobile, images.length, canCycle]);

  const percentOff = useMemo(() => {
    if (!compareAtPrice || compareAtPrice <= price) return null;
    return `${Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}%`;
  }, [price, compareAtPrice]);

  return (
    <Link
      href={href}
      aria-label={title}
      className={`min-w-0 w-full group block p-2 sm:p-3 rounded-2xl transition shadow-md hover:bg-white ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      {/* Bigger image area */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border aspect-[3/4] sm:aspect-[3/4]">
        {images?.length ? (
          images.map((src, i) => (
            <Image
              key={src + i}
              src={src}
              alt={title}
              fill
              sizes="(max-width: 640px) 50vw,
                     (max-width: 1024px) 25vw,
                     20vw"
              priority={i === 0}
              className={`object-cover transition-opacity duration-300 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-mutable">
            No image
          </div>
        )}
      </div>

      {/* Compact text to give more visual weight to image */}
      <h3 className="mt-2 sm:mt-3 max-w-full font-medium text-text text-base sm:text-lg leading-snug line-clamp-2">
        {title}
      </h3>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm sm:text-base">
        <span className="font-semibold text-text">
          {currency}
          {formatNumber(price)}
        </span>

        {compareAtPrice && compareAtPrice > price && (
          <span className="text-text-mutable line-through decoration-2 decoration-dashed decoration-[var(--text-mutable)]">
            {currency}
            {formatNumber(compareAtPrice)}
          </span>
        )}

        {percentOff && (
          <span className="inline-grid h-6 w-10 sm:h-7 sm:w-12 place-items-center rounded-full bg-primary text-white text-[10px] sm:text-xs">
            -{percentOff}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatNumber(n: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}
