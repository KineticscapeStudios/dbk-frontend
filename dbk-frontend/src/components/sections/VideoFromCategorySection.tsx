// src/components/sections/VideoFromCategorySection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/sdk";
import { toAbsoluteMediaUrl } from "@/lib/media";
import { extractPrices } from "@/lib/price";
import VideoCardsSection from "@/components/sections/VideoCardsSection";

type Props = {
  /** Either pass the category ID... */
  categoryId?: string;
  /** ...or a human-friendly handle (we'll resolve to ID) */
  categoryHandle?: string;
  /** Section title (defaults to "As Seen in Reels") */
  title?: string;
  className?: string;
  /** Number of items to show (fetch limit). Default 12 */
  limit?: number;
};

type VideoItem = {
  id: string;
  href: string;
  videoSrc: string;
  poster?: string;
  title: string;
  price: number;
  currency?: string;
  compareAtPrice?: number;
};

export default function VideoFromCategorySection({
  categoryId: initialCategoryId,
  categoryHandle,
  title,
  className = "",
  limit = 12,
}: Props) {
  const [categoryId, setCategoryId] = useState<string | undefined>(
    initialCategoryId
  );
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartId, setCartId] = useState<string | null>(null);

  // cart (for calculated_price currency/amounts)
  useEffect(() => {
    const key = "medusa_cart_id";
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (stored) {
      setCartId(stored);
    } else {
      sdk.store.cart.create().then(({ cart }) => {
        localStorage.setItem(key, cart.id);
        setCartId(cart.id);
      });
    }
  }, []);

  // Resolve handle -> categoryId
  useEffect(() => {
    let cancelled = false;
    if (!categoryHandle || categoryId) return;
    (async () => {
      try {
        const { product_categories } = await sdk.store.category.list({
          handle: categoryHandle,
          limit: 1,
          fields: "id,name,handle",
        });
        if (!cancelled) setCategoryId(product_categories?.[0]?.id);
      } finally {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryHandle, categoryId]);

  // Fetch products of category
  useEffect(() => {
    let cancelled = false;
    if (!categoryId) return;
    (async () => {
      setLoading(true);
      try {
        const { products: data } = await sdk.store.product.list({
          category_id: [categoryId],
          limit,
          // we need metadata for video_url, images for poster, and calculated_price
          fields:
            "id,title,handle,images.*,*metadata,*variants.calculated_price",
          cart_id: cartId || undefined,
          order: "-created_at",
        });
        if (!cancelled) setProducts(data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, cartId, limit]);

  // Map products with a video_url to VideoCards
  const videos: VideoItem[] = useMemo(() => {
    return (products || [])
      .map((p) => {
        const videoUrl = toAbsoluteMediaUrl((p.metadata as any)?.video_url);
        if (!videoUrl) return null;

        const poster = toAbsoluteMediaUrl(p.images?.[0]?.url);
        const { price, compareAtPrice, currency } = extractPrices(p);

        return {
          id: p.id!,
          href: `/product/${p.handle ?? p.id}`,
          videoSrc: videoUrl,
          poster: poster,
          title: p.title!,
          price,
          compareAtPrice,
          currency,
        } as VideoItem;
      })
      .filter(Boolean) as VideoItem[];
  }, [products]);

  if (loading && !videos.length) {
    return (
      <section className={`p-4 sm:p-6 ${className} max-w-6xl m-auto`}>
        <div className="text-sm text-text-mutable">Loading…</div>
      </section>
    );
  }

  if (!videos.length) {
    return (
      <section className={`p-4 sm:p-6 ${className} max-w-6xl m-auto`}>
        <div className="text-sm text-text-mutable">No video products yet.</div>
      </section>
    );
  }

  return (
    <VideoCardsSection
      title={title ?? "As Seen in Reels"}
      videos={videos}
      className={className}
    />
  );
}
