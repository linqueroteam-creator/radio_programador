import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'anotata-data';
const SCHEMA_VERSION = 2;

// === MIGRAÇÃO SUAVE ===
// Adiciona campos novos sem quebrar notas antigas
function migrateNote(note) {
  // Migrar conexões: se eram só array de IDs, converte para objetos
  let connections = note.manualConnections || [];
  if (connections.length > 0 && typeof connections[0] === 'string') {
    connections = connections.map(id => ({
      noteId: id,
      reason: 'Conexão antiga',
      createdAt: note.updatedAt || new Date().toISOString(),
    }));
  }

  return {
    // Campos antigos (preservados)
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    notebookId: note.notebookId || 'default',
    tags: note.tags || [],
    isFavorite: note.isFavorite || false,
    isTrash: note.isTrash || false,
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: note.updatedAt || new Date().toISOString(),

    // === FASE 1: Modelo de dados inteligente ===
    category: note.category || null,
    type: note.type || 'rascunho',
    status: note.status || 'ativo',
    priority: note.priority || 'normal',
    nextAction: note.nextAction || null,
    manualConnections: connections,
    dueDate: note.dueDate || null,
    isPinned: note.isPinned || false,
    isArchived: note.isArchived || false,
    reviewedAt: note.reviewedAt || null,
    editCount: note.editCount || 0,
    versions: note.versions || [],
    source: note.source || 'manual',

    // === FASE 2: campos adicionais ===
    ignoredSuggestions: note.ignoredSuggestions || [],
    customNextAction: note.customNextAction || null,
  };
}

const defaultData = {
  schemaVersion: SCHEMA_VERSION,
  notebooks: [
    { id: 'default', name: 'Meu Caderno', color: '#5B2D8E', createdAt: new Date().toISOString() }
  ],
  notes: [
    migrateNote({
      id: uuidv4(),
      title: 'Bem-vindo ao ANOTATA!',
      content: '<h2>Bem-vindo ao ANOTATA! 🎉</h2><p>Seu app de anotações pessoal e <strong>inteligente sem IA</strong>.</p><p>Recursos novos:</p><ul><li>📷 <strong>Cole imagens direto</strong> (Ctrl+V) e redimensione clicando nelas</li><li>🏷️ Tipos de nota: ideia, tarefa, decisão, problema...</li><li>🎯 Próxima ação sugerida automaticamente</li><li>🔗 Conexões inteligentes entre notas</li><li>📊 Diagnóstico da saúde da nota</li></ul><p>Comece criando sua primeira nota! ✨</p>',
      notebookId: 'default',
      tags: ['boas-vindas'],
      isFavorite: true,
      type: 'referencia',
      priority: 'normal',
    })
  ],
  tags: ['boas-vindas', 'importante', 'ideia', 'tarefa', 'projeto'],
  categories: [],
};

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar:', e);
  }
}

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    // Aplicar migração nas notas se vierem do schema antigo
    if (parsed.notes && Array.isArray(parsed.notes)) {
      parsed.notes = parsed.notes.map(migrateNote);
    }
    if (!parsed.categories) parsed.categories = [];
    parsed.schemaVersion = SCHEMA_VERSION;
    return parsed;
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    return null;
  }
}

// Cria snapshot de versão (mantém só os últimos 10)
function createVersion(note) {
  return {
    timestamp: new Date().toISOString(),
    title: note.title,
    content: note.content,
    type: note.type,
    status: note.status,
    priority: note.priority,
  };
}

export function useStore() {
  const [data, setData] = useState(defaultData);
  const [currentView, setCurrentView] = useState('home');
  const [currentNotebookId, setCurrentNotebookId] = useState(null);
  const [currentTagFilter, setCurrentTagFilter] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error

  // Carregar dados do navegador
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setData(saved);
    }
    setIsLoaded(true);
  }, []);

  // Salvar automaticamente com indicador
  useEffect(() => {
    if (!isLoaded) return;
    setSaveStatus('saving');
    const t = setTimeout(() => {
      saveToStorage(data);
      setSaveStatus('saved');
      const t2 = setTimeout(() => setSaveStatus('idle'), 1500);
      return () => clearTimeout(t2);
    }, 600);
    return () => clearTimeout(t);
  }, [data, isLoaded]);

  // === NOTAS ===
  const createNote = useCallback((notebookId = 'default', overrides = {}) => {
    const newNote = migrateNote({
      id: uuidv4(),
      title: '',
      content: '',
      notebookId,
      ...overrides,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setData(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));
    setSelectedNoteId(newNote.id);
    return newNote.id;
  }, []);

  const updateNote = useCallback((noteId, updates) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => {
        if (n.id !== noteId) return n;
        // Cria versão se mudou conteúdo (a cada 10 edições)
        const editCount = (n.editCount || 0) + 1;
        let versions = n.versions || [];
        if ('content' in updates && editCount % 10 === 0) {
          versions = [...versions, createVersion(n)].slice(-10);
        }
        return {
          ...n,
          ...updates,
          editCount,
          versions,
          updatedAt: new Date().toISOString(),
        };
      })
    }));
  }, []);

  const moveToTrash = useCallback((noteId) => {
    updateNote(noteId, { isTrash: true });
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  }, [updateNote, selectedNoteId]);

  const restoreNote = useCallback((noteId) => {
    updateNote(noteId, { isTrash: false });
  }, [updateNote]);

  const deleteNotePermanently = useCallback((noteId) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== noteId)
    }));
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  }, [selectedNoteId]);

  const emptyTrash = useCallback(() => {
    setData(prev => ({ ...prev, notes: prev.notes.filter(n => !n.isTrash) }));
    setSelectedNoteId(null);
  }, []);

  const toggleFavorite = useCallback((noteId) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n)
    }));
  }, []);

  const togglePin = useCallback((noteId) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)
    }));
  }, []);

  const archiveNote = useCallback((noteId) => {
    updateNote(noteId, { isArchived: true });
  }, [updateNote]);

  const unarchiveNote = useCallback((noteId) => {
    updateNote(noteId, { isArchived: false });
  }, [updateNote]);

  const markAsReviewed = useCallback((noteId) => {
    updateNote(noteId, { reviewedAt: new Date().toISOString() });
  }, [updateNote]);

  const restoreVersion = useCallback((noteId, versionIndex) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => {
        if (n.id !== noteId) return n;
        const v = (n.versions || [])[versionIndex];
        if (!v) return n;
        return {
          ...n,
          title: v.title,
          content: v.content,
          type: v.type,
          status: v.status,
          priority: v.priority,
          updatedAt: new Date().toISOString(),
        };
      })
    }));
  }, []);

  const duplicateNote = useCallback((noteId) => {
    const original = data.notes.find(n => n.id === noteId);
    if (!original) return;
    const newNote = migrateNote({
      ...original,
      id: uuidv4(),
      title: `${original.title} (cópia)`,
      isFavorite: false,
      isPinned: false,
      versions: [],
      editCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
  }, [data.notes]);

  // === CONEXÕES MANUAIS (com motivo e data) ===
  const connectNotes = useCallback((noteAId, noteBId, reason = '') => {
    if (noteAId === noteBId) return;
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => {
        if (n.id === noteAId) {
          const conns = n.manualConnections || [];
          if (!conns.some(c => c.noteId === noteBId)) {
            return { ...n, manualConnections: [...conns, { noteId: noteBId, reason, createdAt: now }] };
          }
        }
        if (n.id === noteBId) {
          const conns = n.manualConnections || [];
          if (!conns.some(c => c.noteId === noteAId)) {
            return { ...n, manualConnections: [...conns, { noteId: noteAId, reason, createdAt: now }] };
          }
        }
        return n;
      })
    }));
  }, []);

  const disconnectNotes = useCallback((noteAId, noteBId) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => {
        if (n.id === noteAId) {
          return { ...n, manualConnections: (n.manualConnections || []).filter(c => c.noteId !== noteBId) };
        }
        if (n.id === noteBId) {
          return { ...n, manualConnections: (n.manualConnections || []).filter(c => c.noteId !== noteAId) };
        }
        return n;
      })
    }));
  }, []);

  // Marca uma sugestão de conexão como ignorada (não aparece mais)
  const ignoreSuggestion = useCallback((noteId, otherNoteId) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => {
        if (n.id !== noteId) return n;
        const ignored = n.ignoredSuggestions || [];
        if (ignored.includes(otherNoteId)) return n;
        return { ...n, ignoredSuggestions: [...ignored, otherNoteId] };
      })
    }));
  }, []);

  // Define a próxima ação personalizada da nota (texto livre)
  const setCustomNextAction = useCallback((noteId, text) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId ? { ...n, customNextAction: text || null } : n
      )
    }));
  }, []);

  // === CADERNOS ===
  const createNotebook = useCallback((name, color = '#5B2D8E') => {
    const newNotebook = { id: uuidv4(), name, color, createdAt: new Date().toISOString() };
    setData(prev => ({ ...prev, notebooks: [...prev.notebooks, newNotebook] }));
    return newNotebook.id;
  }, []);

  const renameNotebook = useCallback((notebookId, name) => {
    setData(prev => ({
      ...prev,
      notebooks: prev.notebooks.map(nb => nb.id === notebookId ? { ...nb, name } : nb)
    }));
  }, []);

  const deleteNotebook = useCallback((notebookId) => {
    setData(prev => ({
      ...prev,
      notebooks: prev.notebooks.filter(nb => nb.id !== notebookId),
      notes: prev.notes.map(n => n.notebookId === notebookId ? { ...n, notebookId: 'default' } : n)
    }));
  }, []);

  // === CATEGORIAS ===
  const addCategory = useCallback((name) => {
    const cat = name.trim();
    if (!cat) return;
    setData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) ? prev.categories : [...prev.categories, cat]
    }));
  }, []);

  // === TAGS ===
  const addTag = useCallback((tagName) => {
    const tag = tagName.toLowerCase().trim();
    if (!tag) return;
    setData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag]
    }));
  }, []);

  const removeTag = useCallback((tagName) => {
    setData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagName),
      notes: prev.notes.map(n => ({ ...n, tags: n.tags.filter(t => t !== tagName) }))
    }));
  }, []);

  const addTagToNote = useCallback((noteId, tagName) => {
    const tag = tagName.toLowerCase().trim();
    if (!tag) return;
    addTag(tag);
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId && !n.tags.includes(tag) ? { ...n, tags: [...n.tags, tag] } : n
      )
    }));
  }, [addTag]);

  const removeTagFromNote = useCallback((noteId, tagName) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId ? { ...n, tags: n.tags.filter(t => t !== tagName) } : n
      )
    }));
  }, []);

  // === FILTROS ===
  const getFilteredNotes = useCallback(() => {
    let filtered = data.notes;

    switch (currentView) {
      case 'all':
        filtered = filtered.filter(n => !n.isTrash && !n.isArchived);
        break;
      case 'favorites':
        filtered = filtered.filter(n => n.isFavorite && !n.isTrash);
        break;
      case 'pinned':
        filtered = filtered.filter(n => n.isPinned && !n.isTrash);
        break;
      case 'archived':
        filtered = filtered.filter(n => n.isArchived && !n.isTrash);
        break;
      case 'trash':
        filtered = filtered.filter(n => n.isTrash);
        break;
      case 'notebook':
        filtered = filtered.filter(n => n.notebookId === currentNotebookId && !n.isTrash);
        break;
      case 'tag':
        filtered = filtered.filter(n => n.tags.includes(currentTagFilter) && !n.isTrash);
        break;
      default:
        filtered = filtered.filter(n => !n.isTrash);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        n.tags.some(t => t.includes(q)) ||
        (n.category && n.category.toLowerCase().includes(q))
      );
    }

    // Pinados sempre primeiro
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    return filtered;
  }, [data.notes, currentView, currentNotebookId, currentTagFilter, searchQuery]);

  const selectedNote = data.notes.find(n => n.id === selectedNoteId) || null;

  const getNotebookById = useCallback((id) => data.notebooks.find(nb => nb.id === id), [data.notebooks]);
  const getNoteCount = useCallback((notebookId) =>
    data.notes.filter(n => n.notebookId === notebookId && !n.isTrash).length, [data.notes]);
  const getNoteById = useCallback((id) => data.notes.find(n => n.id === id), [data.notes]);

  return {
    notebooks: data.notebooks,
    notes: data.notes,
    tags: data.tags,
    categories: data.categories || [],
    selectedNote,
    filteredNotes: getFilteredNotes(),
    isLoaded,
    saveStatus,

    currentView,
    currentNotebookId,
    currentTagFilter,
    selectedNoteId,
    searchQuery,

    setCurrentView,
    setCurrentNotebookId,
    setCurrentTagFilter,
    setSelectedNoteId,
    setSearchQuery,

    createNote,
    updateNote,
    moveToTrash,
    restoreNote,
    deleteNotePermanently,
    emptyTrash,
    toggleFavorite,
    togglePin,
    archiveNote,
    unarchiveNote,
    markAsReviewed,
    restoreVersion,
    duplicateNote,
    connectNotes,
    disconnectNotes,
    ignoreSuggestion,
    setCustomNextAction,
    getNoteById,

    createNotebook,
    renameNotebook,
    deleteNotebook,
    getNotebookById,
    getNoteCount,

    addCategory,
    addTag,
    removeTag,
    addTagToNote,
    removeTagFromNote,
  };
}
