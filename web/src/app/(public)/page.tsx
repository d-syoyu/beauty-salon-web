import HeroSection from '@/components/home/HeroSection';
import HomeSections from '@/components/home/HomeSections';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <HeroSection />
      <HomeSections />
    </div>
  );
}
