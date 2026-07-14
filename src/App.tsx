import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import LogInteraction from './pages/LogInteraction';
import HCPDirectory from './pages/HCPDirectory';
import InteractionHistory from './pages/InteractionHistory';

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of HCP engagement and interaction metrics' },
  'log-interaction': { title: 'Log Interaction', subtitle: 'Record HCP interactions via form or AI chat' },
  hcps: { title: 'HCP Directory', subtitle: 'Browse and manage healthcare professionals' },
  interactions: { title: 'Interaction History', subtitle: 'View and manage all logged interactions' },
};

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const config = pageConfig[activePage] || pageConfig.dashboard;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />;
      case 'log-interaction':
        return <LogInteraction />;
      case 'hcps':
        return <HCPDirectory onNavigate={setActivePage} />;
      case 'interactions':
        return <InteractionHistory />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={config.title} subtitle={config.subtitle} />
        <main className="flex-1 overflow-hidden">{renderPage()}</main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
