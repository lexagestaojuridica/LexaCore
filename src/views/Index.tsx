"use client";

import { Navbar, HeroSection } from "@/features/landing/components/HeroSection";
import FeaturesSection from "@/features/landing/components/FeaturesSection";
import ArunaSection from "@/features/landing/components/ArunaSection";
import PricingSection from "@/features/landing/components/PricingSection";
import Footer from "@/features/landing/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ArunaSection />
      <PricingSection />
      <Footer />
    </div>
  );
};

export default Index;
