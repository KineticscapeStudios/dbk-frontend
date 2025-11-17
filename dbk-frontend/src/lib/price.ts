// src/lib/price.ts
import type { HttpTypes } from "@medusajs/types";

export function extractPrices(p: HttpTypes.StoreProduct) {
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
  const toMajor = (n: number) => n;

  return {
    price: toMajor(best.price),
    compareAtPrice: Number.isFinite(best.compare)
      ? toMajor(best.compare)
      : undefined,
    currency: best.currency?.toUpperCase() === "INR" ? "₹" : "₹",
  };
}
