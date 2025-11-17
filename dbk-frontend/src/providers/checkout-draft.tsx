// providers/checkout-draft.tsx
"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "@/lib/sdk";
import { useCart } from "./cart";
import { useCustomer } from "./customer";

type DraftAddress = {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  company?: string;
  country_code?: string; // iso_2 (e.g. "in")
  phone?: string;
};

type Draft = {
  email?: string;
  selectedCustomerAddressId?: string; // logged-in, picking saved
  manualAddress?: DraftAddress; // guest or custom address
};

type Ctx = {
  draft: Draft;
  setEmail: (v: string) => void;
  setSelectedAddressId: (id?: string) => void;
  setManualAddress: (a: DraftAddress) => void;

  /** Write email + address to cart just-in-time (e.g. before shipping fetch / Pay Now). */
  syncToCart: () => Promise<HttpTypes.StoreCart | undefined>;
};

const CheckoutDraftContext = createContext<Ctx | null>(null);

// ---- helpers ----
function coerceCountry(cc?: string, fallback?: string) {
  return (cc || fallback || "in").toLowerCase(); // India-only default
}

function mapCustomerAddrToCartAddr(
  src: NonNullable<HttpTypes.StoreCustomer["addresses"]>[number],
  regionDefault?: string
): DraftAddress {
  return {
    first_name: src.first_name || "",
    last_name: src.last_name || "",
    address_1: src.address_1 || "",
    address_2: src.address_2 || "",
    postal_code: src.postal_code || "",
    city: src.city || "",
    province: src.province || "",
    company: src.company || "",
    phone: src.phone || "",
    country_code: coerceCountry(
      src.country_code || undefined || "",
      regionDefault
    ),
  };
}

export function CheckoutDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cart, setCart } = useCart();
  const { customer } = useCustomer();
  const [draft, setDraft] = useState<Draft>({});
  const syncing = useRef(false);

  const setEmail = (email: string) => setDraft((d) => ({ ...d, email }));
  const setSelectedAddressId = (id?: string) =>
    setDraft((d) => ({
      ...d,
      selectedCustomerAddressId: id,
      manualAddress: undefined,
    }));
  const setManualAddress = (a: DraftAddress) =>
    setDraft((d) => ({
      ...d,
      manualAddress: { ...d.manualAddress, ...a },
      selectedCustomerAddressId: undefined,
    }));

  const syncToCart = async () => {
    if (!cart || syncing.current) return cart;
    syncing.current = true;

    try {
      let next = cart;

      // 1) Email
      if (draft.email && draft.email !== cart.email) {
        ({ cart: next } = await sdk.store.cart.update(cart.id, {
          email: draft.email,
        }));
      }

      // 2) Address
      const regionDefault =
        next.region?.countries?.[0]?.iso_2?.toLowerCase() || "in";

      const selectAddress = (): DraftAddress | undefined => {
        // (A) Logged-in: selected saved address
        if (draft.selectedCustomerAddressId && customer?.addresses?.length) {
          const found = customer.addresses.find(
            (a) => a.id === draft.selectedCustomerAddressId
          );
          if (found) {
            return mapCustomerAddrToCartAddr(found, regionDefault);
          }
        }

        // (B) Manual address (guest or custom)
        if (draft.manualAddress) {
          const m = draft.manualAddress;
          return {
            ...m,
            phone: (m.phone || "").trim(),
            country_code: coerceCountry(m.country_code, regionDefault),
          };
        }

        // (C) Nothing to apply
        return undefined;
      };

      const addr = selectAddress();

      // Only push if minimal fields exist (prevents accidental wipes)
      if (
        addr &&
        addr.phone &&
        addr.address_1 &&
        addr.city &&
        addr.postal_code
      ) {
        // Always set both shipping and billing for simplicity
        const payload = {
          shipping_address: addr,
          billing_address: addr,
        };
        ({ cart: next } = await sdk.store.cart.update(next.id, payload));
      }

      setCart(next);
      return next;
    } finally {
      syncing.current = false;
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      draft,
      setEmail,
      setSelectedAddressId,
      setManualAddress,
      syncToCart,
    }),
    [draft]
  );

  return (
    <CheckoutDraftContext.Provider value={value}>
      {children}
    </CheckoutDraftContext.Provider>
  );
}

export function useCheckoutDraft() {
  const ctx = useContext(CheckoutDraftContext);
  if (!ctx)
    throw new Error(
      "useCheckoutDraft must be used within a CheckoutDraftProvider"
    );
  return ctx;
}
