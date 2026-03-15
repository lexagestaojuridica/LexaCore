"use client";
import { Navbar, HeroSection } from "@/features/landing/components/HeroSection";
import FeaturesSection from "@/features/landing/components/FeaturesSection";
import ArunaSection from "@/features/landing/components/ArunaSection";
import PricingSection from "@/features/landing/components/PricingSection";
import Footer from "@/features/landing/components/Footer";

export default function Page() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ArunaSection />
      <PricingSection />
      <Footer />
    </main>
  );
}
