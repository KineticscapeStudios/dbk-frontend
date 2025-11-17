"use client";

import Image from "next/image";
import { useCart } from "@/providers/cart";
import {
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import CartPromotions from "./CartPromotions";
import { useRouter } from "next/navigation";
function format(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    amount
  );
}

export default function CartDrawer() {
  const router = useRouter();
  const { cart, isOpen, close, updateLine, removeLine } = useCart();
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
      />
      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-[61] h-full w-full max-w-md transform bg-bg-light shadow-xl transition-transform 
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button onClick={close} aria-label="Close">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(100%-64px-160px)] flex-col overflow-auto">
          {!cart || !cart.items?.length ? (
            <div className="p-6 text-sm text-gray-500">Your cart is empty.</div>
          ) : (
            <ul className="">
              {cart.items.map((it) => {
                const img = it.thumbnail;
                return (
                  <li key={it.id} className="flex gap-3 p-4">
                    <div className="relative w-[20%] overflow-hidden rounded">
                      {img ? (
                        <Image
                          src={img}
                          alt={it.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-100" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-h2 font-bold">
                        {it.title}
                      </div>
                      {it?.variant_title && (
                        <div className="text-normal text-text-muted">
                          Size: {it.variant_title}
                        </div>
                      )}
                      <div className="mt-1 text-sm">
                        {format(it.unit_price ?? 0, cart.currency_code)}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="rounded border p-1"
                          onClick={() =>
                            updateLine(
                              it.id,
                              Math.max(1, (it.quantity ?? 1) - 1)
                            )
                          }
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="text-sm">{it.quantity}</span>
                        <button
                          className="rounded border p-1"
                          onClick={() =>
                            updateLine(it.id, (it.quantity ?? 1) + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>

                        <button
                          className="ml-auto rounded border p-1 text-red-600"
                          onClick={() => removeLine(it.id)}
                          aria-label="Remove item"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              <div className="px-4">
                <CartPromotions />
              </div>
            </ul>
          )}
        </div>

        {/* Totals / CTA */}
        <div className="sticky bottom-0 border-t p-4 space-y-2 bg-bg-dark">
          <div className="flex justify-between text-h2 font-bold">
            <span>Subtotal</span>
            <div className="flex gap-2 items-center">
              {cart?.original_total! > cart?.total! && (
                <span className="line-through text-normal font-normal">
                  {format(cart?.original_total ?? 0, cart?.currency_code)}
                </span>
              )}

              <span>{format(cart?.total ?? 0, cart?.currency_code)}</span>
            </div>
          </div>

          <div className="flex justify-end w-full text-base font-normal">
            <span>Tax and shipping included</span>
          </div>
          <button
            className="mt-2 w-full font-bold text-h2 rounded-lg bg-primary px-4 py-3 text-bg-light disabled:opacity-60"
            disabled={!cart || !cart.items?.length}
            // TODO: navigate to /checkout when ready
            onClick={() => {
              close();
              router.push("/checkout/confirm");
            }}
          >
            Confirm Order
          </button>
        </div>
      </aside>
    </>
  );
}
