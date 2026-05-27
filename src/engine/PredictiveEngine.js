/**
 * ANOTATA — Motor de Texto Preditivo Local
 *
 * Um "cérebro" embutido que aprende com tudo que você escreve.
 * Não usa internet, não gasta dinheiro, não depende de IA externa.
 *
 * Como funciona:
 * - Guarda pares (bigrams), trios (trigrams) e quartetos (quadgrams) de palavras
 * - Aprende com tudo que você escreve, em todas as notas
 * - Sugere as próximas palavras (e até frases curtas) baseado no que você escreveu antes
 * - Tudo salvo no navegador (localStorage)
 *
 * APIs públicas:
 *   learn(text)              -> alimenta a engine com um texto qualquer
 *   learnFromAll(notes)      -> alimenta a engine com todas as suas notas (bootstrap)
 *   learnRealtime(text)      -> chamado durante a digitação (compatível com PredictiveBar antiga)
 *   predict(currentText)     -> array de até 5 palavras para a UI da PredictiveBar (compatível)
 *   predictPhrase(text)      -> string única com 1 a 3 palavras pra ghost text inline
 *   completeWord(partial)    -> string com o SUFIXO que completa a palavra parcial
 *   getStats()               -> { vocabulario, pares, trios, quartetos }
 *   reset()
 */

const STORAGE_KEY = 'anotata-predictive-brain';
const STORAGE_VERSION = 2;
const MAX_SUGGESTIONS = 5;

class PredictiveEngine {
  constructor() {
    this.bigrams = {};
    this.trigrams = {};
    this.quadgrams = {};
    this.wordFrequency = {};
    this.recentWords = [];
    this.baseDictionary = this._getBaseDictionary();
    this._learnedNotebookFingerprint = null;
    this._load();
    // Pré-aquece o dicionário base como conhecimento "leve"
    for (const w of this.baseDictionary) {
      if (this.wordFrequency[w] === undefined) this.wordFrequency[w] = 0.5;
    }
  }

  // ============================================================
  //   APRENDIZADO
  // ============================================================

  /** Aprende com um texto qualquer (HTML é limpo). */
  learn(text) {
    if (!text || typeof text !== 'string') return;
    const clean = this._stripHtml(text);
    const words = this._tokenize(clean);
    if (words.length === 0) return;

    for (const word of words) {
      this.wordFrequency[word] = (this.wordFrequency[word] || 0) + 1;
    }

    // bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const k = words[i];
      if (!this.bigrams[k]) this.bigrams[k] = {};
      this.bigrams[k][words[i + 1]] = (this.bigrams[k][words[i + 1]] || 0) + 1;
    }
    // trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const k = `${words[i]} ${words[i + 1]}`;
      if (!this.trigrams[k]) this.trigrams[k] = {};
      this.trigrams[k][words[i + 2]] = (this.trigrams[k][words[i + 2]] || 0) + 1;
    }
    // quadgrams
    for (let i = 0; i < words.length - 3; i++) {
      const k = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!this.quadgrams[k]) this.quadgrams[k] = {};
      this.quadgrams[k][words[i + 3]] = (this.quadgrams[k][words[i + 3]] || 0) + 1;
    }

    this._scheduleSave();
  }

  /**
   * Aprende com TODAS as notas existentes em um único disparo (bootstrap).
   * Inclui content, title, tags e até motivos de conexões manuais. Idempotente:
   * só re-processa quando a coleção muda.
   */
  learnFromAll(notes) {
    if (!Array.isArray(notes) || notes.length === 0) return;

    const fingerprint = this._fingerprint(notes);
    if (fingerprint === this._learnedNotebookFingerprint) return; // nada novo
    this._learnedNotebookFingerprint = fingerprint;

    for (const n of notes) {
      if (!n || n.isTrash) continue;
      if (n.title) this.learn(n.title);
      if (n.content) this.learn(n.content);
      if (Array.isArray(n.tags)) this.learn(n.tags.join(' '));
      if (Array.isArray(n.manualConnections)) {
        for (const c of n.manualConnections) {
          if (c && typeof c === 'object' && c.reason) this.learn(c.reason);
        }
      }
    }
    this._save();
  }

  /** Compatível com a PredictiveBar antiga: aprende em tempo real */
  learnRealtime(text) {
    const clean = this._stripHtml(text);
    const words = this._tokenize(clean);
    this.recentWords = words.slice(-12);
    this.learn(text);
  }

  // ============================================================
  //   PREDIÇÃO
  // ============================================================

  /** Compatível com a PredictiveBar antiga: retorna até 5 palavras candidatas */
  predict(currentText) {
    if (!currentText || typeof currentText !== 'string') return this._getTopWords();

    const clean = this._stripHtml(currentText);
    const words = this._tokenize(clean);
    const last = currentText[currentText.length - 1];
    const isTypingWord = last && !/[\s\n]/.test(last);

    let partial = '';
    if (isTypingWord && words.length > 0) {
      partial = words[words.length - 1];
      words.pop();
    }

    const scores = new Map();
    const add = (word, weight) => {
      if (!word) return;
      if (partial && !word.startsWith(partial)) return;
      if (word === partial) return;
      scores.set(word, (scores.get(word) || 0) + weight);
    };

    // quadgrams (peso 5)
    if (words.length >= 3) {
      const k = `${words[words.length - 3]} ${words[words.length - 2]} ${words[words.length - 1]}`;
      const next = this.quadgrams[k];
      if (next) for (const [w, c] of Object.entries(next)) add(w, c * 5);
    }
    // trigrams (peso 3)
    if (words.length >= 2) {
      const k = `${words[words.length - 2]} ${words[words.length - 1]}`;
      const next = this.trigrams[k];
      if (next) for (const [w, c] of Object.entries(next)) add(w, c * 3);
    }
    // bigrams (peso 2)
    if (words.length >= 1) {
      const next = this.bigrams[words[words.length - 1]];
      if (next) for (const [w, c] of Object.entries(next)) add(w, c * 2);
    }
    // autocomplete por prefixo
    if (partial && partial.length >= 2) {
      for (const [w, f] of Object.entries(this.wordFrequency)) {
        if (w.startsWith(partial) && w !== partial) add(w, f);
      }
      for (const w of this.baseDictionary) {
        if (w.startsWith(partial) && w !== partial) add(w, 0.5);
      }
    }

    if (scores.size === 0 && !partial) return this._getTopWords();

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([w]) => w);
  }

  /**
   * Retorna O SUFIXO que completa a palavra parcial atual.
   * Ex: completeWord('rev') -> 'isar'    (porque 'revisar' é a melhor candidata)
   *     completeWord('imp') -> 'ortante' (etc.)
   * Retorna null se não houver candidato decente.
   */
  completeWord(partial) {
    if (!partial || typeof partial !== 'string') return null;
    const p = partial.toLowerCase();
    if (p.length < 2) return null;

    let best = null;
    let bestScore = -Infinity;

    // Aprendido tem prioridade alta
    for (const [w, f] of Object.entries(this.wordFrequency)) {
      if (w.length <= p.length || !w.startsWith(p)) continue;
      const score = f;
      if (score > bestScore) { bestScore = score; best = w; }
    }

    // Dicionário base
    if (!best) {
      for (const w of this.baseDictionary) {
        if (w.length <= p.length || !w.startsWith(p)) continue;
        return w.slice(p.length);
      }
    }

    if (!best) return null;
    return best.slice(p.length);
  }

  /**
   * Retorna a melhor PRÓXIMA FRASE (até 3 palavras) para ghost text inline.
   * Ex: predictPhrase('preciso fazer ') -> 'uma reunião amanhã'
   * Recebe o texto antes do cursor (com espaço final). Se for null, sem sugestão.
   */
  predictPhrase(textBefore, maxWords = 3) {
    if (!textBefore || typeof textBefore !== 'string') return null;
    const clean = this._stripHtml(textBefore);
    const words = this._tokenize(clean);
    if (words.length === 0) return null;

    const result = [];
    let context = words.slice();

    for (let step = 0; step < maxWords; step++) {
      const next = this._bestNextWord(context);
      if (!next) break;
      result.push(next);
      context = [...context, next];
      // Para frases curtas: se confiança caiu muito, paramos
    }

    if (result.length === 0) return null;
    return result.join(' ');
  }

  // ============================================================
  //   ESTATÍSTICA & MANUTENÇÃO
  // ============================================================

  getStats() {
    return {
      vocabulario: Object.keys(this.wordFrequency).length,
      pares: Object.keys(this.bigrams).length,
      trios: Object.keys(this.trigrams).length,
      quartetos: Object.keys(this.quadgrams).length,
    };
  }

  reset() {
    this.bigrams = {};
    this.trigrams = {};
    this.quadgrams = {};
    this.wordFrequency = {};
    this.recentWords = [];
    this._learnedNotebookFingerprint = null;
    this._save();
  }

  // ============================================================
  //   PRIVADO
  // ============================================================

  _bestNextWord(words) {
    if (!words || words.length === 0) return null;
    const candidates = new Map();
    const add = (w, weight) => {
      if (!w) return;
      candidates.set(w, (candidates.get(w) || 0) + weight);
    };

    if (words.length >= 3) {
      const k = `${words[words.length - 3]} ${words[words.length - 2]} ${words[words.length - 1]}`;
      const next = this.quadgrams[k];
      if (next) for (const [w, c] of Object.entries(next)) add(w, c * 5);
    }
    if (words.length >= 2) {
      const k = `${words[words.length - 2]} ${words[words.length - 1]}`;
      const next = this.trigrams[k];
      if (next) for (const [w, c] of Object.entries(next)) add(w, c * 3);
    }
    if (words.length >= 1) {
      const next = this.bigrams[words[words.length - 1]];
      if (next) for (const [w, c] of Object.entries(next)) add(w, c * 2);
    }
    if (candidates.size === 0) return null;
    let best = null;
    let bestScore = -Infinity;
    for (const [w, s] of candidates) {
      if (s > bestScore) { bestScore = s; best = w; }
    }
    // só aceita se tiver evidência mínima
    if (bestScore < 1) return null;
    return best;
  }

  _stripHtml(text) {
    return String(text || '').replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ');
  }

  _tokenize(text) {
    return String(text || '')
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

  _fingerprint(notes) {
    // só o suficiente pra detectar mudança de coleção
    let fp = '';
    for (const n of notes) {
      fp += (n?.id || '') + ':' + (n?.updatedAt || '') + '|';
    }
    return fp.length + '_' + this._hash(fp);
  }

  _hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  _save() {
    try {
      const data = {
        v: STORAGE_VERSION,
        bigrams: this.bigrams,
        trigrams: this.trigrams,
        quadgrams: this.quadgrams,
        wordFrequency: this.wordFrequency,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
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
        this.quadgrams = data.quadgrams || {};
        this.wordFrequency = data.wordFrequency || {};
      }
    } catch (_) {
      this.bigrams = {};
      this.trigrams = {};
      this.quadgrams = {};
      this.wordFrequency = {};
    }
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 1500);
  }

  _cleanup() {
    for (const [w, c] of Object.entries(this.wordFrequency)) {
      if (c <= 1) delete this.wordFrequency[w];
    }
    for (const obj of [this.bigrams, this.trigrams, this.quadgrams]) {
      for (const [k, nexts] of Object.entries(obj)) {
        for (const [n, c] of Object.entries(nexts)) {
          if (c <= 1) delete nexts[n];
        }
        if (Object.keys(nexts).length === 0) delete obj[k];
      }
    }
    try { this._save(); } catch (_) {}
  }

  /**
   * ~600 palavras frequentes em PT-BR voltadas a escrita pessoal/de trabalho/notas.
   * Curado manualmente (sem fonte externa restritiva).
   */
  _getBaseDictionary() {
    return [
      // verbos comuns / auxiliares
      'que','não','para','com','uma','por','mais','como','mas','foi','ser','quando','muito',
      'está','isso','também','pode','sobre','tem','fazer','ele','ela','entre','depois','sem',
      'mesmo','porque','cada','qual','desde','ainda','onde','deve','antes','aqui','então',
      'agora','todos','nada','nova','novo','você','tudo','toda','outro','outra','tudo','todas',
      'estou','estava','será','seria','tenho','teria','terei','quero','quis','queria','vou',
      'fui','vamos','foram','iremos','farei','faria','poderia','poderei','possa','possam',
      'devo','devia','deveria','sabia','sabendo','vendo','fazendo','tendo','indo','dando',
      'dizer','disse','dito','falar','falando','falou','contar','contou','mostrar','mostrou',
      'lembrar','lembrei','lembrou','lembrando','esquecer','esqueci','esqueceu',
      'pensar','pensei','pensando','pensou','achar','acho','achou','acreditar','acredito',
      'entender','entendi','entendido','perceber','percebi','percebeu','notar','notei',
      'aprender','aprendi','aprendendo','ensinar','ensinou','ensinando',
      'precisar','precisa','precisei','precisando','poder','podendo','tentar','tentei','tentou',
      'começar','começou','começando','iniciar','iniciado','terminar','terminou','terminado',
      'continuar','continuando','parar','parou','seguir','seguindo','voltar','voltei','voltando',

      // substantivos cotidianos
      'projeto','projetos','ideia','ideias','tarefa','tarefas','reunião','reuniões','nota','notas',
      'lista','listas','plano','planos','meta','metas','objetivo','objetivos','prazo','prazos',
      'data','datas','hora','horário','dia','dias','semana','semanas','mês','meses','ano','anos',
      'tempo','momento','agenda','calendário','evento','eventos','encontro','conversa',
      'pessoa','pessoas','equipe','equipes','grupo','grupos','cliente','clientes','empresa','empresas',
      'parceiro','parceiros','fornecedor','contato','contatos','responsável','colega',
      'trabalho','escritório','casa','rua','endereço','telefone','email','número','código',
      'documento','documentos','arquivo','arquivos','pasta','pastas','página','páginas',
      'imagem','imagens','foto','fotos','vídeo','vídeos','áudio','link','links','texto','textos',
      'mensagem','mensagens','comentário','observação','observações','referência','fonte',
      'problema','problemas','solução','soluções','dúvida','dúvidas','pergunta','resposta','respostas',
      'resultado','resultados','impacto','consequência','sucesso','falha','erro','acerto',
      'ferramenta','aplicação','aplicativo','sistema','site','plataforma','tela','interface','design',
      'cor','cores','tipografia','espaço','tamanho','formato','estilo','marca','identidade',
      'briefing','escopo','requisito','requisitos','entrega','entregas','versão','versões',
      'feedback','revisão','aprovação','ajuste','ajustes','correção','correções','melhoria','melhorias',

      // adjetivos / qualificadores
      'importante','urgente','prioridade','simples','complexo','rápido','lento','fácil','difícil',
      'bom','boa','ótimo','ótima','ruim','grande','pequeno','novo','antigo','recente','atual',
      'final','inicial','primeiro','segundo','terceiro','último','próximo','anterior','seguinte',
      'pendente','concluído','concluída','aprovado','rejeitado','aberto','fechado','ativo','inativo',
      'positivo','negativo','claro','confuso','direto','indireto','curto','longo','breve','extenso',
      'criativo','prático','funcional','bonito','feio','organizado','bagunçado',

      // tempo / advérbios
      'hoje','ontem','amanhã','agora','depois','antes','sempre','nunca','talvez','provavelmente',
      'rapidamente','lentamente','cedo','tarde','quase','perto','longe','aqui','ali','lá',
      'durante','enquanto','assim','também','apenas','somente','até','desde','dentro','fora',

      // verbos típicos de notas/checklist
      'criar','editar','revisar','organizar','planejar','agendar','marcar','desmarcar',
      'atualizar','enviar','receber','responder','confirmar','cancelar','adiar','postergar',
      'comprar','vender','contratar','demitir','contactar','ligar','desligar','salvar',
      'arquivar','restaurar','duplicar','dividir','juntar','combinar','separar',
      'verificar','confirmar','testar','validar','aprovar','rejeitar','documentar',
      'pesquisar','procurar','encontrar','listar','filtrar','ordenar','agrupar','categorizar',
      'apresentar','explicar','discutir','decidir','escolher','priorizar','delegar',
      'finalizar','entregar','publicar','divulgar','compartilhar','exportar','importar',

      // cumprimentos / respostas curtas
      'oi','olá','obrigado','obrigada','por-favor','desculpa','desculpe','tudo-bem','beleza',
      'ok','okay','sim','não','talvez','claro','certo','errado','perfeito','combinado',

      // específicos do contexto designer/usuário (TDAH-friendly)
      'caderno','cadernos','caixa','rascunho','rascunhos','esboço','esboços','referências',
      'paleta','tipografia','identidade','marca','logo','cliente','briefing','prazo',
      'inspiração','inspirações','mood','moodboard','wireframe','protótipo','versão',
      'foco','foquei','retomar','retomei','continuar','continuei','distração','distrai',
      'energia','cansaço','descansar','dormir','acordar','manhã','tarde','noite','madrugada',

      // conectores
      'portanto','entretanto','contudo','todavia','assim','dessa-forma','dessa-maneira',
      'em-resumo','em-suma','por-exemplo','ou-seja','isto-é','além-disso','por-isso',
      'antes-de','depois-de','durante','enquanto','caso','quando','sempre-que','toda-vez',
    ];
  }
}

const engine = new PredictiveEngine();
export default engine;
