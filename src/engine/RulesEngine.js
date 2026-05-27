/**
 * ANOTATA — Motor de Regras Local
 *
 * Sistema de "inteligência" da anotação SEM IA.
 * Tudo aqui são regras determinísticas, palavras-chave e heurísticas.
 *
 * O que ele faz:
 * - Detecta tipo da nota (tarefa, decisão, ideia, etc.)
 * - Detecta prioridade (urgente, alta, normal, baixa)
 * - Sugere próxima ação
 * - Detecta links, datas, tarefas no texto
 * - Sugere conexões entre notas
 * - Encontra possíveis duplicatas
 * - Diagnostica saúde da anotação
 */

// === TIPOS DE NOTA ===
export const NOTE_TYPES = {
  rascunho: { label: 'Rascunho', icon: '✏️', color: '#9888B5' },
  ideia: { label: 'Ideia', icon: '💡', color: '#7C4DC9' },
  tarefa: { label: 'Tarefa', icon: '✓', color: '#E8637C' },
  decisao: { label: 'Decisão', icon: '⚖️', color: '#5B2D8E' },
  referencia: { label: 'Referência', icon: '📚', color: '#3D1B66' },
  problema: { label: 'Problema', icon: '⚠️', color: '#C44862' },
  insight: { label: 'Insight', icon: '✨', color: '#F08AA0' },
  prompt: { label: 'Prompt', icon: '🎯', color: '#7C4DC9' },
  reuniao: { label: 'Reunião', icon: '👥', color: '#5B2D8E' },
  checklist: { label: 'Checklist', icon: '☑️', color: '#E8637C' },
  link: { label: 'Link', icon: '🔗', color: '#7C4DC9' },
  arquivo: { label: 'Arquivo', icon: '📎', color: '#9888B5' },
  registro: { label: 'Registro', icon: '📝', color: '#5B4A7A' },
};

export const NOTE_STATUS = {
  rascunho: { label: 'Rascunho', color: '#9888B5' },
  ativo: { label: 'Ativo', color: '#5B2D8E' },
  emAndamento: { label: 'Em andamento', color: '#7C4DC9' },
  aguardando: { label: 'Aguardando', color: '#F08AA0' },
  revisar: { label: 'Revisar', color: '#E8637C' },
  concluido: { label: 'Concluído', color: '#10B981' },
  arquivado: { label: 'Arquivado', color: '#9888B5' },
};

export const NOTE_PRIORITY = {
  baixa: { label: 'Baixa', color: '#9888B5', order: 1 },
  normal: { label: 'Normal', color: '#5B4A7A', order: 2 },
  alta: { label: 'Alta', color: '#E8637C', order: 3 },
  urgente: { label: 'Urgente', color: '#C44862', order: 4 },
};

// === PALAVRAS-CHAVE PARA DETECÇÃO ===
const TYPE_KEYWORDS = {
  tarefa: ['preciso fazer', 'preciso', 'fazer', 'resolver', 'corrigir', 'completar', 'realizar', 'todo:', 'pendente'],
  decisao: ['decidido', 'aprovado', 'definido', 'optei', 'escolhi', 'decisão final', 'fechado'],
  ideia: ['ideia:', 'que tal', 'imagina se', 'poderia', 'talvez', 'sugestão:', 'rascunho de'],
  problema: ['erro', 'bug', 'não funciona', 'falha', 'problema', 'quebrou', 'crash'],
  insight: ['descobri que', 'aprendi que', 'percebi que', 'sacada', 'insight', 'observação importante'],
  reuniao: ['reunião', 'meeting', 'pauta', 'ata da', 'encontro com', 'call com'],
  referencia: ['referência', 'fonte:', 'consultar', 'guia de', 'documentação'],
  prompt: ['prompt:', 'instrução para ia', 'comando para'],
  checklist: ['- [ ]', '- [x]', 'checklist', 'lista de tarefas', 'pontos a verificar'],
};

const PRIORITY_KEYWORDS = {
  urgente: ['urgente', 'urgentíssimo', 'agora', 'imediato', 'asap', 'hoje sem falta', 'crítico'],
  alta: ['amanhã', 'prazo', 'rápido', 'logo', 'importante', 'prioridade', 'esta semana'],
  baixa: ['quando puder', 'sem pressa', 'algum dia', 'futuramente', 'eventualmente'],
};

// === REGEX UTILS ===
const URL_REGEX = /https?:\/\/[^\s<>"]+/gi;
const FORMAL_DATE_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;
const DATE_KEYWORDS = ['hoje', 'amanhã', 'depois de amanhã', 'segunda-feira', 'segunda', 'terça-feira', 'terça', 'quarta-feira', 'quarta', 'quinta-feira', 'quinta', 'sexta-feira', 'sexta', 'sábado', 'domingo', 'na próxima semana', 'no próximo mês'];

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(text, keyword) {
  const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  return (text.match(regex) || []).length;
}

class RulesEngine {
  /**
   * Detecta o tipo mais provável da anotação.
   */
  detectType(text, title = '') {
    const fullText = (title + ' ' + stripHtml(text)).toLowerCase();
    if (fullText.length < 5) return 'rascunho';

    const scores = {};
    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
      scores[type] = keywords.reduce((sum, kw) => sum + countOccurrences(fullText, kw) * (kw.length > 8 ? 2 : 1), 0);
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === 0) return 'rascunho';
    return sorted[0][0];
  }

  /**
   * Detecta a prioridade pela presença de palavras-chave.
   */
  detectPriority(text, title = '') {
    const fullText = (title + ' ' + stripHtml(text)).toLowerCase();

    for (const kw of PRIORITY_KEYWORDS.urgente) {
      if (fullText.includes(kw)) return 'urgente';
    }
    for (const kw of PRIORITY_KEYWORDS.alta) {
      if (fullText.includes(kw)) return 'alta';
    }
    for (const kw of PRIORITY_KEYWORDS.baixa) {
      if (fullText.includes(kw)) return 'baixa';
    }
    return 'normal';
  }

  /**
   * Detecta links no texto.
   */
  detectLinks(text) {
    const clean = stripHtml(text);
    const matches = clean.match(URL_REGEX) || [];
    return [...new Set(matches)];
  }

  /**
   * Detecta menções a datas (palavras-chave + formatos).
   */
  detectDates(text) {
    const clean = stripHtml(text).toLowerCase();
    const dates = [];

    DATE_KEYWORDS.forEach(kw => {
      if (clean.includes(kw)) dates.push(kw);
    });

    const formal = clean.match(FORMAL_DATE_REGEX) || [];
    dates.push(...formal);

    return [...new Set(dates)];
  }

  /**
   * Extrai linhas que parecem tarefas.
   */
  extractTasks(text) {
    const clean = stripHtml(text);
    const lines = clean.split(/[\n\r]+/);
    const tasks = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Markdown checkboxes
      const mdMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (mdMatch) {
        tasks.push({
          line: idx,
          text: mdMatch[2].trim(),
          done: mdMatch[1].toLowerCase() === 'x',
          source: 'checklist',
        });
        return;
      }

      // Padrão "TODO:", "Fazer:", "Pendente:"
      const todoMatch = trimmed.match(/^(todo|fazer|pendente|tarefa)[:\s]+(.+)/i);
      if (todoMatch) {
        tasks.push({
          line: idx,
          text: todoMatch[2].trim(),
          done: false,
          source: 'palavra-chave',
        });
      }
    });

    return tasks;
  }

  /**
   * Sugere próxima ação para uma nota baseado em regras.
   */
  suggestNextAction(note) {
    if (!note) return null;
    const cleanContent = stripHtml(note.content || '');
    const titleClean = (note.title || '').trim();

    // Sem título
    if (!titleClean || titleClean.length < 3) {
      return {
        action: 'renomear',
        label: 'Dê um título melhor para esta nota',
        reason: 'A nota está sem título claro',
        icon: 'edit-3',
      };
    }

    // Conteúdo longo sem tags
    if (cleanContent.length > 200 && (!note.tags || note.tags.length === 0)) {
      return {
        action: 'tags',
        label: 'Adicione tags para encontrar depois',
        reason: 'Nota com conteúdo grande mas sem tags',
        icon: 'tag',
      };
    }

    // Status concluído mas não arquivado
    if (note.status === 'concluido' && !note.isArchived) {
      return {
        action: 'arquivar',
        label: 'Arquive esta anotação',
        reason: 'Já está marcada como concluída',
        icon: 'archive',
      };
    }

    // Status revisar
    if (note.status === 'revisar') {
      return {
        action: 'revisar',
        label: 'Revisar esta nota',
        reason: 'Marcada como pendente de revisão',
        icon: 'eye',
      };
    }

    // Tarefa sem prazo
    if (note.type === 'tarefa' && !note.dueDate) {
      const dates = this.detectDates(cleanContent);
      if (dates.length === 0) {
        return {
          action: 'prazo',
          label: 'Defina um prazo para esta tarefa',
          reason: 'É uma tarefa, mas não tem data',
          icon: 'calendar',
        };
      }
    }

    // Importante sem conexão
    if ((note.priority === 'alta' || note.priority === 'urgente')
        && (!note.manualConnections || note.manualConnections.length === 0)) {
      return {
        action: 'conectar',
        label: 'Conecte com outra nota relacionada',
        reason: 'Importante mas isolada',
        icon: 'link-2',
      };
    }

    // Tipo rascunho mas com bastante conteúdo
    if (note.type === 'rascunho' && cleanContent.length > 100) {
      return {
        action: 'definir-tipo',
        label: 'Definir o tipo desta anotação',
        reason: 'Já tem conteúdo, mas está como rascunho',
        icon: 'flag',
      };
    }

    return null;
  }

  /**
   * Diagnóstico geral da nota.
   */
  diagnose(note) {
    if (!note) return [];
    const issues = [];
    const cleanContent = stripHtml(note.content || '');
    const wordCount = cleanContent.split(/\s+/).filter(w => w).length;
    const titleClean = (note.title || '').trim();

    // Avisos (warn)
    if (!titleClean || titleClean.length < 3) {
      issues.push({ level: 'warn', message: 'Sem título claro', icon: 'alert-circle' });
    }
    if (!note.tags || note.tags.length === 0) {
      issues.push({ level: 'info', message: 'Sem tags', icon: 'tag' });
    }
    if (!note.category && !note.notebookId) {
      issues.push({ level: 'info', message: 'Sem categoria definida', icon: 'folder' });
    }
    if (wordCount < 5 && cleanContent.length > 0) {
      issues.push({ level: 'info', message: 'Conteúdo muito curto', icon: 'minimize-2' });
    }
    if (wordCount > 1500) {
      issues.push({ level: 'info', message: 'Nota muito longa — considere dividir', icon: 'maximize-2' });
    }

    // Recursos detectados (good)
    const links = this.detectLinks(note.content);
    if (links.length > 0) {
      issues.push({ level: 'good', message: `${links.length} link${links.length > 1 ? 's' : ''} detectado${links.length > 1 ? 's' : ''}`, icon: 'link' });
    }
    const dates = this.detectDates(note.content);
    if (dates.length > 0) {
      issues.push({ level: 'good', message: `${dates.length} data${dates.length > 1 ? 's' : ''} detectada${dates.length > 1 ? 's' : ''}`, icon: 'calendar' });
    }
    const tasks = this.extractTasks(note.content);
    const openTasks = tasks.filter(t => !t.done).length;
    if (openTasks > 0) {
      issues.push({ level: 'warn', message: `${openTasks} tarefa${openTasks > 1 ? 's' : ''} pendente${openTasks > 1 ? 's' : ''}`, icon: 'check-square' });
    } else if (tasks.length > 0) {
      issues.push({ level: 'good', message: 'Todas as tarefas concluídas', icon: 'check-circle' });
    }

    // Antiga sem revisão
    if (note.priority === 'alta' || note.priority === 'urgente') {
      const lastEdit = new Date(note.updatedAt);
      const daysSince = (Date.now() - lastEdit.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) {
        issues.push({ level: 'warn', message: `Importante mas sem revisão há ${Math.floor(daysSince)} dias`, icon: 'clock' });
      }
    }

    return issues;
  }

  /**
   * Encontra possíveis duplicatas pelo título.
   */
  findDuplicates(note, allNotes) {
    if (!note?.title || note.title.trim().length < 3) return [];
    const lowerTitle = note.title.toLowerCase().trim();
    return allNotes.filter(n =>
      n.id !== note.id &&
      !n.isTrash &&
      n.title &&
      n.title.toLowerCase().trim() === lowerTitle
    );
  }

  /**
   * Sugere conexões entre uma nota e outras.
   * Retorna ordenado por força da relação.
   * Ignora notas que já estão conectadas manualmente OU que o usuário ignorou.
   */
  suggestConnections(note, allNotes, max = 5) {
    if (!note) return [];
    const ignoredIds = note.ignoredSuggestions || [];
    const connectedIds = (note.manualConnections || []).map(c =>
      typeof c === 'string' ? c : c.noteId
    );
    const others = allNotes.filter(n =>
      n.id !== note.id &&
      !n.isTrash &&
      !connectedIds.includes(n.id) &&
      !ignoredIds.includes(n.id)
    );
    const noteTags = note.tags || [];
    const titleWords = (note.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const contentWords = stripHtml(note.content || '').toLowerCase().split(/\s+/).filter(w => w.length > 5);
    const noteLinks = this.detectLinks(note.content);
    const suggestions = [];

    others.forEach(other => {
      const reasons = [];
      let strength = 0;

      // Mesmo caderno (projeto)
      if (other.notebookId === note.notebookId) {
        reasons.push('mesmo caderno');
        strength += 1;
      }

      // Mesma categoria
      if (note.category && other.category === note.category) {
        reasons.push(`mesma categoria: ${note.category}`);
        strength += 2;
      }

      // Tags em comum
      const sharedTags = (other.tags || []).filter(t => noteTags.includes(t));
      if (sharedTags.length > 0) {
        reasons.push(`tags: ${sharedTags.map(t => '#' + t).join(', ')}`);
        strength += sharedTags.length * 3;
      }

      // Mesmo tipo
      if (note.type && other.type === note.type && note.type !== 'rascunho') {
        reasons.push(`mesmo tipo (${note.type})`);
        strength += 1;
      }

      // Palavras parecidas no título
      const otherTitleWords = (other.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const sharedTitleWords = titleWords.filter(w => otherTitleWords.includes(w));
      if (sharedTitleWords.length > 0) {
        reasons.push(`palavras no título: "${sharedTitleWords.join(', ')}"`);
        strength += sharedTitleWords.length * 4;
      }

      // Links iguais
      const otherLinks = this.detectLinks(other.content);
      const sharedLinks = noteLinks.filter(l => otherLinks.includes(l));
      if (sharedLinks.length > 0) {
        reasons.push(`mesmo link compartilhado`);
        strength += sharedLinks.length * 3;
      }

      // Palavras significativas no conteúdo (top 5)
      if (contentWords.length > 0) {
        const otherContent = stripHtml(other.content || '').toLowerCase();
        const sharedContentWords = [...new Set(contentWords)].filter(w => otherContent.includes(w)).slice(0, 5);
        if (sharedContentWords.length >= 3) {
          reasons.push(`vocabulário parecido`);
          strength += 2;
        }
      }

      if (strength > 0) {
        suggestions.push({
          noteId: other.id,
          title: other.title || 'Sem título',
          notebookId: other.notebookId,
          type: other.type,
          reasons,
          strength: strength >= 8 ? 'forte' : strength >= 4 ? 'média' : 'fraca',
          score: strength,
        });
      }
    });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, max);
  }

  /**
   * Análise completa de uma nota — retorna tudo em um único pacote.
   */
  analyze(note, allNotes = []) {
    return {
      suggestedType: this.detectType(note.content || '', note.title || ''),
      suggestedPriority: this.detectPriority(note.content || '', note.title || ''),
      links: this.detectLinks(note.content || ''),
      dates: this.detectDates(note.content || ''),
      tasks: this.extractTasks(note.content || ''),
      nextAction: this.suggestNextAction(note),
      diagnostics: this.diagnose(note),
      duplicates: this.findDuplicates(note, allNotes),
      connections: this.suggestConnections(note, allNotes),
    };
  }
}

const rulesEngine = new RulesEngine();
export default rulesEngine;
