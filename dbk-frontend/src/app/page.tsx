import CartDrawer from "@/components/cart/CartDrawer";
import CategoriesFetcher from "@/components/CategoriesFetcher";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/product/ProductCard";
import BannerSection from "@/components/sections/Banner";
import TopPicks from "@/components/sections/TopPicks";
import TrendingNow from "@/components/sections/TrendingNow";
import VideoCardsSection from "@/components/sections/VideoCardsSection";
import VideoFromCategorySection from "@/components/sections/VideoFromCategorySection";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <BannerSection className="mb-6 sm:mb-8" />

      <VideoFromCategorySection
        title="Trending Videos"
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        categoryHandle="video-section"
        limit={12}
      />

      <TrendingNow
        collectionHandle="trending-now"
        className="container mx-auto px-4 sm:px-6 lg:px-8"
      />

      <TopPicks
        collectionHandle="top-picks"
        className="container mx-auto px-4 sm:px-6 lg:px-8"
      />

      <Footer />
    </div>
  );
}
