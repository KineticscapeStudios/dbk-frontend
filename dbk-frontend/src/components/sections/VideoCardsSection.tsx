"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import VideoCard from "@/components/VideoCard";

type VideoItem = {
  id?: string | number;
  href: string;
  videoSrc: string;
  poster?: string;
  title: string;
  price: number;
  currency?: string;
  compareAtPrice?: number;
};

type VideoCardsSectionProps = {
  title?: string;
  videos: VideoItem[];
  className?: string;
};

export default function VideoCardsSection({
  title = "As Seen in Reels",
  videos,
  className = "",
}: VideoCardsSectionProps) {
  const [viewportRef, embla] = useEmblaCarousel({
    loop: true,
  });

  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
    return () => {
      embla.off("select", onSelect);
      embla.off("reInit", onSelect);
    };
  }, [embla, onSelect]);

  const scrollPrev = useCallback(() => embla?.scrollPrev(), [embla]);
  const scrollNext = useCallback(() => embla?.scrollNext(), [embla]);

  // Derive which index is "playing" (center slide)
  const playingIndex = selected % videos.length;

  const items = useMemo(() => videos ?? [], [videos]);

  return (
    <section className={`py-4 sm:py-6 ${className}`}>
      <div className="relative">
        {/* Left button */}
        <button
          onClick={scrollPrev}
          aria-label="Previous"
          className="hidden md:grid absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 place-items-center rounded-full border border-border bg-bg/80 hover:bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <ChevronLeftIcon className="h-10 w-10 text-white" />
        </button>

        {/* Carousel viewport */}
        <div
          className="overflow-x-hidden py-2 sm:py-4"
          ref={viewportRef}
          aria-roledescription="carousel"
        >
          <div className="flex">
            {items.map((v, i) => {
              const isCenter = i === playingIndex;
              return (
                <div
                  key={v.id ?? i}
                  className={`min-w-0 mx-2
                  flex-[0_0_88%]
                  xs:flex-[0_0_78%]
                  sm:flex-[0_0_60%]
                  md:flex-[0_0_45%]
                  lg:flex-[0_0_33%]
                  xl:flex-[0_0_25%]`}
                >
                  <VideoCard
                    href={v.href}
                    videoSrc={v.videoSrc}
                    poster={v.poster}
                    title={v.title}
                    price={v.price}
                    currency={v.currency ?? "₹"}
                    compareAtPrice={v.compareAtPrice}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right button */}
        <button
          onClick={scrollNext}
          aria-label="Next"
          className="hidden md:grid absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 place-items-center rounded-full border border-border bg-bg/80 hover:bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <ChevronRightIcon className="h-10 w-10 text-white" />
        </button>
      </div>
    </section>
  );
}
