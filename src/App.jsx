import React, { useState } from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import Corretor from './components/Corretor';
import Home from './components/Home';

export default function App() {
  const store = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!store.isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-anotata-bg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-anotata-roxo mb-2">ANOTATA</h1>
          <p className="text-anotata-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  // Renderiza a área principal baseado na view
  const renderMainArea = () => {
    if (store.currentView === 'home') {
      return (
        <Home
          store={store}
          onOpenInsights={() => { store.setCurrentView('insights'); store.setSelectedNoteId(null); }}
        />
      );
    }
    if (store.currentView === 'insights' || store.currentView === 'dashboard') {
      return <Dashboard store={store} />;
    }
    if (store.currentView === 'corretor') {
      return <Corretor store={store} />;
    }
    return (
      <>
        <NoteList store={store} />
        <Editor store={store} />
      </>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-anotata-bg">
      <Sidebar
        store={store}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex overflow-hidden">
        {renderMainArea()}
      </div>
    </div>
  );
}
