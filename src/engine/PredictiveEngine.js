/**
 * ANOTATA — Motor de Texto Preditivo Local
 * 
 * Um "cérebro" embutido que aprende com tudo que você escreve.
 * Não usa internet, não gasta dinheiro, não depende de IA externa.
 * 
 * Como funciona:
 * - Guarda pares de palavras (bigrams) e trios (trigrams)
 * - Quanto mais você escreve, mais inteligente ele fica
 * - Sugere as próximas palavras baseado no que você já escreveu antes
 * - Tudo salvo no navegador (localStorage)
 */

const STORAGE_KEY = 'anotata-predictive-brain';
const MAX_SUGGESTIONS = 5;

class PredictiveEngine {
  constructor() {
    // Bigrams: "palavra_anterior" → { "próxima_palavra": contagem }
    this.bigrams = {};
    // Trigrams: "palavra1 palavra2" → { "próxima_palavra": contagem }
    this.trigrams = {};
    // Frequência geral de palavras
    this.wordFrequency = {};
    // Palavras recentes (contexto imediato)
    this.recentWords = [];
    // Dicionário base em português
    this.baseDictionary = this._getBaseDictionary();
    // Carregar cérebro salvo
    this._load();
  }

  /**
   * Aprende com um texto completo
   */
  learn(text) {
    if (!text || typeof text !== 'string') return;
    
    // Limpar HTML se vier do editor
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ');
    const words = this._tokenize(clean);
    
    if (words.length === 0) return;

    // Aprender frequência de cada palavra
    for (const word of words) {
      this.wordFrequency[word] = (this.wordFrequency[word] || 0) + 1;
    }

    // Aprender bigrams (pares)
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i];
      const next = words[i + 1];
      
      if (!this.bigrams[current]) {
        this.bigrams[current] = {};
      }
      this.bigrams[current][next] = (this.bigrams[current][next] || 0) + 1;
    }

    // Aprender trigrams (trios)
    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      const next = words[i + 2];
      
      if (!this.trigrams[key]) {
        this.trigrams[key] = {};
      }
      this.trigrams[key][next] = (this.trigrams[key][next] || 0) + 1;
    }

    // Salvar periodicamente
    this._scheduleSave();
  }

  /**
   * Sugere próximas palavras baseado no contexto atual
   */
  predict(currentText) {
    if (!currentText || typeof currentText !== 'string') {
      return this._getTopWords();
    }

    const clean = currentText.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ');
    const words = this._tokenize(clean);
    const suggestions = new Map(); // palavra → pontuação

    // Se está digitando uma palavra incompleta
    const lastChar = currentText[currentText.length - 1];
    const isTypingWord = lastChar && lastChar !== ' ' && lastChar !== '\n';
    
    let partialWord = '';
    if (isTypingWord && words.length > 0) {
      partialWord = words[words.length - 1];
      words.pop(); // Remove a palavra incompleta do contexto
    }

    // Estratégia 1: Trigrams (mais contexto = mais preciso)
    if (words.length >= 2) {
      const key = `${words[words.length - 2]} ${words[words.length - 1]}`;
      const trigramNext = this.trigrams[key];
      if (trigramNext) {
        for (const [word, count] of Object.entries(trigramNext)) {
          if (partialWord && !word.startsWith(partialWord)) continue;
          const score = count * 3; // Peso alto para trigrams
          suggestions.set(word, (suggestions.get(word) || 0) + score);
        }
      }
    }

    // Estratégia 2: Bigrams
    if (words.length >= 1) {
      const lastWord = words[words.length - 1];
      const bigramNext = this.bigrams[lastWord];
      if (bigramNext) {
        for (const [word, count] of Object.entries(bigramNext)) {
          if (partialWord && !word.startsWith(partialWord)) continue;
          const score = count * 2; // Peso médio para bigrams
          suggestions.set(word, (suggestions.get(word) || 0) + score);
        }
      }
    }

    // Estratégia 3: Autocompletar pela palavra parcial
    if (partialWord && partialWord.length >= 2) {
      // Do dicionário aprendido
      for (const [word, freq] of Object.entries(this.wordFrequency)) {
        if (word.startsWith(partialWord) && word !== partialWord) {
          suggestions.set(word, (suggestions.get(word) || 0) + freq);
        }
      }
      // Do dicionário base
      for (const word of this.baseDictionary) {
        if (word.startsWith(partialWord) && word !== partialWord) {
          suggestions.set(word, (suggestions.get(word) || 0) + 0.5);
        }
      }
    }

    // Estratégia 4: Se não tem nada, usa palavras mais frequentes
    if (suggestions.size === 0 && !partialWord) {
      return this._getTopWords();
    }

    // Ordenar por pontuação e retornar top N
    const sorted = [...suggestions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([word]) => word);

    return sorted;
  }

  /**
   * Aprende em tempo real enquanto o usuário digita
   */
  learnRealtime(text) {
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ');
    const words = this._tokenize(clean);
    
    // Guardar as últimas palavras como contexto recente
    this.recentWords = words.slice(-10);
    
    // Aprender a frase inteira
    this.learn(text);
  }

  /**
   * Retorna estatísticas do cérebro
   */
  getStats() {
    return {
      vocabulario: Object.keys(this.wordFrequency).length,
      pares: Object.keys(this.bigrams).length,
      trios: Object.keys(this.trigrams).length,
    };
  }

  /**
   * Reseta o cérebro (apaga tudo que aprendeu)
   */
  reset() {
    this.bigrams = {};
    this.trigrams = {};
    this.wordFrequency = {};
    this.recentWords = [];
    this._save();
  }

  // === PRIVADO ===

  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\wàáâãéêíóôõúüç\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);
  }

  _getTopWords() {
    return Object.entries(this.wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([word]) => word);
  }

  _save() {
    try {
      const data = {
        bigrams: this.bigrams,
        trigrams: this.trigrams,
        wordFrequency: this.wordFrequency,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage cheio — limpar os dados menos usados
      this._cleanup();
    }
  }

  _load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.bigrams = data.bigrams || {};
        this.trigrams = data.trigrams || {};
        this.wordFrequency = data.wordFrequency || {};
      }
    } catch (e) {
      // Se deu erro, começa do zero
      this.bigrams = {};
      this.trigrams = {};
      this.wordFrequency = {};
    }
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 2000);
  }

  _cleanup() {
    // Remove palavras que apareceram só 1 vez
    for (const [word, count] of Object.entries(this.wordFrequency)) {
      if (count <= 1) delete this.wordFrequency[word];
    }
    // Remove bigrams com contagem 1
    for (const [key, nexts] of Object.entries(this.bigrams)) {
      for (const [next, count] of Object.entries(nexts)) {
        if (count <= 1) delete nexts[next];
      }
      if (Object.keys(nexts).length === 0) delete this.bigrams[key];
    }
    this._save();
  }

  _getBaseDictionary() {
    // Palavras mais comuns em português para dar sugestões mesmo antes de aprender
    return [
      'que', 'não', 'para', 'com', 'uma', 'por', 'mais', 'como', 'mas', 'foi',
      'ser', 'quando', 'muito', 'está', 'isso', 'também', 'pode', 'sobre', 'tem',
      'fazer', 'ele', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'porque', 'cada',
      'qual', 'desde', 'ainda', 'onde', 'deve', 'antes', 'aqui', 'então', 'agora',
      'todos', 'nada', 'nova', 'novo', 'você', 'tudo', 'toda', 'outro', 'outra',
      'preciso', 'importante', 'trabalho', 'projeto', 'ideia', 'criar', 'pensar',
      'lembrar', 'escrever', 'nota', 'notas', 'tarefa', 'tarefas', 'hoje', 'amanhã',
      'semana', 'reunião', 'estudar', 'pesquisar', 'verificar', 'concluir', 'pendente',
      'urgente', 'prioridade', 'lista', 'organizar', 'planejar', 'revisar', 'finalizar',
      'começar', 'continuar', 'terminar', 'preparar', 'enviar', 'conferir', 'atualizar',
      'problema', 'solução', 'resultado', 'objetivo', 'meta', 'prazo', 'data', 'hora',
      'precisa', 'precisar', 'necessário', 'possível', 'melhor', 'pior', 'grande',
      'pequeno', 'primeiro', 'segundo', 'último', 'próximo', 'anterior', 'seguinte',
      'exemplo', 'informação', 'documento', 'arquivo', 'pasta', 'página', 'texto',
      'mensagem', 'email', 'contato', 'telefone', 'endereço', 'cliente', 'empresa',
      'equipe', 'pessoa', 'grupo', 'parte', 'forma', 'modo', 'tipo', 'nome', 'número',
      'valor', 'tempo', 'lugar', 'caso', 'vezes', 'dia', 'dias', 'mês', 'ano',
      'anos', 'coisa', 'coisas', 'mundo', 'vida', 'casa', 'área', 'ponto', 'lado',
      'desenvolvimento', 'processo', 'sistema', 'programa', 'aplicação', 'função',
      'design', 'interface', 'conteúdo', 'imagem', 'vídeo', 'áudio', 'arquivo',
      'configurar', 'instalar', 'conectar', 'acessar', 'abrir', 'fechar', 'salvar',
      'copiar', 'colar', 'editar', 'excluir', 'mover', 'buscar', 'encontrar',
    ];
  }
}

// Singleton — um único cérebro para todo o app
const engine = new PredictiveEngine();
export default engine;
