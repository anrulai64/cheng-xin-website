import type { Metadata } from "next"
import { HomeHero } from "@/components/home/home-hero"
import {
  WhyChooseUs,
  ServicesOverview,
  ProcessSection,
  EquipmentSection,
  DefectsSection,
  AreasSection,
  TestimonialsSection,
  HomeFaqSection,
} from "@/components/home/home-sections"
import { CtaSection } from "@/components/shared"

export const metadata: Metadata = {
  title: "誠昕驗屋｜桃園台北新北新竹專業驗屋服務",
  description:
    "誠昕驗屋提供桃園、台北、新北、新竹專業驗屋服務，涵蓋新成屋驗屋、中古屋驗屋、預售屋驗收，以專業檢測儀器與詳細驗屋報告，守護您的購屋品質。",
  alternates: { canonical: "/" },
}

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <WhyChooseUs />
      <ServicesOverview />
      <ProcessSection />
      <EquipmentSection />
      <DefectsSection />
      <AreasSection />
      <TestimonialsSection />
      <HomeFaqSection />
      <CtaSection />
    </>
  )
}
