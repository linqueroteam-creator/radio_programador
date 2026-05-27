import Fuse from 'fuse.js';

/**
 * ANOTATA — Motor de Busca Aproximada (Fuzzy Search)
 *
 * Encontra notas mesmo quando você digita errado.
 * Ex: "desing" encontra "design", "prjoeto" encontra "projeto".
 *
 * Usa Fuse.js — biblioteca leve de busca local. Sem IA.
 */

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

const FUSE_OPTIONS = {
  // Pesos: o que importa mais aparece primeiro
  keys: [
    { name: 'title', weight: 4 },
    { name: 'searchableTags', weight: 3 },
    { name: 'plainContent', weight: 2 },
    { name: 'category', weight: 2 },
    { name: 'type', weight: 1.5 },
    { name: 'customNextAction', weight: 1.5 },
    { name: 'extractedLinks', weight: 1 },
    { name: 'priority', weight: 0.5 },
    { name: 'status', weight: 0.5 },
  ],
  // 0 = exato, 1 = qualquer coisa. 0.4 é equilibrado pra português.
  threshold: 0.4,
  // Não exige caracteres consecutivos
  distance: 200,
  // Mínimo 2 caracteres na consulta
  minMatchCharLength: 2,
  // Inclui pontuação e índices dos matches (pra destacar visualmente)
  includeScore: true,
  includeMatches: true,
  // Acentos ignorados
  ignoreLocation: true,
};

class SearchEngine {
  constructor() {
    this.fuse = null;
    this.lastIndexedNotes = null;
  }

  /**
   * Prepara as notas pra serem buscáveis (extrai texto puro, junta tags etc)
   */
  _prepare(notes) {
    return notes.map(n => ({
      id: n.id,
      title: n.title || '',
      plainContent: stripHtml(n.content || ''),
      searchableTags: (n.tags || []).join(' '),
      category: n.category || '',
      type: n.type || '',
      status: n.status || '',
      priority: n.priority || '',
      customNextAction: n.customNextAction || '',
      extractedLinks: this._extractLinks(n.content || ''),
      _original: n,
    }));
  }

  _extractLinks(text) {
    const matches = stripHtml(text).match(/https?:\/\/[^\s<>"]+/gi) || [];
    return matches.join(' ');
  }

  /**
   * (Re)indexa as notas. Chamada automaticamente quando muda.
   */
  index(notes) {
    if (notes === this.lastIndexedNotes) return;
    this.lastIndexedNotes = notes;
    const prepared = this._prepare(notes);
    this.fuse = new Fuse(prepared, FUSE_OPTIONS);
  }

  /**
   * Busca aproximada — retorna lista de notas com score e matches.
   */
  search(notes, query, options = {}) {
    const { limit = 50, includeArchived = false, includeTrash = false } = options;

    if (!query || query.trim().length < 2) {
      return [];
    }

    this.index(notes);
    if (!this.fuse) return [];

    const results = this.fuse.search(query.trim(), { limit });

    return results
      .map(r => ({
        note: r.item._original,
        score: 1 - r.score, // inverte (1 = match perfeito)
        matches: this._formatMatches(r.matches),
      }))
      .filter(r => {
        if (!includeArchived && r.note.isArchived) return false;
        if (!includeTrash && r.note.isTrash) return false;
        return true;
      });
  }

  /**
   * Formata os matches em algo fácil de usar na UI
   */
  _formatMatches(matches) {
    if (!matches) return [];
    return matches.map(m => ({
      field: m.key,
      value: m.value,
      indices: m.indices,
    }));
  }

  /**
   * Busca rápida por título e tag (mais rápida — sem fuzzy)
   * Usada para autocomplete em modais de conexão etc
   */
  quickSearch(notes, query, limit = 10) {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();

    return notes
      .filter(n =>
        !n.isTrash &&
        (
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.tags || []).some(t => t.toLowerCase().includes(q))
        )
      )
      .slice(0, limit);
  }
}

const searchEngine = new SearchEngine();
export default searchEngine;
