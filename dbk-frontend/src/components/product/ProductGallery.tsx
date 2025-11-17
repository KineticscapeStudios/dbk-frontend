"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import type { HttpTypes } from "@medusajs/types";
import { useMemo, useState } from "react";

// Lightbox (no SSR)
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), {
  ssr: false,
});
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";

type Props = {
  images: HttpTypes.StoreProductImage[];
  /** Optional product video URL from product.metadata.video_url */
  videoUrl?: string | null;
};

type MediaItem =
  | { kind: "video"; url: string }
  | { kind: "image"; url: string; id?: string };

export default function ProductGallery({ images, videoUrl }: Props) {
  // media list: video first (if any), then images
  const media = useMemo<MediaItem[]>(() => {
    const list: MediaItem[] = [];
    if (videoUrl) list.push({ kind: "video", url: videoUrl });
    for (const img of images || []) {
      if (img?.url) list.push({ kind: "image", url: img.url, id: img.id });
    }
    return list;
  }, [images, videoUrl]);

  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  if (!media.length) {
    return (
      <div
        className="rounded-xl bg-bg border border-border"
        style={{ aspectRatio: "9 / 16" }}
      />
    );
  }

  const activeItem = media[active];

  // Lightbox slides (image + optional video)
  const slides = media.map((m) =>
    m.kind === "image"
      ? { src: m.url }
      : {
          type: "video",
          // The Video plugin expects "sources"
          sources: [{ src: m.url, type: "video/mp4" }], // change type if not mp4
          // poster: "/path/to/poster.jpg", // optional
        }
  );

  return (
    <>
      {/* On mobile: thumbs row above viewer; on desktop: column left of viewer */}
      <div className="grid grid-rows-[auto_1fr] gap-3 md:grid-rows-1 md:grid-cols-[96px_1fr]">
        {/* THUMBS */}
        <div className="order-1 md:order-none">
          {/* mobile row */}
          <div className="md:hidden flex flex-wrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {media.map((m, i) => {
              const isActive = i === active;
              return (
                <button
                  key={(m.kind === "image" ? m.id : `video-${i}`) || i}
                  onClick={() => setActive(i)}
                  className={`relative w-16 flex-shrink-0 rounded-lg border ${
                    isActive ? "border-primary" : "border-border"
                  }`}
                  style={{ aspectRatio: "3/4" }}
                  aria-label={
                    m.kind === "video" ? "Product video" : `Preview ${i + 1}`
                  }
                >
                  {m.kind === "video" ? (
                    <div className="absolute inset-0 grid place-items-center text-xs text-white bg-black/60 rounded-lg">
                      ▶
                    </div>
                  ) : (
                    <Image
                      src={m.url}
                      alt="thumbnail"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* desktop column */}
          <div className="hidden md:flex md:flex-col md:gap-2 md:pr-1">
            {media.map((m, i) => {
              const isActive = i === active;
              return (
                <button
                  key={(m.kind === "image" ? m.id : `video-${i}`) || i}
                  onClick={() => setActive(i)}
                  className={`relative w-24 rounded-lg border ${
                    isActive ? "border-primary" : "border-border"
                  }`}
                  style={{ aspectRatio: "3/4" }}
                  aria-label={
                    m.kind === "video" ? "Product video" : `Preview ${i + 1}`
                  }
                >
                  {m.kind === "video" ? (
                    <div className="absolute inset-0 grid place-items-center text-xs text-white bg-black/60 rounded-lg">
                      ▶
                    </div>
                  ) : (
                    <Image
                      src={m.url}
                      alt="thumbnail"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* VIEWER */}
        <div
          className="relative overflow-hidden rounded-xl border border-border bg-bg cursor-zoom-in"
          style={{ aspectRatio: "3/4" }}
          onClick={() => setOpen(true)}
          role="button"
          aria-label="Open product viewer"
        >
          {activeItem.kind === "video" ? (
            <video
              key={activeItem.url}
              src={activeItem.url}
              className="h-full w-full object-cover"
              controls
              playsInline
            />
          ) : (
            <Image
              src={activeItem.url}
              alt="product image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          )}
        </div>
      </div>

      {/* Lightbox */}
      {typeof window !== "undefined" && (
        <Lightbox
          open={open}
          close={() => setOpen(false)}
          slides={slides}
          index={active}
          on={{ view: ({ index }) => setActive(index) }}
          carousel={{ finite: true }}
          animation={{ fade: 250 }}
          controller={{ closeOnBackdropClick: true }}
          plugins={[Zoom, Thumbnails, Video, Fullscreen]}
          zoom={{
            maxZoomPixelRatio: 2.5,
            zoomInMultiplier: 1.4,
            doubleTapDelay: 250,
          }}
          thumbnails={{
            position: "bottom",
            width: 100,
            height: 100 * (3 / 4),
            border: 1,
          }}
        />
      )}
    </>
  );
}
