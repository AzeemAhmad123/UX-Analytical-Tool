import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OnboardingContent } from './components/OnboardingContent';
import { SessionReplay } from './components/SessionReplay';
import { Heatmaps } from './components/Heatmaps';
import { Funnel } from './components/Funnel';
import { Dashboards } from './components/Dashboards';
import { Home } from './components/Home';
import { VoiceOfCustomer } from './components/VoiceOfCustomer';
import { Segments } from './components/Segments';
import { WebPerformance } from './components/WebPerformance';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'get-started' | 'session-replay' | 'heatmaps' | 'funnel' | 'dashboards' | 'home' | 'voice-of-customer' | 'segments' | 'web-performance'>('home');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {currentPage === 'home' && <Home />}
          {currentPage === 'get-started' && <OnboardingContent />}
          {currentPage === 'session-replay' && <SessionReplay />}
          {currentPage === 'heatmaps' && <Heatmaps />}
          {currentPage === 'funnel' && <Funnel />}
          {currentPage === 'dashboards' && <Dashboards />}
          {currentPage === 'voice-of-customer' && <VoiceOfCustomer />}
          {currentPage === 'segments' && <Segments />}
          {currentPage === 'web-performance' && <WebPerformance />}
        </main>
      </div>
    </div>
  );
}