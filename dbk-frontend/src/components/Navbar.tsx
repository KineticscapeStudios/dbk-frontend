// components/Navbar.tsx
"use client";

import {
  Bars3Icon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/providers/cart";
import CategoriesFetcher from "./CategoriesFetcher";
import { sdk } from "@/lib/sdk"; // used to fetch categories for modal
import type { HttpTypes } from "@medusajs/types";

function CartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 5h2l2.2 10.5a1.5 1.5 0 0 0 1.47 1.2h8.5a1.5 1.5 0 0 0 1.46-1.12L21 8H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19.5" r="1.25" fill="currentColor" />
      <circle cx="17" cy="19.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

export default function Navbar() {
  const sp = useSearchParams();
  const q = (sp?.get("q") || "").trim();
  const { open, cart } = useCart();

  const count = cart?.items?.reduce((n, it) => n + (it.quantity ?? 0), 0) ?? 0;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Close both on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus when search opens
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Lock body scroll when ANY modal open
  useEffect(() => {
    const anyOpen = mobileMenuOpen || searchOpen;
    const prev = document.body.style.overflow;
    if (anyOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen, searchOpen]);

  // Fetch categories for mobile modal
  const [cats, setCats] = useState<HttpTypes.StoreProductCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return; // lazy-load when opened
    let cancelled = false;
    (async () => {
      try {
        setCatsLoading(true);
        // grab a generous page
        const { product_categories } = await sdk.store.category.list({
          limit: 200,
          order: "name",
        });
        if (!cancelled) setCats(product_categories || []);
      } finally {
        if (!cancelled) setCatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mobileMenuOpen]);

  const cartBadge = useMemo(
    () =>
      count ? (
        <span
          className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 text-white"
          aria-live="polite"
        >
          {count}
        </span>
      ) : null,
    [count]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-text/20 bg-bg-light/90 backdrop-blur supports-[backdrop-filter]:bg-bg-light/80">
      {/* Top bar */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 md:h-20 items-center justify-between gap-3">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2">
            {/* Hamburger (mobile only) */}
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg text-text md:hidden"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => {
                setSearchOpen(false); // ensure search closed
                setMobileMenuOpen(true);
              }}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Logo (larger) */}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/dbk_logo.png"
                alt="Dhaga by Komal"
                width={200}
                height={80}
                className="h-12 w-auto md:h-20"
                priority
              />
              <span className="sr-only">Dhaga by Komal</span>
            </Link>
          </div>

          {/* Center: search (desktop only) */}
          <form
            className="mx-4 hidden flex-1 md:block"
            role="search"
            action="/search"
            method="GET"
          >
            <label htmlFor="global-search" className="sr-only">
              Search Dhaga by Komal
            </label>
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder="Search Dhaga By Komal"
              defaultValue={q}
              className="w-full rounded-2xl border border-border bg-bg-dark px-5 py-3 text-text placeholder:text-text-mutable outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </form>

          {/* Right: icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile search (icon) */}
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg text-text md:hidden"
              aria-label="Open search"
              aria-expanded={searchOpen}
              onClick={() => {
                setMobileMenuOpen(false); // ensure menu closed
                setSearchOpen(true);
              }}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Profile */}
            <Link
              href="/profile"
              className="group grid h-9 w-9 place-items-center rounded-md border border-border bg-bg text-text"
              aria-label="Profile"
              title="Profile"
            >
              <UserCircleIcon className="h-5 w-5 text-text-mutable group-hover:text-text" />
            </Link>

            {/* Cart */}
            <button
              onClick={open}
              className="group relative grid h-9 w-9 place-items-center rounded-md border border-border bg-bg text-text cursor-pointer"
              aria-label="Cart"
              title="Cart"
            >
              {cartBadge}
              <CartIcon className="h-5 w-5 text-text-mutable group-hover:text-text" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories row on desktop (unchanged) */}
      <div className="hidden md:block">
        <CategoriesFetcher
          limit={30}
          order="name"
          className="container mx-auto px-4 sm:px-6 lg:px-8"
        />
      </div>

      {/* ======= MOBILE FULLSCREEN MODALS ======= */}

      {/* 1) Mobile MENU modal (categories in column) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="All categories"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Panel */}
          <div className="absolute inset-x-0 top-0 mt-0 rounded-b-2xl bg-bg-light shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-base font-semibold">Browse Categories</h3>
              <button
                type="button"
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Column list */}
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">
              {catsLoading && (
                <div className="py-2 text-sm text-text-mutable">Loading…</div>
              )}
              {!catsLoading && cats.length === 0 && (
                <div className="py-2 text-sm text-text-mutable">
                  No categories.
                </div>
              )}
              <nav className="flex flex-col divide-y divide-border">
                {cats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collections/${c.handle ?? c.id}`}
                    className="py-3 text-base"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 2) Mobile SEARCH modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSearchOpen(false)}
          />
          {/* Panel */}
          <div className="absolute inset-x-0 top-0 mt-0 rounded-b-2xl bg-bg-light shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-base font-semibold">Search</h3>
              <button
                type="button"
                aria-label="Close search"
                className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg"
                onClick={() => setSearchOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pb-4">
              <form
                role="search"
                action="/search"
                method="GET"
                className="relative"
              >
                <label htmlFor="mobile-search-input" className="sr-only">
                  Search Dhaga by Komal
                </label>
                <input
                  ref={searchRef}
                  id="mobile-search-input"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Search Dhaga By Komal"
                  className="w-full rounded-xl border border-border bg-bg-dark px-4 py-3 text-text placeholder:text-text-mutable outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
