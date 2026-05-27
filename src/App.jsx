import React, { useState } from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import Corretor from './components/Corretor';
import Home from './components/Home';
import AuthGate from './components/AuthGate';
import TemplatePicker from './components/TemplatePicker';
import { LogOut } from 'lucide-react';

function MainApp({ logout }) {
  const store = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

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

  const handleLogout = () => {
    if (confirm('Sair do ANOTATA? Você precisará digitar a senha para entrar de novo.')) {
      logout();
    }
  };

  const handleNewNote = () => {
    setShowTemplatePicker(true);
  };

  const renderMainArea = () => {
    if (store.currentView === 'home') {
      return (
        <Home
          store={store}
          onOpenInsights={() => { store.setCurrentView('insights'); store.setSelectedNoteId(null); }}
          onCreateNote={handleNewNote}
        />
      );
    }
    if (store.currentView === 'insights' || store.currentView === 'dashboard') {
      return <Dashboard store={store} />;
    }
    if (store.currentView === 'corretor') {
      return <Corretor store={store} />;
    }
    // Para todas as outras views (all, favorites, pinned, archived, trash, notebook, tag, collection)
    return (
      <>
        <NoteList store={store} onCreateNote={handleNewNote} />
        <Editor store={store} />
      </>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-anotata-bg relative">
      <Sidebar
        store={store}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex overflow-hidden">
        {renderMainArea()}
      </div>

      {showTemplatePicker && (
        <TemplatePicker
          store={store}
          onClose={() => setShowTemplatePicker(false)}
          defaultNotebookId={
            store.currentView === 'notebook' ? store.currentNotebookId : 'default'
          }
        />
      )}

      <button
        onClick={handleLogout}
        className="fixed bottom-3 left-3 z-50 p-2 bg-white border border-anotata-border rounded-lg text-anotata-muted hover:text-anotata-goiaba hover:border-anotata-goiaba transition-all shadow-sm hover:shadow-md"
        title="Sair do ANOTATA"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      {({ logout }) => <MainApp logout={logout} />}
    </AuthGate>
  );
}
