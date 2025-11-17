// components/checkout/AddressChooser.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/providers/cart";
import { useCustomer } from "@/providers/customer";
import { useCheckoutDraft } from "@/providers/checkout-draft";
import { sdk } from "@/lib/sdk";

export default function AddressChooser() {
  const { cart } = useCart();
  const { customer } = useCustomer();
  const hasSaved = (customer?.addresses?.length || 0) > 0;
  const [showAddModal, setShowAddModal] = useState(false);

  if (!cart) return null;

  return (
    <section className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Delivery Address</h2>
        {hasSaved && (
          <button
            className="text-sm underline underline-offset-2"
            onClick={() => setShowAddModal(true)}
          >
            Use a different address
          </button>
        )}
      </div>

      {hasSaved ? <SelectSavedAddress /> : <AddressForm />}

      {showAddModal && (
        <AddAccountAddressModal onClose={() => setShowAddModal(false)} />
      )}
    </section>
  );
}

function SelectSavedAddress() {
  const { customer } = useCustomer();
  const { draft, setSelectedAddressId } = useCheckoutDraft();
  const addrs = customer?.addresses || [];
  const [selected, setSelected] = useState<string>("");

  // Seed one time when addresses arrive (don’t re-seed if already set)
  useEffect(() => {
    if (!selected && addrs.length) {
      setSelected(addrs[0].id!);
    }
  }, [addrs, selected]);

  // Only update draft if it actually changed (prevents infinite loop)
  useEffect(() => {
    const next = selected || undefined;
    if (draft.selectedCustomerAddressId !== next) {
      setSelectedAddressId(next);
    }
  }, [selected, draft.selectedCustomerAddressId, setSelectedAddressId]);

  return (
    <div className="mt-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-lg border border-border bg-bg-dark px-3 py-2 outline-none"
      >
        {addrs.map((a) => (
          <option key={a.id} value={a.id}>
            {a.first_name} {a.last_name} — {a.address_1}, {a.city}{" "}
            {a.postal_code}
            {a.phone ? ` • ${a.phone}` : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-text-mutable">
        Your selection will be applied at payment (and when needed to fetch
        shipping options).
      </p>
    </div>
  );
}

function AddressForm() {
  const { cart } = useCart();
  const { setManualAddress } = useCheckoutDraft();
  if (!cart) return null;
  const countries = cart.region?.countries || [];

  const bind = (key: keyof ReturnType<typeof shape>) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setManualAddress({ [key]: e.target.value }),
  });

  const shape = () => ({
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    postal_code: "",
    city: "",
    province: "",
    company: "",
    phone: "",
    countryCode: "",
  });
  const defaultCountry =
    countries.find((c) => c.iso_2?.toLowerCase() === "in")?.iso_2 ||
    countries[0]?.iso_2 ||
    "in";

  return (
    <div className="mt-3 grid grid-cols-1 gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          name="first_name"
          label="First name"
          required
          {...bind("first_name")}
        />
        <Input
          name="last_name"
          label="Last name"
          required
          {...bind("last_name")}
        />
      </div>

      <Input name="address_1" label="Address" required {...bind("address_1")} />
      <Input
        name="address_2"
        label="Apartment, suite, etc. (optional)"
        {...bind("address_2")}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input name="city" label="City" required {...bind("city")} />
        <Input
          name="province"
          label="State/Province"
          required
          {...bind("province")}
        />
        <Input
          name="postal_code"
          label="Postal Code"
          required
          {...bind("postal_code")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-text-mutable">Country</label>
          <select
            name="country_code"
            defaultValue={countries[0]?.iso_2}
            onChange={(e) => {
              console.log("country code:", e.target.value);
              setManualAddress({ country_code: e.target.value });
            }}
            className="mt-1 w-full rounded-lg border border-border bg-bg-dark px-3 py-2 outline-none"
          >
            {countries.map((c) => (
              <option key={c.iso_2} value={c.iso_2}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
        <Input name="company" label="Company (optional)" {...bind("company")} />
        <Input
          name="phone"
          label="Phone (required)"
          defaultValue="+91"
          required
          {...bind("phone")}
        />
      </div>

      <p className="text-xs text-text-mutable">
        We’ll validate and apply this address during payment.
      </p>
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="block text-sm text-text-mutable">{label}</label>
      <input
        {...rest}
        className="mt-1 w-full rounded-lg border border-border bg-bg-dark px-3 py-2 outline-none focus:border-primary"
      />
    </div>
  );
}

/** Modal to ADD a new address to the logged-in user's account, then closes. */
function AddAccountAddressModal({ onClose }: { onClose: () => void }) {
  const { customer, refresh } = useCustomer(); // if you exposed refresh in your customer provider
  const { setSelectedAddressId } = useCheckoutDraft();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!customer) return null;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      first_name: String(fd.get("first_name") || ""),
      last_name: String(fd.get("last_name") || ""),
      address_1: String(fd.get("address_1") || ""),
      address_2: String(fd.get("address_2") || ""),
      postal_code: String(fd.get("postal_code") || ""),
      city: String(fd.get("city") || ""),
      province: String(fd.get("province") || ""),
      company: String(fd.get("company") || ""),
      country_code: String(fd.get("country_code") || "in"),
      phone: String(fd.get("phone") || ""),
    };

    try {
      const { customer: updated } = await sdk.store.customer.createAddress(
        payload
      );
      // pick the newest (last) or find by match
      const created = updated.addresses?.[updated.addresses.length - 1];
      if (created?.id) setSelectedAddressId(created.id);
      // optional: refresh customer context if you have it
      if (typeof (refresh as any) === "function") await (refresh as any)();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to add address");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-[min(92vw,560px)] rounded-2xl border border-border bg-bg p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add a new address</h3>
          <button className="text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input name="first_name" label="First name" required />
            <Input name="last_name" label="Last name" required />
          </div>
          <Input name="address_1" label="Address" required />
          <Input name="address_2" label="Apartment, suite, etc. (optional)" />
          <div className="grid grid-cols-3 gap-3">
            <Input name="city" label="City" required />
            <Input name="province" label="State/Province" required />
            <Input name="postal_code" label="Postal Code" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-text-mutable">Country</label>
              <select
                name="country_code"
                defaultValue="in"
                className="mt-1 w-full rounded-lg border border-border bg-bg-dark px-3 py-2 outline-none"
              >
                <option value="in">India</option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
              </select>
            </div>
            <Input name="company" label="Company (optional)" />
            <Input
              name="phone"
              label="Phone (required)"
              defaultValue="+91"
              required
            />
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save address to account"}
            </button>
            {err && <span className="text-sm text-red-600">{err}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
