"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import ProductCard from "../product/ProductCard";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/sdk";
type ProductInfo = {
  id?: string | number;
  href?: string;
  images: string[];
  title: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
};

type TrendingNowProps = {
  title?: string;
  collectionHandle?: string;
  products?: ProductInfo[];
  className?: string;
};
function extractPrices(p: HttpTypes.StoreProduct) {
  const rows =
    (p.variants || [])
      .map((v: any) => {
        const calc = v?.calculated_price;
        const isSale = calc?.calculated_price?.price_list_type === "sale";
        const price = Number(
          calc?.calculated_amount_with_tax ?? calc?.calculated_amount ?? NaN
        );
        const compare = isSale
          ? Number(
              calc?.original_amount_with_tax ?? calc?.original_amount ?? NaN
            )
          : NaN;
        const currency =
          calc?.currency_code ||
          v?.prices?.[0]?.currency_code ||
          (p as any)?.currency_code ||
          "INR";
        return { price, compare, currency };
      })
      .filter((x) => Number.isFinite(x.price)) || [];

  if (!rows.length)
    return { price: 0, compareAtPrice: undefined, currency: "₹" };

  const best = rows.reduce((a, b) => (b.price < a.price ? b : a), rows[0]);
  return {
    price: best.price,
    compareAtPrice: Number.isFinite(best.compare) ? best.compare : undefined,
    currency: best.currency?.toUpperCase() === "INR" ? "₹" : "₹",
  };
}

export default function TrendingNow({
  title = "Trending Now",
  collectionHandle,
  products: fallback = [],
  className = "",
}: TrendingNowProps) {
  const [viewportRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    slidesToScroll: 1,
  });

  const [items, setItems] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(!!collectionHandle);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!collectionHandle) {
        setItems(fallback);
        setLoading(false);
        return;
      }
      setLoading(true);

      const { collections } = await sdk.store.collection.list({
        handle: collectionHandle,
        limit: 1,
        fields: "id,handle,title",
      });

      const col = collections?.[0];
      if (!col) {
        if (!cancelled) {
          setItems(fallback);
          setLoading(false);
        }
        return;
      }

      const { products } = await sdk.store.product.list({
        collection_id: col.id,
        fields: "id,title,handle,images.*,metadata,*variants.calculated_price",
      });

      if (cancelled) return;

      const mapped: ProductInfo[] = (products || []).map((p) => {
        const imgs = (p.images || [])
          .map((im) => im.url)
          .filter(Boolean) as string[];
        const { price, compareAtPrice, currency } = extractPrices(p);
        return {
          id: p.id,
          href: `/product/${p.handle ?? p.id}`,
          images: imgs,
          title: p.title,
          price,
          compareAtPrice,
          currency,
        };
      });

      setItems(mapped.length ? mapped : fallback);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [collectionHandle, JSON.stringify(fallback)]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section
      className={`rounded-2xl border border-border bg-bg-dark py-4 sm:py-6 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-h2 leading-h2 text-text font-normal">
          {title.split(" ")[0]}{" "}
          <span className="font-pacifico">
            {title.split(" ").slice(1).join(" ")}
          </span>
        </h2>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <button
            onClick={scrollPrev}
            aria-label="Previous"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-bg text-text hover:bg-bg-dark/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Next"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-bg text-text hover:bg-bg-dark/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* desktop carousel */}
      <div className="hidden md:block">
        <div
          ref={viewportRef}
          className="overflow-x-hidden overflow-y-visible py-2 sm:py-4"
        >
          <div className="flex gap-3">
            {(items || []).map((p, i) => (
              <div
                key={p.id ?? i}
                className="
                  min-w-0
                  flex-[0_0_33%]
                  lg:flex-[0_0_25%]
                  xl:flex-[0_0_20%]
                "
              >
                <ProductCard {...p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* mobile grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {(items || []).map((p, i) => (
          <ProductCard key={p.id ?? i} {...p} />
        ))}
      </div>
    </section>
  );
}
