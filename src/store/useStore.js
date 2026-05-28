import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { analyzeAndLink, onAnalyzedFull } from '../agent/agentClient';

const STORAGE_KEY = 'anotata-data';
const BACKUP_PRE_V3_KEY = 'np_backup_pre_v3';
const SCHEMA_VERSION = 3;

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

    // === ÁREAS DA VIDA (estrutura_neurocognitiva_mestre/areas-da-vida.md) ===
    // Campo que associa a nota a uma das 10 áreas + 'outros' (default).
    // Migração suave: notas antigas que não têm o campo ganham 'outros'.
    lifeArea: note.lifeArea || 'outros',

    // === AGENTE INTELIGENTE LOCAL (PR I + PR J) ===
    // Campos preenchidos pelo Web Worker em background.
    // - inferredLifeArea: área da vida sugerida (não substitui lifeArea manual)
    // - confidenceScore: 0..1, confiança da inferência
    // - lastAgentRun: ISO timestamp da última análise (pra evitar reprocessar)
    // - linkedByAgent: true se o agente vinculou esta nota a um caderno automaticamente
    //                  (PR J) — usado pra que correções do usuário "ensinem" o agente no futuro
    // - suggestedConnections: sinapses detectadas pelo agente (cosine similarity)
    //                          [{ noteId, similarity, reasons: [] }]
    inferredLifeArea: note.inferredLifeArea || null,
    confidenceScore: typeof note.confidenceScore === 'number' ? note.confidenceScore : 0,
    lastAgentRun: note.lastAgentRun || null,
    linkedByAgent: !!note.linkedByAgent,
    suggestedConnections: Array.isArray(note.suggestedConnections) ? note.suggestedConnections : [],
  };
}

const defaultData = {
  schemaVersion: SCHEMA_VERSION,
  notebooks: [
    {
      id: 'default',
      name: 'Meu Caderno',
      color: '#5B2D8E',
      lifeArea: 'outros',  // v3: área da vida do caderno (dedução automática na migração)
      projectId: null,     // v3: caderno avulso (sem projeto)
      createdAt: new Date().toISOString(),
    }
  ],
  projects: [],            // v3: entidade Projeto (peça da hierarquia)
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
  // === Configurações do app (Pacote B — Notificações de Prazo) ===
  // Ficam aqui dentro do mesmo blob salvo em localStorage. Migração suave
  // adiciona o objeto pra usuários antigos.
  settings: {
    notifications: {
      enabled: false,         // usuário ativou lembretes do navegador?
      lastNotifiedKeys: [],   // chaves "noteId-status-yyyymmdd" pra não repetir
    },
  },
};

// Garante que `settings.notifications` existe e tem todos os campos.
// Roda no carregamento, sempre — protege contra esquemas antigos.
function migrateSettings(settings) {
  const s = settings || {};
  const n = s.notifications || {};
  return {
    ...s,
    notifications: {
      enabled: typeof n.enabled === 'boolean' ? n.enabled : false,
      lastNotifiedKeys: Array.isArray(n.lastNotifiedKeys) ? n.lastNotifiedKeys : [],
    },
  };
}

// === MIGRAÇÃO v2 → v3: Hierarquia Áreas/Projetos/Cadernos/Notas ===
//
// Spec: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md (PR #25, mesclado)
//
// Adiciona:
//   - projects: []                         (entidade Projeto, opcional)
//   - notebook.lifeArea (string)           (deduzido pela maioria das notas)
//   - notebook.projectId (string | null)   (null = caderno avulso)
//
// Princípios:
//   - Silenciosa: usuário não percebe.
//   - Idempotente: roda quantas vezes for, resultado igual.
//   - Reversível: backup completo do estado pré-migração em
//     localStorage[BACKUP_PRE_V3_KEY] antes da primeira migração.
//   - Não destrutiva: nenhum dado existente é apagado.
function migrateNotebook(notebook, allNotes) {
  // Já migrado? Mantém intacto (idempotência).
  if (notebook && typeof notebook.lifeArea === 'string' && 'projectId' in notebook) {
    return notebook;
  }

  // Inferir lifeArea pela maioria das notas dentro do caderno.
  // Se não houver maioria clara, default 'outros'.
  const inferLifeArea = () => {
    if (!Array.isArray(allNotes) || allNotes.length === 0) return 'outros';
    const counts = {};
    allNotes.forEach(n => {
      if (n && n.notebookId === notebook.id) {
        const area = (n.lifeArea && typeof n.lifeArea === 'string') ? n.lifeArea : 'outros';
        counts[area] = (counts[area] || 0) + 1;
      }
    });
    const entries = Object.entries(counts);
    if (entries.length === 0) return 'outros';
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  };

  return {
    ...notebook,
    lifeArea: notebook.lifeArea || inferLifeArea(),
    projectId: 'projectId' in notebook ? notebook.projectId : null,
  };
}

// Detecta se o estado precisa migrar pra v3.
// Critério: schemaVersion < 3, OU falta `projects`, OU algum caderno sem lifeArea.
function needsMigrationToV3(parsed) {
  if (!parsed) return false;
  if ((parsed.schemaVersion || 0) < 3) return true;
  if (!Array.isArray(parsed.projects)) return true;
  if (Array.isArray(parsed.notebooks)) {
    for (const nb of parsed.notebooks) {
      if (!nb || typeof nb.lifeArea !== 'string' || !('projectId' in nb)) return true;
    }
  }
  return false;
}

// Salva backup completo do estado pré-v3 (uma vez só).
// Se já existe backup, não sobrescreve — preserva a versão mais antiga.
function saveBackupPreV3IfNeeded(rawJson) {
  try {
    const existing = localStorage.getItem(BACKUP_PRE_V3_KEY);
    if (existing) return; // backup já feito numa migração anterior, não sobrescrever
    localStorage.setItem(BACKUP_PRE_V3_KEY, rawJson);
  } catch (_) { /* defensivo: storage cheio, etc. */ }
}

// Aplica a migração v2→v3 num objeto de estado já parseado.
// Retorna novo objeto (não muta entrada).
function applyMigrationV3(parsed) {
  const notebooks = Array.isArray(parsed.notebooks) ? parsed.notebooks : [];
  const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
  const migratedNotebooks = notebooks.map(nb => migrateNotebook(nb, notes));
  return {
    ...parsed,
    notebooks: migratedNotebooks,
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    schemaVersion: 3,
  };
}

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

    // Migração v1 → v2: notas (já existente)
    if (parsed.notes && Array.isArray(parsed.notes)) {
      parsed.notes = parsed.notes.map(migrateNote);
    }
    if (!parsed.categories) parsed.categories = [];
    parsed.settings = migrateSettings(parsed.settings);

    // Migração v2 → v3: Projetos + lifeArea/projectId em cadernos.
    // Spec: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md
    if (needsMigrationToV3(parsed)) {
      // Backup completo do estado anterior (uma vez só) antes de mexer.
      saveBackupPreV3IfNeeded(saved);
      return applyMigrationV3(parsed);
    }

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

// === EXPORTS PUROS (pra teste) ===
//
// Estas funções são puras e testáveis sem montar o hook React inteiro.
// Manter sincronizadas com a lógica usada em loadFromStorage().
export {
  migrateNotebook as _migrateNotebook,
  needsMigrationToV3 as _needsMigrationToV3,
  applyMigrationV3 as _applyMigrationV3,
  SCHEMA_VERSION as _SCHEMA_VERSION,
  BACKUP_PRE_V3_KEY as _BACKUP_PRE_V3_KEY,
};

export function useStore() {
  const [data, setData] = useState(defaultData);
  const [currentView, setCurrentView] = useState('home');
  const [currentNotebookId, setCurrentNotebookId] = useState(null);
  const [currentTagFilter, setCurrentTagFilter] = useState(null);
  const [currentCollectionId, setCurrentCollectionId] = useState(null);
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

  // === AGENTE INTELIGENTE LOCAL (PR I + PR J) ===
  // Escuta resultados completos do worker e persiste:
  //  - campos derivados (inferredLifeArea, confidenceScore, lastAgentRun)
  //  - vinculação automática de caderno se confidence >= 0.6 (apenas órfãs)
  //  - sinapses detectadas em suggestedConnections
  // O agente NUNCA muda lifeArea (manual). Só preenche os campos derivados.
  useEffect(() => {
    const off = onAnalyzedFull(({ noteId, result }) => {
      if (!noteId || !result) return;
      setData(prev => {
        const validNbIds = new Set(prev.notebooks.map(nb => nb.id));
        return {
          ...prev,
          notes: prev.notes.map(n => {
            if (n.id !== noteId) return n;

            const updated = {
              ...n,
              inferredLifeArea: result.inferredLifeArea,
              confidenceScore: result.confidenceScore,
              suggestedConnections: result.suggestedConnections || [],
              lastAgentRun: new Date().toISOString(),
            };

            // Vinculação automática: só se a nota é órfã (sem caderno válido)
            // e o agente sugeriu um caderno com confiança suficiente
            // (NotebookLinker já aplicou o threshold de 0.6 internamente).
            const isOrphan = !n.notebookId || !validNbIds.has(n.notebookId);
            if (isOrphan && result.suggestedNotebookId && validNbIds.has(result.suggestedNotebookId)) {
              updated.notebookId = result.suggestedNotebookId;
              updated.linkedByAgent = true;
              // Mantém updatedAt original (vinculação não conta como edição do usuário)
            }

            return updated;
          }),
        };
      });
    });
    return off;
  }, []);

  // Dispara análise completa quando notas mudam ou cadernos mudam.
  // Filtro: só notas vivas que ainda não foram analisadas OU foram editadas
  // depois da última análise.
  useEffect(() => {
    if (!isLoaded) return;
    const candidates = data.notes.filter(n => {
      if (n.isTrash || n.isArchived) return false;
      if (!n.lastAgentRun) return true;
      return new Date(n.updatedAt) > new Date(n.lastAgentRun);
    });
    candidates.forEach(n => analyzeAndLink(n, data.notebooks, data.notes));
  }, [data.notes, data.notebooks, isLoaded]);

  // Idle: a cada 3 minutos, reanalisa notas que nunca foram processadas.
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      const stale = data.notes.filter(n =>
        !n.isTrash && !n.isArchived && !n.lastAgentRun
      );
      if (stale.length > 0) {
        stale.slice(0, 10).forEach(n => analyzeAndLink(n, data.notebooks, data.notes));
      }
    }, 3 * 60 * 1000); // 3 minutos
    return () => clearInterval(interval);
  }, [data.notes, data.notebooks, isLoaded]);

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

  // === PRAZO ===
  const setDueDate = useCallback((noteId, dueDateIso) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n =>
        n.id === noteId ? { ...n, dueDate: dueDateIso || null } : n
      )
    }));
  }, []);

  // === NOTIFICAÇÕES (Pacote B) ===
  // Liga/desliga lembretes do navegador. A permissão real (Notification.requestPermission)
  // é cuidada no componente (precisa rodar dentro de um gesto do usuário); aqui só
  // persistimos a preferência.
  const setNotificationsEnabled = useCallback((enabled) => {
    setData(prev => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        notifications: {
          ...((prev.settings && prev.settings.notifications) || {}),
          enabled: !!enabled,
          lastNotifiedKeys: ((prev.settings && prev.settings.notifications && prev.settings.notifications.lastNotifiedKeys) || []),
        },
      },
    }));
  }, []);

  // Marca que já notificamos uma nota com um certo status num certo dia.
  // Evita disparar a mesma notificação várias vezes (a checagem roda a cada 5min).
  const recordNotificationKey = useCallback((key) => {
    if (!key) return;
    setData(prev => {
      const existing = (prev.settings && prev.settings.notifications && prev.settings.notifications.lastNotifiedKeys) || [];
      if (existing.includes(key)) return prev;
      // Mantém só os últimos 7 dias de chaves (limpa as antigas pra não inchar localStorage)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStamp = cutoff.toISOString().slice(0, 10).replace(/-/g, '');
      const cleaned = existing.filter(k => {
        const m = k.match(/-(\d{8})$/);
        return !m || m[1] >= cutoffStamp;
      });
      return {
        ...prev,
        settings: {
          ...(prev.settings || {}),
          notifications: {
            ...((prev.settings && prev.settings.notifications) || {}),
            enabled: !!(prev.settings && prev.settings.notifications && prev.settings.notifications.enabled),
            lastNotifiedKeys: [...cleaned, key],
          },
        },
      };
    });
  }, []);

  // Esquece todas as chaves (usado em "Tocar agora" pra forçar re-notificação imediata)
  const clearNotificationKeys = useCallback(() => {
    setData(prev => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        notifications: {
          ...((prev.settings && prev.settings.notifications) || {}),
          enabled: !!(prev.settings && prev.settings.notifications && prev.settings.notifications.enabled),
          lastNotifiedKeys: [],
        },
      },
    }));
  }, []);

  // === EXPORTAÇÃO ===
  const exportNoteAsText = useCallback((noteId) => {
    const note = data.notes.find(n => n.id === noteId);
    if (!note) return null;
    // Strip HTML
    const content = (note.content || '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '[x] ')
      .replace(/<li[^>]*data-checked="false"[^>]*>/gi, '[ ] ')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&[a-z]+;/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return `${note.title || 'Sem título'}\n${'='.repeat((note.title || 'Sem título').length)}\n\n${content}\n`;
  }, [data.notes]);

  const exportNoteAsMarkdown = useCallback((noteId) => {
    const note = data.notes.find(n => n.id === noteId);
    if (!note) return null;

    let md = (note.content || '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
      .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, '![imagem]($1)')
      .replace(/<li[^>]*data-checked="true"[^>]*><div><p>([\s\S]*?)<\/p><\/div><\/li>/gi, '- [x] $1\n')
      .replace(/<li[^>]*data-checked="false"[^>]*><div><p>([\s\S]*?)<\/p><\/div><\/li>/gi, '- [ ] $1\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
      .replace(/<\/?ul[^>]*>/gi, '\n')
      .replace(/<\/?ol[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&[a-z]+;/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const tags = (note.tags || []).map(t => `#${t}`).join(' ');
    const meta = [
      `# ${note.title || 'Sem título'}`,
      '',
      `**Tipo:** ${note.type || 'rascunho'}`,
      `**Status:** ${note.status || 'ativo'}`,
      `**Prioridade:** ${note.priority || 'normal'}`,
      tags ? `**Tags:** ${tags}` : '',
      note.dueDate ? `**Prazo:** ${new Date(note.dueDate).toLocaleDateString('pt-BR')}` : '',
      `**Criada em:** ${new Date(note.createdAt).toLocaleDateString('pt-BR')}`,
      `**Última edição:** ${new Date(note.updatedAt).toLocaleDateString('pt-BR')}`,
      '',
      '---',
      '',
    ].filter(Boolean).join('\n');

    return `${meta}\n${md}\n`;
  }, [data.notes]);

  // === CADERNOS ===
  const createNotebook = useCallback((name, color = '#5B2D8E', extra = {}) => {
    // v3: lifeArea e projectId fazem parte do caderno (ver spec).
    // Defaults sensatos: lifeArea='outros' (área genérica), projectId=null (avulso).
    const newNotebook = {
      id: uuidv4(),
      name,
      color,
      lifeArea: extra.lifeArea || 'outros',
      projectId: extra.projectId === undefined ? null : extra.projectId,
      createdAt: new Date().toISOString(),
    };
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

  // === EXCLUIR CADERNO COM SEGURANÇA (Pacote 5) ===
  // Ao excluir, as notas vão para 'arquivadas' (não para lixeira), o que protege contra perda acidental.
  // O caderno default ('default') não pode ser excluído.
  const deleteNotebookSafely = useCallback((notebookId) => {
    if (notebookId === 'default') return { ok: false, error: 'O caderno principal não pode ser excluído.' };
    let archivedCount = 0;
    setData(prev => ({
      ...prev,
      notebooks: prev.notebooks.filter(nb => nb.id !== notebookId),
      notes: prev.notes.map(n => {
        if (n.notebookId === notebookId && !n.isTrash) {
          archivedCount++;
          return { ...n, notebookId: 'default', isArchived: true };
        }
        return n;
      })
    }));
    return { ok: true, archivedCount };
  }, []);

  // === PROJETOS (PR C — spec docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md) ===
  //
  // Regras:
  //   - Projeto PRECISA de título e lifeArea (obrigatórios).
  //   - Projeto vazio (sem cadernos) pode existir no store, mas NÃO aparece no mapa.
  //   - Projeto pertence a UMA área da vida (sem multi-área nesta versão).
  //   - Excluir projeto NÃO exclui cadernos — os cadernos viram avulsos (projectId = null).

  const createProject = useCallback((title, lifeArea, extra = {}) => {
    if (!title || !title.trim()) return null;
    if (!lifeArea) return null;
    const newProject = {
      id: uuidv4(),
      title: title.trim(),
      lifeArea,
      description: extra.description || '',
      color: extra.color || null,  // null = herda da área
      coverEmoji: extra.coverEmoji || null,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, projects: [...(prev.projects || []), newProject] }));
    return newProject.id;
  }, []);

  const updateProject = useCallback((projectId, updates) => {
    if (!projectId) return;
    setData(prev => ({
      ...prev,
      projects: (prev.projects || []).map(p =>
        p.id === projectId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  }, []);

  const archiveProject = useCallback((projectId) => {
    updateProject(projectId, { archived: true });
  }, [updateProject]);

  const unarchiveProject = useCallback((projectId) => {
    updateProject(projectId, { archived: false });
  }, [updateProject]);

  const deleteProject = useCallback((projectId) => {
    if (!projectId) return;
    // Regra: cadernos do projeto viram avulsos (projectId = null). Nada é excluído.
    setData(prev => ({
      ...prev,
      projects: (prev.projects || []).filter(p => p.id !== projectId),
      notebooks: prev.notebooks.map(nb =>
        nb.projectId === projectId ? { ...nb, projectId: null } : nb
      ),
    }));
  }, []);

  const getProjectById = useCallback((id) =>
    (data.projects || []).find(p => p.id === id), [data.projects]);

  const getProjectNotebooks = useCallback((projectId) =>
    data.notebooks.filter(nb => nb.projectId === projectId), [data.notebooks]);

  const getProjectNoteCount = useCallback((projectId) => {
    const nbIds = new Set(data.notebooks.filter(nb => nb.projectId === projectId).map(nb => nb.id));
    return data.notes.filter(n => nbIds.has(n.notebookId) && !n.isTrash).length;
  }, [data.notebooks, data.notes]);

  const assignNotebookToProject = useCallback((notebookId, projectId) => {
    setData(prev => ({
      ...prev,
      notebooks: prev.notebooks.map(nb =>
        nb.id === notebookId ? { ...nb, projectId: projectId || null } : nb
      ),
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
    currentCollectionId,
    selectedNoteId,
    searchQuery,

    setCurrentView,
    setCurrentNotebookId,
    setCurrentTagFilter,
    setCurrentCollectionId,
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
    setDueDate,
    setNotificationsEnabled,
    recordNotificationKey,
    clearNotificationKeys,
    settings: data.settings || { notifications: { enabled: false, lastNotifiedKeys: [] } },
    exportNoteAsText,
    exportNoteAsMarkdown,
    getNoteById,

    createNotebook,
    renameNotebook,
    deleteNotebook,
    deleteNotebookSafely,
    getNotebookById,
    getNoteCount,

    // Projetos (PR C)
    projects: data.projects || [],
    createProject,
    updateProject,
    archiveProject,
    unarchiveProject,
    deleteProject,
    getProjectById,
    getProjectNotebooks,
    getProjectNoteCount,
    assignNotebookToProject,

    addCategory,
    addTag,
    removeTag,
    addTagToNote,
    removeTagFromNote,
  };
}
