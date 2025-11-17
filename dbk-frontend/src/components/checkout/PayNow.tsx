// components/checkout/PayNow.tsx
"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/providers/cart";
import { useCustomer } from "@/providers/customer";
import { useCheckoutDraft } from "@/providers/checkout-draft";
import { sdk } from "@/lib/sdk";
import { useRouter } from "next/navigation";
import type { HttpTypes } from "@medusajs/types";

// ---- Window typing for Razorpay ----
declare global {
  interface Window {
    Razorpay?: any;
  }
}

// ---- Utils ----
function invariant(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function loadScriptOnce(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(s);
  });
}

// Ensure the cart has a payment collection with a Razorpay session
async function ensureRazorpaySession(cart: HttpTypes.StoreCart) {
  // 1) If cart already has a Razorpay session, return the current cart
  const rpExisting = cart.payment_collection?.payment_sessions?.find((s) =>
    s.provider_id?.startsWith("pp_razorpay")
  );
  if (rpExisting) return cart;

  // 2) Find a Razorpay provider id for the region
  const { payment_providers } = await sdk.store.payment.listPaymentProviders({
    region_id: cart.region_id || "",
  });

  const rpProvider = payment_providers.find((p) =>
    p.id.startsWith("pp_razorpay")
  );
  if (!rpProvider) {
    throw new Error("Razorpay is not enabled for this region.");
  }

  // 3) Create payment collection + init Razorpay session
  await sdk.store.payment.initiatePaymentSession(cart, {
    provider_id: rpProvider.id,
  });

  // 4) Re-fetch cart with the newly attached payment_collection
  const { cart: updated } = await sdk.store.cart.retrieve(cart.id);
  return updated;
}

export default function PayNow() {
  const { cart, refreshCart } = useCart();
  const { syncToCart } = useCheckoutDraft();
  const { refresh: refreshCustomer } = useCustomer();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const precheckMsg = useMemo(() => {
    const c = cart as HttpTypes.StoreCart | null;
    if (!c) return "No cart.";
    if (!c.items?.length) return "Your cart is empty.";
    if (!c.email) return "Please add your email.";
    const phone = c.shipping_address?.phone || c.billing_address?.phone;
    if (!phone) return "Phone number is required in address.";
    if (!c.shipping_methods?.length) return "Please select a shipping method.";
    return null;
  }, [cart]);

  const onPay = async () => {
    setErr(null);
    setBusy(true);
    try {
      // 1) Sync checkout form to cart (addresses, email, etc.)
      const synced = await syncToCart();
      const c0 = (synced ?? cart) as HttpTypes.StoreCart | null;
      invariant(c0, "No cart.");

      // 2) Validate again
      const fail = !c0.items?.length
        ? "Your cart is empty."
        : !c0.email
        ? "Please add your email."
        : !(c0.shipping_address?.phone || c0.billing_address?.phone)
        ? "Phone number is required in address."
        : !c0.shipping_methods?.length
        ? "Please select a shipping method."
        : null;
      if (fail) {
        setErr(fail);
        setBusy(false);
        return;
      }

      // 3) Make sure payment collection + Razorpay session exist
      const c = await ensureRazorpaySession(c0);
      const pc = c.payment_collection;
      invariant(pc?.id, "Failed to create payment collection.");

      const rpSession = pc.payment_sessions?.find((s) =>
        s.provider_id?.startsWith("pp_razorpay")
      );
      invariant(rpSession, "Failed to create Razorpay session.");

      const orderData = (rpSession.data ?? {}) as Record<string, any>;
      invariant(orderData.order_id, "Razorpay order was not initialized.");

      // 4) Load Razorpay checkout
      await loadScriptOnce("https://checkout.razorpay.com/v1/checkout.js");
      invariant(window.Razorpay, "Razorpay SDK failed to load");

      // 5) Prepare Razorpay options
      // currency_code we saved in session data during initiatePayment.
      const currencyCode = String(
        orderData.currency_code || "INR"
      ).toUpperCase();

      // Medusa totals are RUPEES in your setup; Razorpay expects PAISE
      const amountPaise = Math.max(0, Math.round(Number(c.total ?? 0) * 100));

      const phone = c.shipping_address?.phone || c.billing_address?.phone || "";
      const name = `${c.billing_address?.first_name ?? ""} ${
        c.billing_address?.last_name ?? ""
      }`.trim();
      const displayName = name || c.email?.split("@")[0] || "Customer";
      console.log(
        "sessions:",
        c.payment_collection?.payment_sessions?.map((s) => ({
          id: s.id,
          provider_id: s.provider_id,
          status: s.status,
        }))
      );

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amountPaise,
        currency: currencyCode,
        name: "Dhaga by Komal",
        description: `Order ${orderData.receipt || orderData.order_id}`,
        image: "/images/dbk_logo.png",
        order_id: orderData.order_id,
        prefill: { name: displayName, email: c.email, contact: phone },
        notes: { cart_id: c.id, session_id: rpSession.id },
        theme: { color: "#C9302A" },

        // ---- SUCCESS HANDLER ----
        handler: async (resp: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 5.a) POST to your confirm route (updates the SESSION on backend)
            const confirmRes = await fetch(
              `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/razorpay/confirm`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-publishable-api-key":
                    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
                },
                body: JSON.stringify({
                  session_id: rpSession!.id,
                  order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  // Your route expects amount as string + currency_code
                  amount: String(c.total ?? 0), // RUPEES here
                  currency_code: currencyCode, // e.g. "INR"
                }),
              }
            );

            if (!confirmRes.ok) {
              const t = await confirmRes.text().catch(() => "");
              throw new Error(
                `Confirm failed (${confirmRes.status}): ${t || "Unknown error"}`
              );
            }

            // 5.b) Now complete the cart. If session is authorized/captured,
            //      your provider's authorizePayment() will pass and create the order.
            const complete = await sdk.store.cart.complete(c.id);

            if (complete.type === "order") {
              await refreshCustomer().catch(() => {});
              await refreshCart();
              router.push(`/order/success?id=${complete.order.id}`);
              return;
            }

            // Still a cart → probably waiting for webhook. Short-poll a few times.
            const maxTries = 10;
            for (let i = 0; i < maxTries; i++) {
              await new Promise((r) => setTimeout(r, 3000));
              const retry = await sdk.store.cart.complete(c.id);
              if (retry.type === "order") {
                await refreshCustomer().catch(() => {});
                await refreshCart();
                router.push(`/order/success?id=${retry.order.id}`);
                return;
              }
            }

            setErr(
              "Payment is processing. If you weren’t redirected, please check your order history."
            );
          } catch (e: any) {
            setErr(e?.message || "Payment verification failed.");
          } finally {
            setBusy(false);
          }
        },

        modal: { ondismiss: () => setBusy(false) },
      });

      rzp.on("payment.failed", (resp: any) => {
        setErr(resp?.error?.description || "Payment failed.");
        setBusy(false);
      });

      rzp.open();
    } catch (e: any) {
      setErr(e?.message || "Payment failed to start.");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <button
        onClick={onPay}
        disabled={!cart || !!precheckMsg || busy}
        className="w-full rounded-md bg-primary px-4 py-3 text-white disabled:opacity-60"
      >
        {busy ? "Processing…" : "Pay Now"}
      </button>

      {(precheckMsg || err) && (
        <p className="mt-2 text-sm text-red-600">{err || precheckMsg}</p>
      )}

      <p className="mt-2 text-xs text-text-mutable">
        By placing the order, you agree to our Terms &amp; Conditions.
      </p>
    </div>
  );
}
