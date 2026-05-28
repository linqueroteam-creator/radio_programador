import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import Corretor from './components/Corretor';
import Home from './components/Home';
import Timeline from './components/Timeline';
import AuthGate from './components/AuthGate';
import TemplatePicker from './components/TemplatePicker';
import CommandPalette from './components/CommandPalette';
import ExportNotebookModal from './components/ExportNotebookModal';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useIsMobile from './hooks/useIsMobile';
import useDueDateReminders from './hooks/useDueDateReminders';
import useEdgeSwipe from './hooks/useEdgeSwipe';
import { LogOut, Command, AlertTriangle, Menu } from 'lucide-react';

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
          <div style={{ maxWidth: 560, background: 'white', border: '1px solid #DCD2E8', borderRadius: 16, padding: 28, boxShadow: '0 8px 24px rgba(45,27,78,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={20} color="#E8637C" />
              <h2 style={{ margin: 0, color: '#3D1B66', fontSize: 18 }}>ANOTATA encontrou um problema</h2>
            </div>
            <p style={{ color: '#5B4A7A', fontSize: 13, lineHeight: 1.5 }}>
              Suas notas estão salvas com segurança no navegador. Recarregue a página para tentar de novo. Se o problema persistir, copie o detalhe abaixo e mande para o desenvolvedor.
            </p>
            <pre style={{ background: '#F2F1F4', border: '1px solid #DCD2E8', borderRadius: 8, padding: 12, fontSize: 11, color: '#3D1B66', overflow: 'auto', maxHeight: 220, whiteSpace: 'pre-wrap' }}>
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

  // === Layout responsivo ===
  // Em telas < 768px (md do Tailwind), Sidebar e NoteList viram gavetas
  // sobrepostas. Em desktop o comportamento original (recolher) continua.
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [noteListCollapsed, setNoteListCollapsed] = useState(false);
  // Estados específicos do mobile (gavetas): começam fechadas.
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [noteListOpenMobile, setNoteListOpenMobile] = useState(false);

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  // Pacote C — modal de exportação em lote: 'all' | { id, name } notebook | null
  const [exportTarget, setExportTarget] = useState(null);

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
      else if (sidebarOpenMobile) setSidebarOpenMobile(false);
      else if (noteListOpenMobile) setNoteListOpenMobile(false);
    },
  });

  // ATENÇÃO: TODOS os hooks (useCallback / useMemo / useState / useEffect) PRECISAM
  // ser chamados ANTES de qualquer early return. Caso contrário, o React quebra com
  // "Rendered more hooks than during the previous render" e a tela fica branca.

  // Ao redimensionar de mobile pra desktop, garante que as gavetas fechem
  // (caso contrário fica um sidebar aberto no canto da tela em desktop).
  useEffect(() => {
    if (!isMobile) {
      if (sidebarOpenMobile) setSidebarOpenMobile(false);
      if (noteListOpenMobile) setNoteListOpenMobile(false);
    }
  }, [isMobile]);

  // Quando uma gaveta abre em mobile, trava o scroll do body pra evitar
  // que a página inteira role atrás do drawer.
  useEffect(() => {
    const anyDrawerOpen = isMobile && (sidebarOpenMobile || noteListOpenMobile);
    if (anyDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, sidebarOpenMobile, noteListOpenMobile]);

  // Fecha as gavetas automaticamente quando o usuário troca de view em mobile.
  // Se ele clicou num caderno na sidebar, ele quer ver o conteúdo, não o menu.
  useEffect(() => {
    if (isMobile) {
      setSidebarOpenMobile(false);
      setNoteListOpenMobile(false);
    }
  }, [store.currentView, store.currentNotebookId, store.currentTagFilter, store.currentCollectionId]);

  // Fecha a NoteList em mobile quando uma nota é selecionada (foco no editor).
  useEffect(() => {
    if (isMobile && store.selectedNoteId) {
      setNoteListOpenMobile(false);
    }
  }, [store.selectedNoteId]);

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
      case 'export-all-zip':
        // Pacote C — abre modal de exportação com todas as notas
        setExportTarget('all');
        break;
      default:
        // Pacote C — exportar caderno específico vem como "export-notebook:{id}"
        if (typeof actionId === 'string' && actionId.startsWith('export-notebook:')) {
          const nbId = actionId.split(':')[1];
          const nb = (store.notebooks || []).find(n => n.id === nbId);
          if (nb) setExportTarget(nb);
        }
        break;
    }
  }, [store]);

  // Handlers compartilhados (passados pra Editor / Home)
  const openSidebarMobile = useCallback(() => setSidebarOpenMobile(true), []);
  const openNoteListMobile = useCallback(() => setNoteListOpenMobile(true), []);

  // Handler usado pelo sino de lembretes — abre uma nota específica
  // (vinda da lista de prazos) ou de um clique na notificação do navegador.
  const handleOpenNoteFromReminder = useCallback((noteId) => {
    if (!noteId) return;
    store.setSearchQuery('');
    store.setCurrentView('all');
    store.setSelectedNoteId(noteId);
  }, [store]);

  // === Lembretes de prazo via Web Notifications (Pacote B) ===
  // Hook único que cuida de: checar prazos a cada 5min, escutar visibilitychange,
  // disparar Notification do navegador, marcar quem já foi notificado pra não
  // repetir no mesmo dia. Hook fica AQUI, antes de qualquer return condicional,
  // pra preservar Rules of Hooks.
  useDueDateReminders({
    enabled: !!(store.settings && store.settings.notifications && store.settings.notifications.enabled),
    notes: store.notes,
    lastNotifiedKeys: (store.settings && store.settings.notifications && store.settings.notifications.lastNotifiedKeys) || [],
    onNotified: store.recordNotificationKey,
    onClickNote: handleOpenNoteFromReminder,
  });

  // === Mobile 4: gestos (Pacote D) ===
  // Edge swipe da borda esquerda → abre a Sidebar como gaveta. Só ativa quando
  // a gaveta NÃO está aberta (evita que o gesto reapareça em cima do drawer).
  useEdgeSwipe({
    enabled: isMobile && !sidebarOpenMobile && !noteListOpenMobile,
    edge: 'left',
    edgeWidth: 24,
    threshold: 60,
    onSwipe: () => setSidebarOpenMobile(true),
  });

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
          onOpenMobileMenu={isMobile ? openSidebarMobile : undefined}
        />
      );
    }
    if (store.currentView === 'insights' || store.currentView === 'dashboard') {
      return <Dashboard store={store} onOpenMobileMenu={isMobile ? openSidebarMobile : undefined} />;
    }
    if (store.currentView === 'corretor') {
      return <Corretor store={store} onOpenMobileMenu={isMobile ? openSidebarMobile : undefined} />;
    }
    if (store.currentView === 'timeline') {
      return <Timeline store={store} onOpenMobileMenu={isMobile ? openSidebarMobile : undefined} />;
    }
    return (
      <>
        <NoteList
          store={store}
          onCreateNote={handleNewNote}
          isCollapsed={noteListCollapsed}
          onToggle={() => setNoteListCollapsed(v => !v)}
          isMobile={isMobile}
          isOpenMobile={noteListOpenMobile}
          onCloseMobile={() => setNoteListOpenMobile(false)}
        />
        <Editor
          store={store}
          onOpenMobileMenu={isMobile ? openSidebarMobile : undefined}
          onOpenMobileNoteList={isMobile ? openNoteListMobile : undefined}
        />
      </>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-anotata-bg relative">
      <Sidebar
        store={store}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobile={isMobile}
        isOpenMobile={sidebarOpenMobile}
        onCloseMobile={() => setSidebarOpenMobile(false)}
        onLogout={handleLogout}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenNote={handleOpenNoteFromReminder}
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

      {/* Pacote C — modal de exportação em lote */}
      {exportTarget && (
        <ExportNotebookModal
          store={store}
          notebook={exportTarget === 'all' ? null : exportTarget}
          onClose={() => setExportTarget(null)}
        />
      )}

      {/* === BOTÕES FIXOS DO RODAPÉ ===
          Em desktop: ficam no canto inferior esquerdo (Ctrl+K, Logout).
          Em mobile: escondidos — Ctrl+K não faz sentido sem teclado e Logout
          mudou pra dentro da Sidebar (drawer). */}
      {!isMobile && (
        <>
          <button
            onClick={() => setShowCommandPalette(true)}
            className="fixed bottom-3 left-12 z-30 px-2.5 py-1.5 bg-white border border-anotata-border rounded-lg text-anotata-text-suave hover:text-anotata-roxo hover:border-anotata-roxo transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 focus-visible:ring-offset-1"
            aria-label="Abrir central de comandos (Ctrl+K)"
            title="Central de comandos (Ctrl+K)"
          >
            <Command size={12} aria-hidden="true" />
            <kbd className="text-2xs bg-anotata-lavanda-clara px-1 rounded">K</kbd>
          </button>

          <button
            onClick={handleLogout}
            className="fixed bottom-3 left-3 z-30 p-2 bg-white border border-anotata-border rounded-lg text-anotata-muted hover:text-anotata-goiaba hover:border-anotata-goiaba transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-goiaba/50 focus-visible:ring-offset-1"
            aria-label="Sair do ANOTATA"
            title="Sair do ANOTATA"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </>
      )}
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
