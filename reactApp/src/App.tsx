import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { Footer } from '@/components/footer';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;