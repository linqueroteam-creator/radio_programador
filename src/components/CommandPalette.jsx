import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Plus, Sparkles, FileText, BookOpen, Tag, Star, Pin, Archive,
  Trash2, Copy, Eye, Calendar, Link2, CheckSquare, Flag,
  TrendingUp, Layers, SpellCheck, Home as HomeIcon,
  Download, X, ArrowRight, Hash
} from 'lucide-react';
import searchEngine from '../engine/SearchEngine';
import { COLLECTION_LIST } from '../engine/CollectionsEngine';
import { TEMPLATE_LIST } from '../engine/Templates';

/**
 * ANOTATA — Central de Comandos (Ctrl+K)
 *
 * Modal único para tudo: criar, buscar, navegar, agir.
 * Inspirado em paletas de comando modernas, mas implementado do zero.
 */
export default function CommandPalette({ store, isOpen, onClose, onAction }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Comandos disponíveis
  const allCommands = useMemo(() => {
    const note = store.selectedNote;
    const cmds = [];

    // === CRIAR ===
    cmds.push({
      id: 'new-note', group: 'Criar', icon: Plus,
      label: 'Nova anotação em branco',
      desc: 'Cria nota vazia',
      action: () => { store.createNote(store.currentView === 'notebook' ? store.currentNotebookId : 'default'); onAction?.('new-note'); }
    });
    cmds.push({
      id: 'new-with-template', group: 'Criar', icon: Sparkles,
      label: 'Nova com modelo',
      desc: 'Escolher template antes de criar',
      action: () => onAction?.('new-with-template'),
    });
    TEMPLATE_LIST.slice(0, 6).forEach(t => {
      cmds.push({
        id: `new-${t.id}`, group: 'Criar', icon: () => <span className="text-base">{t.icon}</span>,
        label: `Nova ${t.name.toLowerCase()}`,
        desc: t.description,
        action: () => {
          const id = store.createNote(store.currentNotebookId || 'default', {
            title: '',
            content: t.content,
            type: t.type,
            status: t.status,
            priority: t.priority,
            source: `template:${t.id}`,
          });
          store.setCurrentView('all');
          store.setSelectedNoteId(id);
          onAction?.('new-template');
        },
      });
    });

    // === NAVEGAR ===
    cmds.push({
      id: 'go-home', group: 'Navegar', icon: HomeIcon,
      label: 'Ir para Início',
      action: () => { store.setCurrentView('home'); store.setSelectedNoteId(null); onAction?.('go-home'); },
    });
    cmds.push({
      id: 'go-all', group: 'Navegar', icon: FileText,
      label: 'Ver todas as notas',
      action: () => { store.setCurrentView('all'); store.setSelectedNoteId(null); onAction?.('go-all'); },
    });
    cmds.push({
      id: 'go-favs', group: 'Navegar', icon: Star,
      label: 'Ver favoritas',
      action: () => { store.setCurrentView('favorites'); store.setSelectedNoteId(null); onAction?.('go-favs'); },
    });
    cmds.push({
      id: 'go-pinned', group: 'Navegar', icon: Pin,
      label: 'Ver fixadas',
      action: () => { store.setCurrentView('pinned'); store.setSelectedNoteId(null); onAction?.('go-pinned'); },
    });
    cmds.push({
      id: 'go-corretor', group: 'Navegar', icon: SpellCheck,
      label: 'Abrir corretor ortográfico',
      action: () => { store.setCurrentView('corretor'); store.setSelectedNoteId(null); onAction?.('go-corretor'); },
    });
    cmds.push({
      id: 'go-insights', group: 'Navegar', icon: TrendingUp,
      label: 'Ver insights e estatísticas',
      action: () => { store.setCurrentView('insights'); store.setSelectedNoteId(null); onAction?.('go-insights'); },
    });
    cmds.push({
      id: 'clear-filters', group: 'Navegar', icon: X,
      label: 'Limpar filtros e busca',
      action: () => {
        store.setSearchQuery('');
        store.setCurrentView('all');
        store.setSelectedNoteId(null);
        onAction?.('clear-filters');
      },
    });

    // === COLEÇÕES (atalhos diretos) ===
    COLLECTION_LIST.forEach(c => {
      cmds.push({
        id: `coll-${c.id}`, group: 'Coleções', icon: () => <span className="text-base">{c.icon}</span>,
        label: `Ir para "${c.name}"`,
        desc: c.description,
        action: () => {
          store.setCurrentView('collection');
          store.setCurrentCollectionId(c.id);
          store.setSelectedNoteId(null);
          onAction?.('go-collection');
        },
      });
    });

    // === AÇÕES NA NOTA ATUAL ===
    if (note) {
      cmds.push({
        id: 'act-fav', group: 'Nota atual', icon: Star,
        label: note.isFavorite ? 'Remover dos favoritos' : 'Favoritar nota',
        action: () => { store.toggleFavorite(note.id); onAction?.('act-fav'); },
      });
      cmds.push({
        id: 'act-pin', group: 'Nota atual', icon: Pin,
        label: note.isPinned ? 'Desafixar nota' : 'Fixar nota',
        action: () => { store.togglePin(note.id); onAction?.('act-pin'); },
      });
      cmds.push({
        id: 'act-review', group: 'Nota atual', icon: Eye,
        label: 'Marcar como revisada',
        action: () => { store.markAsReviewed(note.id); onAction?.('act-review'); },
      });
      cmds.push({
        id: 'act-archive', group: 'Nota atual', icon: Archive,
        label: note.isArchived ? 'Desarquivar' : 'Arquivar nota',
        action: () => {
          if (note.isArchived) store.unarchiveNote(note.id);
          else store.archiveNote(note.id);
          onAction?.('act-archive');
        },
      });
      cmds.push({
        id: 'act-duplicate', group: 'Nota atual', icon: Copy,
        label: 'Duplicar nota',
        action: () => { store.duplicateNote(note.id); onAction?.('act-duplicate'); },
      });
      cmds.push({
        id: 'act-conn', group: 'Nota atual', icon: Link2,
        label: 'Adicionar conexão com outra nota',
        action: () => onAction?.('open-connection'),
      });
      cmds.push({
        id: 'act-due', group: 'Nota atual', icon: Calendar,
        label: 'Definir prazo da nota',
        action: () => onAction?.('open-due-date'),
      });
      cmds.push({
        id: 'act-task', group: 'Nota atual', icon: CheckSquare,
        label: 'Adicionar tarefa ao checklist',
        action: () => onAction?.('add-task'),
      });
      cmds.push({
        id: 'act-trash', group: 'Nota atual', icon: Trash2,
        label: 'Mover para lixeira',
        action: () => { store.moveToTrash(note.id); onAction?.('act-trash'); },
      });
      cmds.push({
        id: 'act-export-md', group: 'Nota atual', icon: Download,
        label: 'Exportar como Markdown (.md)',
        action: () => onAction?.('export-md'),
      });
      cmds.push({
        id: 'act-export-txt', group: 'Nota atual', icon: Download,
        label: 'Exportar como texto (.txt)',
        action: () => onAction?.('export-txt'),
      });
      cmds.push({
        id: 'act-copy', group: 'Nota atual', icon: Copy,
        label: 'Copiar conteúdo da nota',
        action: () => onAction?.('copy-content'),
      });
    }

    // === BUSCAR NOTA ESPECÍFICA (se digitando) ===
    if (query.trim().length >= 2) {
      const results = searchEngine.search(store.notes, query, { limit: 8 });
      results.forEach(r => {
        cmds.push({
          id: `note-${r.note.id}`,
          group: 'Notas encontradas',
          icon: FileText,
          label: r.note.title || 'Sem título',
          desc: stripHtml(r.note.content).slice(0, 80),
          action: () => {
            store.setCurrentView('all');
            store.setSelectedNoteId(r.note.id);
            onAction?.('open-note');
          },
        });
      });
    }

    return cmds;
  }, [query, store.selectedNote, store.notes, onAction, store]);

  // Filtra comandos pelo query (busca aproximada simples)
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.desc && c.desc.toLowerCase().includes(q)) ||
      c.group.toLowerCase().includes(q)
    );
  }, [query, allCommands]);

  // Agrupa por grupo
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((cmd, idx) => {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group].push({ ...cmd, _index: idx });
    });
    return groups;
  }, [filtered]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, activeIndex, filtered, onClose]);

  // Reseta o index quando muda o filtro
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll automático para o item ativo
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(`[data-cmd-index="${activeIndex}"]`);
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-start justify-center z-[100] pt-[15vh] px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-anotata-border flex items-center gap-2">
          <Search size={16} className="text-anotata-roxo shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite um comando ou busque por nota..."
            className="flex-1 text-sm text-anotata-text placeholder:text-anotata-muted bg-transparent border-none focus:outline-none"
          />
          <kbd className="text-[10px] text-anotata-muted bg-anotata-lavanda-clara px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-anotata-muted">
              Nenhum comando encontrado para "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([groupName, cmds]) => (
              <div key={groupName} className="mb-2">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-anotata-muted tracking-wider">
                  {groupName}
                </div>
                {cmds.map(cmd => {
                  const Icon = cmd.icon;
                  const isActive = cmd._index === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      data-cmd-index={cmd._index}
                      onMouseEnter={() => setActiveIndex(cmd._index)}
                      onClick={() => { cmd.action(); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'bg-anotata-roxo text-white'
                          : 'hover:bg-anotata-hover text-anotata-text'
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? 'text-white' : 'text-anotata-roxo'}`}>
                        {typeof Icon === 'function' ? <Icon size={14} /> : Icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-anotata-text'}`}>
                          {cmd.label}
                        </div>
                        {cmd.desc && (
                          <div className={`text-[11px] truncate ${isActive ? 'text-white/80' : 'text-anotata-text-suave'}`}>
                            {cmd.desc}
                          </div>
                        )}
                      </div>
                      {isActive && <ArrowRight size={12} className="text-white/80 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t border-anotata-border bg-anotata-lavanda-clara flex items-center justify-between text-[10px] text-anotata-text-suave">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-white border border-anotata-border rounded px-1">↑↓</kbd> navegar</span>
            <span><kbd className="bg-white border border-anotata-border rounded px-1">Enter</kbd> executar</span>
            <span><kbd className="bg-white border border-anotata-border rounded px-1">Esc</kbd> fechar</span>
          </div>
          <span className="text-anotata-roxo font-medium">{filtered.length} comandos</span>
        </div>
      </div>
    </div>
  );
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
