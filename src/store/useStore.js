import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'anotata-data';

const defaultData = {
  notebooks: [
    { id: 'default', name: 'Meu Caderno', color: '#e8637c', createdAt: new Date().toISOString() }
  ],
  notes: [
    {
      id: uuidv4(),
      title: 'Bem-vindo ao ANOTATA!',
      content: '<h2>Bem-vindo ao ANOTATA! 🎉</h2><p>Seu app de anotações pessoal na web.</p><p>Aqui você pode:</p><ul><li>Criar notas com texto formatado</li><li>Organizar em cadernos</li><li>Usar tags para categorizar</li><li>Criar checklists</li><li>Adicionar imagens</li><li>Marcar favoritos</li><li>E muito mais!</li></ul><p><br></p><p>Comece criando sua primeira nota! ✨</p>',
      notebookId: 'default',
      tags: ['boas-vindas'],
      isFavorite: true,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  tags: ['boas-vindas', 'importante', 'ideia', 'tarefa', 'projeto'],
};

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function useStore() {
  const [data, setData] = useState(defaultData);
  const [currentView, setCurrentView] = useState('home');
  const [currentNotebookId, setCurrentNotebookId] = useState(null);
  const [currentTagFilter, setCurrentTagFilter] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar dados do navegador
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setData(saved);
    }
    setIsLoaded(true);
  }, []);

  // Salvar automaticamente quando dados mudam
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(data);
    }
  }, [data, isLoaded]);

  // === NOTAS ===
  const createNote = useCallback((notebookId = 'default') => {
    const newNote = {
      id: uuidv4(),
      title: '',
      content: '',
      notebookId,
      tags: [],
      isFavorite: false,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
      notes: prev.notes.map(n =>
        n.id === noteId
          ? { ...n, ...updates, updatedAt: new Date().toISOString() }
          : n
      )
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
    setData(prev => ({
      ...prev,
      notes: prev.notes.filter(n => !n.isTrash)
    }));
    setSelectedNoteId(null);
  }, []);

  const toggleFavorite = useCallback((noteId) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n
      )
    }));
  }, []);

  const duplicateNote = useCallback((noteId) => {
    const original = data.notes.find(n => n.id === noteId);
    if (!original) return;
    const newNote = {
      ...original,
      id: uuidv4(),
      title: `${original.title} (cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));
  }, [data.notes]);

  // === CADERNOS ===
  const createNotebook = useCallback((name, color = '#e8637c') => {
    const newNotebook = {
      id: uuidv4(),
      name,
      color,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      notebooks: [...prev.notebooks, newNotebook]
    }));
    return newNotebook.id;
  }, []);

  const renameNotebook = useCallback((notebookId, name) => {
    setData(prev => ({
      ...prev,
      notebooks: prev.notebooks.map(nb =>
        nb.id === notebookId ? { ...nb, name } : nb
      )
    }));
  }, []);

  const deleteNotebook = useCallback((notebookId) => {
    setData(prev => ({
      ...prev,
      notebooks: prev.notebooks.filter(nb => nb.id !== notebookId),
      notes: prev.notes.map(n =>
        n.notebookId === notebookId ? { ...n, notebookId: 'default' } : n
      )
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
      notes: prev.notes.map(n => ({
        ...n,
        tags: n.tags.filter(t => t !== tagName)
      }))
    }));
  }, []);

  const addTagToNote = useCallback((noteId, tagName) => {
    const tag = tagName.toLowerCase().trim();
    if (!tag) return;
    addTag(tag);
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId && !n.tags.includes(tag)
          ? { ...n, tags: [...n.tags, tag] }
          : n
      )
    }));
  }, [addTag]);

  const removeTagFromNote = useCallback((noteId, tagName) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId
          ? { ...n, tags: n.tags.filter(t => t !== tagName) }
          : n
      )
    }));
  }, []);

  // === FILTROS ===
  const getFilteredNotes = useCallback(() => {
    let filtered = data.notes;

    switch (currentView) {
      case 'all':
        filtered = filtered.filter(n => !n.isTrash);
        break;
      case 'favorites':
        filtered = filtered.filter(n => n.isFavorite && !n.isTrash);
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
        n.tags.some(t => t.includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return filtered;
  }, [data.notes, currentView, currentNotebookId, currentTagFilter, searchQuery]);

  const selectedNote = data.notes.find(n => n.id === selectedNoteId) || null;

  const getNotebookById = useCallback((id) => {
    return data.notebooks.find(nb => nb.id === id);
  }, [data.notebooks]);

  const getNoteCount = useCallback((notebookId) => {
    return data.notes.filter(n => n.notebookId === notebookId && !n.isTrash).length;
  }, [data.notes]);

  return {
    notebooks: data.notebooks,
    notes: data.notes,
    tags: data.tags,
    selectedNote,
    filteredNotes: getFilteredNotes(),
    isLoaded,

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
    duplicateNote,

    createNotebook,
    renameNotebook,
    deleteNotebook,
    getNotebookById,
    getNoteCount,

    addTag,
    removeTag,
    addTagToNote,
    removeTagFromNote,
  };
}
