import rulesEngine from './RulesEngine';

/**
 * ANOTATA — Motor de Coleções Automáticas
 *
 * Coleções são grupos de notas formados por regras locais.
 * Cada nota numa coleção tem um "motivo" explicado.
 *
 * Sem IA. Tudo determinístico.
 */

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// === DEFINIÇÃO DE COLEÇÕES ===
// Cada coleção é uma função que recebe (note, allNotes) e retorna { match: bool, reason: string }

export const COLLECTIONS = {
  recentes: {
    id: 'recentes',
    name: 'Recentes',
    icon: '🕐',
    description: 'Notas editadas nos últimos 7 dias',
    color: '#7C4DC9',
    test: (n) =>
      !n.isTrash && !n.isArchived && daysSince(n.updatedAt) <= 7
        ? { match: true, reason: `editada há ${Math.floor(daysSince(n.updatedAt))}d` }
        : { match: false },
  },

  fixadas: {
    id: 'fixadas',
    name: 'Fixadas',
    icon: '📌',
    description: 'Suas notas fixadas no topo',
    color: '#5B2D8E',
    test: (n) =>
      !n.isTrash && n.isPinned
        ? { match: true, reason: 'fixada por você' }
        : { match: false },
  },

  importantes: {
    id: 'importantes',
    name: 'Notas importantes',
    icon: '⚡',
    description: 'Prioridade alta ou urgente',
    color: '#E8637C',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (n.priority === 'urgente') return { match: true, reason: 'prioridade urgente' };
      if (n.priority === 'alta') return { match: true, reason: 'prioridade alta' };
      return { match: false };
    },
  },

  precisaRevisao: {
    id: 'precisaRevisao',
    name: 'Precisa de revisão',
    icon: '👁️',
    description: 'Notas marcadas para revisar ou importantes sem revisão recente',
    color: '#E8637C',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (n.status === 'revisar') return { match: true, reason: 'status: revisar' };
      const isImportant = n.priority === 'alta' || n.priority === 'urgente';
      const lastReview = n.reviewedAt || n.createdAt;
      if (isImportant && daysSince(lastReview) > 30) {
        return { match: true, reason: `importante, sem revisão há ${Math.floor(daysSince(lastReview))}d` };
      }
      return { match: false };
    },
  },

  semProximaAcao: {
    id: 'semProximaAcao',
    name: 'Sem próxima ação',
    icon: '🎯',
    description: 'Notas que podem ser definidas com um próximo passo',
    color: '#7C4DC9',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (n.status === 'concluido') return { match: false };
      if (n.customNextAction) return { match: false };
      const cleanContent = stripHtml(n.content);
      if (cleanContent.length < 10) return { match: false };
      return { match: true, reason: 'sem próxima ação definida' };
    },
  },

  tarefasAbertas: {
    id: 'tarefasAbertas',
    name: 'Tarefas abertas',
    icon: '☑️',
    description: 'Notas com tarefas pendentes detectadas',
    color: '#E8637C',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      const tasks = rulesEngine.extractTasks(n.content);
      const open = tasks.filter(t => !t.done).length;
      if (open > 0) return { match: true, reason: `${open} tarefa${open > 1 ? 's' : ''} pendente${open > 1 ? 's' : ''}` };
      return { match: false };
    },
  },

  decisoesRecentes: {
    id: 'decisoesRecentes',
    name: 'Decisões recentes',
    icon: '⚖️',
    description: 'Decisões tomadas nos últimos 30 dias',
    color: '#5B2D8E',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (n.type === 'decisao' && daysSince(n.updatedAt) <= 30) {
        return { match: true, reason: 'decisão recente' };
      }
      return { match: false };
    },
  },

  ideiasSoltas: {
    id: 'ideiasSoltas',
    name: 'Ideias soltas',
    icon: '💡',
    description: 'Ideias sem conexão com outras notas',
    color: '#7C4DC9',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (n.type !== 'ideia') return { match: false };
      const conns = (n.manualConnections || []).length;
      if (conns === 0) return { match: true, reason: 'ideia sem conexão ainda' };
      return { match: false };
    },
  },

  comLinks: {
    id: 'comLinks',
    name: 'Com links',
    icon: '🔗',
    description: 'Notas com links salvos',
    color: '#5B2D8E',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      const links = rulesEngine.detectLinks(n.content);
      if (links.length > 0) return { match: true, reason: `${links.length} link${links.length > 1 ? 's' : ''}` };
      return { match: false };
    },
  },

  comDatas: {
    id: 'comDatas',
    name: 'Com datas',
    icon: '📅',
    description: 'Notas com datas detectadas',
    color: '#7C4DC9',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      const dates = rulesEngine.detectDates(n.content);
      if (dates.length > 0) return { match: true, reason: `${dates.length} data${dates.length > 1 ? 's' : ''}` };
      return { match: false };
    },
  },

  incompletas: {
    id: 'incompletas',
    name: 'Notas incompletas',
    icon: '⚠️',
    description: 'Notas que parecem precisar de mais atenção',
    color: '#E8637C',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (n.status === 'concluido') return { match: false };
      const cleanContent = stripHtml(n.content);
      const wordCount = cleanContent.split(/\s+/).filter(w => w).length;

      const reasons = [];
      if (!n.title || n.title.trim().length < 3) reasons.push('sem título claro');
      if (wordCount < 10 && cleanContent.length > 0) reasons.push('conteúdo curto');
      if (!n.tags || n.tags.length === 0) reasons.push('sem tags');

      if (reasons.length >= 2) {
        return { match: true, reason: reasons.join(', ') };
      }
      return { match: false };
    },
  },

  duplicadas: {
    id: 'duplicadas',
    name: 'Possíveis duplicadas',
    icon: '🔁',
    description: 'Notas com títulos iguais ou muito parecidos',
    color: '#C44862',
    test: (n, allNotes) => {
      if (n.isTrash || !n.title || n.title.trim().length < 3) return { match: false };
      const lower = n.title.toLowerCase().trim();
      const dups = allNotes.filter(o =>
        o.id !== n.id &&
        !o.isTrash &&
        o.title &&
        o.title.toLowerCase().trim() === lower
      );
      if (dups.length > 0) {
        return { match: true, reason: `mesmo título de outras ${dups.length} nota${dups.length > 1 ? 's' : ''}` };
      }
      return { match: false };
    },
  },

  semCategoria: {
    id: 'semCategoria',
    name: 'Sem categoria',
    icon: '📂',
    description: 'Notas sem categoria definida',
    color: '#9888B5',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (!n.category) return { match: true, reason: 'sem categoria' };
      return { match: false };
    },
  },

  semTags: {
    id: 'semTags',
    name: 'Sem tags',
    icon: '🏷️',
    description: 'Notas sem nenhuma tag',
    color: '#9888B5',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      if (!n.tags || n.tags.length === 0) return { match: true, reason: 'sem tags' };
      return { match: false };
    },
  },

  semConexao: {
    id: 'semConexao',
    name: 'Sem conexão',
    icon: '🔗',
    description: 'Notas isoladas, sem conexões manuais',
    color: '#9888B5',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      const conns = (n.manualConnections || []).length;
      if (conns === 0) return { match: true, reason: 'isolada' };
      return { match: false };
    },
  },

  importantesSemConexao: {
    id: 'importantesSemConexao',
    name: 'Importantes sem conexão',
    icon: '⚠️',
    description: 'Notas de prioridade alta que estão isoladas',
    color: '#E8637C',
    test: (n) => {
      if (n.isTrash || n.isArchived) return { match: false };
      const isImportant = n.priority === 'alta' || n.priority === 'urgente';
      const conns = (n.manualConnections || []).length;
      if (isImportant && conns === 0) {
        return { match: true, reason: `prioridade ${n.priority}, isolada` };
      }
      return { match: false };
    },
  },

  arquivadas: {
    id: 'arquivadas',
    name: 'Arquivadas',
    icon: '📦',
    description: 'Notas arquivadas',
    color: '#9888B5',
    test: (n) => {
      if (n.isTrash) return { match: false };
      if (n.isArchived) return { match: true, reason: 'arquivada' };
      return { match: false };
    },
  },

  concluidas: {
    id: 'concluidas',
    name: 'Concluídas',
    icon: '✅',
    description: 'Notas marcadas como concluídas',
    color: '#10B981',
    test: (n) => {
      if (n.isTrash) return { match: false };
      if (n.status === 'concluido') return { match: true, reason: 'concluída' };
      return { match: false };
    },
  },
};

export const COLLECTION_LIST = Object.values(COLLECTIONS);

/**
 * Roda todas as coleções e retorna { collectionId: notesArray }
 * Cada nota vem com `_collectionReason` anexado.
 */
export function runAllCollections(notes) {
  const result = {};
  for (const collection of COLLECTION_LIST) {
    result[collection.id] = notes
      .map(n => {
        const r = collection.test(n, notes);
        if (!r.match) return null;
        return { ...n, _collectionReason: r.reason };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return result;
}

/**
 * Roda uma coleção específica.
 */
export function runCollection(collectionId, notes) {
  const collection = COLLECTIONS[collectionId];
  if (!collection) return [];
  return notes
    .map(n => {
      const r = collection.test(n, notes);
      if (!r.match) return null;
      return { ...n, _collectionReason: r.reason };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Conta quantas notas estão em cada coleção (sem montar a lista inteira)
 */
export function countCollections(notes) {
  const counts = {};
  for (const collection of COLLECTION_LIST) {
    counts[collection.id] = 0;
    for (const n of notes) {
      if (collection.test(n, notes).match) counts[collection.id]++;
    }
  }
  return counts;
}
