/**
 * ANOTATA — Motor de Correção Ortográfica e Gramatical PT-BR
 *
 * Como funciona:
 * - Conecta na API pública do LanguageTool (api.languagetool.org/v2/check)
 *   que é gratuita e oficialmente aberta para integração.
 * - Tem cache local para não repetir checagem do mesmo texto.
 * - Sistema de "debounce" para não chamar a API toda hora.
 * - Tem regras locais básicas como fallback (caso a API falhe).
 *
 * Categorias detectadas:
 * - 'spell'   → erro de ortografia (palavra escrita errada)
 * - 'grammar' → erro de gramática (concordância, conjugação)
 * - 'style'   → sugestão de estilo (palavra repetida, frase longa)
 * - 'punct'   → pontuação
 */

const API_URL = 'https://api.languagetool.org/v2/check';
const CACHE_KEY = 'anotata-grammar-cache';
const MAX_CACHE_ITEMS = 100;

class GrammarEngine {
  constructor() {
    this.cache = this._loadCache();
    this.pendingCheck = null;
    this.isChecking = false;
    this.lastCheckedText = '';
    this.lastResult = null;
    // Estatísticas
    this.stats = {
      totalChecks: 0,
      totalErrors: 0,
      sessionErrors: 0,
    };
  }

  /**
   * Verifica um texto e retorna lista de problemas encontrados.
   * Faz cache para textos idênticos.
   */
  async check(text, options = {}) {
    const cleanText = this._cleanText(text);

    if (!cleanText || cleanText.length < 3) {
      return { issues: [], stats: this._getTextStats(cleanText) };
    }

    // Verificar cache
    const cacheKey = this._hashText(cleanText);
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    this.isChecking = true;

    try {
      const issues = await this._callLanguageTool(cleanText);
      const result = {
        issues: issues,
        stats: this._getTextStats(cleanText),
        timestamp: Date.now(),
      };

      // Salvar no cache
      this._addToCache(cacheKey, result);

      // Atualizar estatísticas
      this.stats.totalChecks++;
      this.stats.totalErrors += issues.length;
      this.stats.sessionErrors += issues.length;

      this.isChecking = false;
      return result;
    } catch (error) {
      this.isChecking = false;
      console.warn('Corretor offline, usando regras locais:', error.message);
      // Fallback: regras locais
      const localIssues = this._localCheck(cleanText);
      return {
        issues: localIssues,
        stats: this._getTextStats(cleanText),
        offline: true,
      };
    }
  }

  /**
   * Verificação com debounce - aguarda usuário parar de digitar
   */
  checkWithDebounce(text, callback, delay = 1500) {
    if (this.pendingCheck) {
      clearTimeout(this.pendingCheck);
    }
    this.pendingCheck = setTimeout(async () => {
      const result = await this.check(text);
      callback(result);
    }, delay);
  }

  /**
   * Cancela checagem pendente
   */
  cancelPending() {
    if (this.pendingCheck) {
      clearTimeout(this.pendingCheck);
      this.pendingCheck = null;
    }
  }

  // === API LANGUAGETOOL ===

  async _callLanguageTool(text) {
    const params = new URLSearchParams({
      text: text,
      language: 'pt-BR',
      enabledOnly: 'false',
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`API retornou ${response.status}`);
    }

    const data = await response.json();
    return this._normalizeIssues(data.matches || [], text);
  }

  /**
   * Normaliza o formato de retorno para nosso formato interno
   */
  _normalizeIssues(matches, originalText) {
    return matches.map((match, idx) => {
      const category = this._classifyCategory(match);
      return {
        id: `issue-${idx}-${match.offset}`,
        offset: match.offset,
        length: match.length,
        text: originalText.substr(match.offset, match.length),
        message: match.message || 'Possível erro detectado',
        shortMessage: match.shortMessage || '',
        category: category,
        ruleId: match.rule?.id || 'unknown',
        ruleDescription: match.rule?.description || '',
        suggestions: (match.replacements || [])
          .slice(0, 5)
          .map(r => r.value),
        context: match.context?.text || '',
        contextOffset: match.context?.offset || 0,
        contextLength: match.context?.length || 0,
      };
    });
  }

  /**
   * Classifica o tipo de erro em categorias amigáveis
   */
  _classifyCategory(match) {
    const ruleId = (match.rule?.id || '').toUpperCase();
    const issueType = (match.rule?.issueType || '').toLowerCase();
    const categoryId = (match.rule?.category?.id || '').toUpperCase();

    if (issueType === 'misspelling' || categoryId.includes('TYPOS') || ruleId.includes('MORFOLOGIK')) {
      return 'spell';
    }
    if (categoryId.includes('PUNCTUATION') || ruleId.includes('PUNCT')) {
      return 'punct';
    }
    if (categoryId.includes('STYLE') || categoryId.includes('REDUNDANCY') || issueType === 'style') {
      return 'style';
    }
    return 'grammar';
  }

  // === REGRAS LOCAIS (FALLBACK) ===

  _localCheck(text) {
    const issues = [];
    let issueIdx = 0;

    // Regra 1: espaço duplo
    const doubleSpace = /  +/g;
    let match;
    while ((match = doubleSpace.exec(text)) !== null) {
      issues.push({
        id: `local-${issueIdx++}-${match.index}`,
        offset: match.index,
        length: match[0].length,
        text: match[0],
        message: 'Espaço em branco duplicado',
        shortMessage: 'Espaço duplo',
        category: 'style',
        suggestions: [' '],
      });
    }

    // Regra 2: espaço antes de pontuação
    const spaceBeforePunct = /\s+([.,;:!?])/g;
    while ((match = spaceBeforePunct.exec(text)) !== null) {
      issues.push({
        id: `local-${issueIdx++}-${match.index}`,
        offset: match.index,
        length: match[0].length,
        text: match[0],
        message: 'Não use espaço antes de pontuação',
        shortMessage: 'Espaço antes de pontuação',
        category: 'punct',
        suggestions: [match[1]],
      });
    }

    // Regra 3: pontuação repetida (exceto reticências)
    const repeatPunct = /([.,;:!?])\1+/g;
    while ((match = repeatPunct.exec(text)) !== null) {
      if (match[0] === '...' || match[0] === '...') continue;
      issues.push({
        id: `local-${issueIdx++}-${match.index}`,
        offset: match.index,
        length: match[0].length,
        text: match[0],
        message: 'Pontuação repetida',
        shortMessage: 'Pontuação dupla',
        category: 'punct',
        suggestions: [match[1]],
      });
    }

    // Regra 4: erros comuns de PT-BR (lista pequena local)
    const commonErrors = {
      'mais': { wrong: /\bmais\b(?=\s+(que|de|para)\b)/gi, suggest: 'mas', msg: 'Provavelmente "mas" (conjunção adversativa)' },
      'agente': { wrong: /\bagente\b/gi, suggest: 'a gente', msg: 'O correto é "a gente" (separado)' },
      'obrigado': { wrong: /\bobrigada?\b/gi, suggest: null, msg: '' }, // pular, depende de gênero
      'porque': { wrong: /\bpor que\b(?=\s*[.?!])/gi, suggest: 'por quê', msg: 'No final de frase use "por quê"' },
    };

    Object.entries(commonErrors).forEach(([key, rule]) => {
      if (!rule.suggest) return;
      while ((match = rule.wrong.exec(text)) !== null) {
        issues.push({
          id: `local-${issueIdx++}-${match.index}`,
          offset: match.index,
          length: match[0].length,
          text: match[0],
          message: rule.msg,
          shortMessage: 'Possível erro',
          category: 'grammar',
          suggestions: [rule.suggest],
        });
      }
    });

    return issues;
  }

  // === ESTATÍSTICAS DO TEXTO ===

  _getTextStats(text) {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const characters = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;

    return {
      words: words.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      characters: characters,
      charactersNoSpaces: charsNoSpaces,
      avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
      readingTime: Math.max(1, Math.ceil(words.length / 200)), // minutos
    };
  }

  // === CACHE ===

  _cleanText(text) {
    if (!text) return '';
    // Remove HTML tags se for HTML
    return text.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  _hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `h${hash}_${text.length}`;
  }

  _addToCache(key, value) {
    this.cache[key] = value;
    // Manter cache limitado
    const keys = Object.keys(this.cache);
    if (keys.length > MAX_CACHE_ITEMS) {
      const oldestKey = keys[0];
      delete this.cache[oldestKey];
    }
    this._saveCache();
  }

  _loadCache() {
    try {
      const saved = sessionStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  _saveCache() {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (e) {
      // Cache cheio, limpar
      this.cache = {};
    }
  }

  /**
   * Limpa o cache manualmente
   */
  clearCache() {
    this.cache = {};
    sessionStorage.removeItem(CACHE_KEY);
  }

  /**
   * Retorna estatísticas do uso
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: Object.keys(this.cache).length,
    };
  }
}

// Singleton — um único motor de correção para todo o app
const grammarEngine = new GrammarEngine();
export default grammarEngine;
