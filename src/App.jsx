import React, { useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import Corretor from './components/Corretor';
import Home from './components/Home';
import AuthGate from './components/AuthGate';
import TemplatePicker from './components/TemplatePicker';
import CommandPalette from './components/CommandPalette';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { LogOut, Command, AlertTriangle } from 'lucide-react';

// === Error Boundary ===
// Em vez de tela branca silenciosa, mostra o erro real na tela.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ANOTATA] erro capturado pelo ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#F2F1F4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: 560, background: 'white', border: '1px solid #E8E4F0', borderRadius: 16, padding: 28, boxShadow: '0 8px 24px rgba(45,27,78,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#E8637C" />
              <h2 style={{ margin: 0, color: '#3D1B66', fontSize: 18 }}>ANOTATA encontrou um problema</h2>
            </div>
            <p style={{ color: '#6B5E80', fontSize: 13, lineHeight: 1.5 }}>
              Suas notas estão salvas com segurança no navegador. Recarregue a página para tentar de novo. Se o problema persistir, copie o detalhe abaixo e mande para o desenvolvedor.
            </p>
            <pre style={{ background: '#F6F4F9', border: '1px solid #E8E4F0', borderRadius: 8, padding: 12, fontSize: 11, color: '#3D1B66', overflow: 'auto', maxHeight: 220, whiteSpace: 'pre-wrap' }}>
              {String(this.state.error && this.state.error.stack || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 12, padding: '8px 16px', background: '#5B2D8E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp({ logout }) {
  const store = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // === ATALHOS DE TECLADO GLOBAIS ===
  useKeyboardShortcuts({
    'mod+k': () => setShowCommandPalette(true),
    'mod+/': () => setShowCommandPalette(true), // alternativa
    'mod+n': () => store.createNote(store.currentView === 'notebook' ? store.currentNotebookId : 'default'),
    'mod+shift+n': () => setShowTemplatePicker(true),
    'mod+d': () => store.selectedNote && store.duplicateNote(store.selectedNote.id),
    'mod+shift+f': () => store.selectedNote && store.toggleFavorite(store.selectedNote.id),
    'mod+shift+p': () => store.selectedNote && store.togglePin(store.selectedNote.id),
    'Escape': () => {
      // Esc fecha modais nesta ordem
      if (showCommandPalette) setShowCommandPalette(false);
      else if (showTemplatePicker) setShowTemplatePicker(false);
    },
  });

  // ATENÇÃO: TODOS os hooks (useCallback / useMemo / useState / useEffect) PRECISAM
  // ser chamados ANTES de qualquer early return. Caso contrário, o React quebra com
  // "Rendered more hooks than during the previous render" e a tela fica branca.
  const handleNewNote = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  // Handler para ações vindas do CommandPalette
  const handlePaletteAction = useCallback((actionId) => {
    switch (actionId) {
      case 'new-with-template':
        setShowTemplatePicker(true);
        break;
      case 'open-connection':
        // Botão de conexão fica no editor — disparar via evento
        window.dispatchEvent(new CustomEvent('anotata:open-connection'));
        break;
      case 'open-due-date':
        window.dispatchEvent(new CustomEvent('anotata:open-due-date'));
        break;
      case 'add-task':
        window.dispatchEvent(new CustomEvent('anotata:add-task'));
        break;
      case 'export-md':
        if (store.selectedNote) {
          const md = store.exportNoteAsMarkdown(store.selectedNote.id);
          downloadFile(md, `${(store.selectedNote.title || 'nota').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`, 'text/markdown');
        }
        break;
      case 'export-txt':
        if (store.selectedNote) {
          const txt = store.exportNoteAsText(store.selectedNote.id);
          downloadFile(txt, `${(store.selectedNote.title || 'nota').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`, 'text/plain');
        }
        break;
      case 'copy-content':
        if (store.selectedNote) {
          const txt = store.exportNoteAsText(store.selectedNote.id);
          if (txt && navigator.clipboard) navigator.clipboard.writeText(txt);
        }
        break;
      default:
        break;
    }
  }, [store]);

  // === A PARTIR DAQUI, NENHUM HOOK NOVO === (early return é seguro só depois de todos os hooks)

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

      <CommandPalette
        store={store}
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onAction={handlePaletteAction}
      />

      {/* Botão Ctrl+K (sempre visível) */}
      <button
        onClick={() => setShowCommandPalette(true)}
        className="fixed bottom-3 left-12 z-50 px-2.5 py-1.5 bg-white border border-anotata-border rounded-lg text-anotata-text-suave hover:text-anotata-roxo hover:border-anotata-roxo transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs"
        title="Central de comandos (Ctrl+K)"
      >
        <Command size={12} />
        <kbd className="text-[10px] bg-anotata-lavanda-clara px-1 rounded">K</kbd>
      </button>

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

function downloadFile(content, filename, mime) {
  if (!content) return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthGate>
        {({ logout }) => <MainApp logout={logout} />}
      </AuthGate>
    </ErrorBoundary>
  );
}
