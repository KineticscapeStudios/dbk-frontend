import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-text text-bg-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h1 className="text-h2 font-bold">Get in touch</h1>
            <p className="whitespace-pre-line leading-relaxed">
              Shaam Clothing Pvt. Ltd.
              {"\n"}G7, Badhe Warehouse, Gate No. 2, Opp. Angaraj Dabba,
              {"\n"}Kondhwa Budruk, Pune 411048
              {"\n"}help@shauryasanadhya.com
              {"\n"}+91-9168076000
              {"\n"}Timing (Mon–Sat 10:30 AM–6:30 PM)
            </p>
          </div>

          <div>
            <h1 className="text-h2 font-bold mb-3">Discover</h1>
            <nav className="flex flex-col gap-2">
              <Link href="/about">About Us</Link>
              <Link href="/blog">Blogs</Link>
            </nav>
          </div>

          <div>
            <h1 className="text-h2 font-bold mb-3">Customer Policies</h1>
            <nav className="flex flex-col gap-2">
              <Link href="/policies/returns">Exchange & Return Policy</Link>
              <Link href="/policies/privacy">Privacy Policy</Link>
              <Link href="/policies/terms">Terms of Use</Link>
            </nav>
          </div>

          <div>
            <h1 className="text-h2 font-bold mb-3">Socials</h1>
            <nav className="flex flex-col gap-3">
              <Link
                className="flex items-center gap-2"
                href="https://instagram.com"
                target="_blank"
              >
                <Image
                  src="/SVGs/InstaIcon.svg"
                  width={20}
                  height={20}
                  alt="Instagram"
                />
                Instagram
              </Link>
              <Link
                className="flex items-center gap-2"
                href="https://facebook.com"
                target="_blank"
              >
                <Image
                  src="/SVGs/facebookIcon.svg"
                  width={20}
                  height={20}
                  alt="Facebook"
                />
                Facebook
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm">
          copyright © 2025 dhagabykomal
        </div>
      </div>
    </footer>
  );
}
