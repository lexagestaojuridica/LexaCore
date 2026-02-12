import { Navbar, HeroSection } from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ArunaSection from "@/components/landing/ArunaSection";
import PricingSection from "@/components/landing/PricingSection";
import Footer from "@/components/landing/Footer";

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
