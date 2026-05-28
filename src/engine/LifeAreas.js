/**
 * ============================================================
 * LIFE AREAS — Áreas da vida (núcleos cognitivos do Note Pulse)
 * ============================================================
 *
 * Constante mestra das 10 áreas + 1 'outros'.
 * Base conceitual: estrutura_neurocognitiva_mestre/areas-da-vida.md
 * Base cromática:  estrutura_neurocognitiva_mestre/regra-de-cor.md
 *
 * Cada área é um território cognitivo permanente ao redor do "Eu".
 * Hierarquia: Eu → Núcleos (áreas) → Cadernos → Pulsos
 *
 * REGRAS DE OURO:
 * - 10 áreas + 1 livre = limite cognitivo de cores categóricas
 * - 'outros' é o padrão até o usuário classificar manualmente
 * - Áreas vazias não aparecem no mapa (NeuroAdaptação)
 * - Áreas com mais Pulsos ficam mais perto do centro (Lei da gravidade)
 *
 * Fontes acadêmicas (sintetizadas):
 * - 8 Dimensions of Wellness (Bill Hettler / US Nat. Wellness Inst.)
 * - Wheel of Life (Paul J. Meyer)
 * - 12 Areas of Life Balance (Mindvalley)
 * - PIES Model (psicologia do desenvolvimento)
 */

// ============================================================
// 1) MAPA MESTRE DAS 10 ÁREAS + 1 LIVRE
// ============================================================

export const LIFE_AREAS = {
  saude: {
    id: 'saude',
    name: 'Saúde & Corpo',
    shortName: 'Saúde',
    icon: 'Heart',
    color: '#10B981',
    colorDark: '#047857',
    colorLight: '#D1FAE5',
    colorGlow: '#34D399',
    description: 'Corpo físico, vitalidade, energia, sono, alimentação, exercício, autocuidado',
    neuroDominant: ['NeuroEnergia', 'NeuroComportamento'],
    order: 1,
  },
  emocoes: {
    id: 'emocoes',
    name: 'Emoções & Saúde Mental',
    shortName: 'Emoções',
    icon: 'Smile',
    color: '#F472B6',
    colorDark: '#BE185D',
    colorLight: '#FCE7F3',
    colorGlow: '#F9A8D4',
    description: 'Estados emocionais, sentimentos, reflexões íntimas, terapia, gratidão',
    neuroDominant: ['NeuroEmocional', 'NeuroConsciência'],
    order: 2,
  },
  intelectual: {
    id: 'intelectual',
    name: 'Intelectual & Estudos',
    shortName: 'Intelectual',
    icon: 'Brain',
    color: '#3B82F6',
    colorDark: '#1E40AF',
    colorLight: '#DBEAFE',
    colorGlow: '#60A5FA',
    description: 'Aprendizado, leituras, cursos, ideias intelectuais, pesquisa, conhecimento',
    neuroDominant: ['NeuroCognição', 'NeuroMemória', 'NeuroAssociação'],
    order: 3,
  },
  carreira: {
    id: 'carreira',
    name: 'Carreira & Trabalho',
    shortName: 'Carreira',
    icon: 'Briefcase',
    color: '#F59E0B',
    colorDark: '#92400E',
    colorLight: '#FEF3C7',
    colorGlow: '#FBBF24',
    description: 'Profissão, projetos profissionais, reuniões, metas de carreira',
    neuroDominant: ['NeuroProdutividade', 'NeuroEstratégia', 'NeuroDecisão'],
    order: 4,
  },
  financas: {
    id: 'financas',
    name: 'Finanças',
    shortName: 'Finanças',
    icon: 'Coins',
    color: '#059669',
    colorDark: '#065F46',
    colorLight: '#D1FAE5',
    colorGlow: '#10B981',
    description: 'Dinheiro, orçamento, investimentos, dívidas, planejamento financeiro',
    neuroDominant: ['NeuroEstratégia', 'NeuroDecisão', 'NeuroProdutividade'],
    order: 5,
  },
  relacoes: {
    id: 'relacoes',
    name: 'Relacionamentos',
    shortName: 'Relações',
    icon: 'Users',
    color: '#FB923C',
    colorDark: '#9A3412',
    colorLight: '#FFEDD5',
    colorGlow: '#FDBA74',
    description: 'Família, amizades, relacionamentos amorosos, comunidade, dinâmicas interpessoais',
    neuroDominant: ['NeuroEmocional', 'NeuroAssociação', 'NeuroPresença'],
    order: 6,
  },
  espiritual: {
    id: 'espiritual',
    name: 'Espiritual & Propósito',
    shortName: 'Espiritual',
    icon: 'Sparkles',
    color: '#A78BFA',
    colorDark: '#5B21B6',
    colorLight: '#EDE9FE',
    colorGlow: '#C4B5FD',
    description: 'Sentido de vida, propósito, fé, meditação, valores profundos, transcendência',
    neuroDominant: ['NeuroConsciência', 'NeuroIdentidade', 'NeuroSemiótica'],
    order: 7,
  },
  lar: {
    id: 'lar',
    name: 'Lar & Ambiente',
    shortName: 'Lar',
    icon: 'Home',
    color: '#65A30D',
    colorDark: '#3F6212',
    colorLight: '#ECFCCB',
    colorGlow: '#84CC16',
    description: 'Casa, ambiente físico, organização do espaço, viagens, lugares',
    neuroDominant: ['NeuroPresença', 'NeuroPercepção Espacial', 'NeuroAtmosfera'],
    order: 8,
  },
  lazer: {
    id: 'lazer',
    name: 'Lazer & Criatividade',
    shortName: 'Lazer',
    icon: 'Palette',
    color: '#EC4899',
    colorDark: '#9D174D',
    colorLight: '#FCE7F3',
    colorGlow: '#F472B6',
    description: 'Hobbies, arte, esporte recreativo, jogos, criação artística, prazeres',
    neuroDominant: ['NeuroEstética', 'NeuroEmocional'],
    order: 9,
  },
  crescimento: {
    id: 'crescimento',
    name: 'Crescimento Pessoal',
    shortName: 'Crescimento',
    icon: 'Compass',
    color: '#06B6D4',
    colorDark: '#155E75',
    colorLight: '#CFFAFE',
    colorGlow: '#22D3EE',
    description: 'Desenvolvimento pessoal, hábitos novos, metas de longo prazo, autoconhecimento',
    neuroDominant: ['NeuroAdaptação', 'NeuroEvolução'],
    order: 10,
  },
  outros: {
    id: 'outros',
    name: 'Outros',
    shortName: 'Outros',
    icon: 'CircleDot',
    color: '#6B7280',
    colorDark: '#374151',
    colorLight: '#F3F4F6',
    colorGlow: '#9CA3AF',
    description: 'Pulsos que ainda não pertencem a uma área específica',
    neuroDominant: ['NeuroFlexibilidade'],
    order: 0, // sempre por último visualmente
  },
};

// ============================================================
// 2) HELPERS UTILITÁRIOS
// ============================================================

/**
 * Retorna a área da vida pelo id, com fallback para 'outros'.
 * Defensivo: nunca retorna undefined.
 */
export function getLifeArea(areaId) {
  if (!areaId || typeof areaId !== 'string') return LIFE_AREAS.outros;
  return LIFE_AREAS[areaId] || LIFE_AREAS.outros;
}

/**
 * Lista de áreas em ordem canônica (1..10), com 'outros' no final.
 * Útil para iterar em UI de seleção de área.
 */
export function listLifeAreas() {
  return Object.values(LIFE_AREAS).sort((a, b) => {
    // 'outros' (order: 0) vai pro final
    if (a.order === 0) return 1;
    if (b.order === 0) return -1;
    return a.order - b.order;
  });
}

/**
 * Conta quantos Pulsos ativos existem em cada área da vida.
 * Retorna { saude: 12, carreira: 5, ... } — só áreas com >0.
 *
 * Defensivo: aceita notes vazio/undefined; ignora isTrash/isArchived.
 */
export function getAreaUsage(notes) {
  const usage = {};
  if (!Array.isArray(notes)) return usage;
  notes.forEach((n) => {
    if (!n || n.isTrash || n.isArchived) return;
    const areaId = (n.lifeArea && LIFE_AREAS[n.lifeArea]) ? n.lifeArea : 'outros';
    usage[areaId] = (usage[areaId] || 0) + 1;
  });
  return usage;
}

/**
 * Retorna apenas as áreas que têm pelo menos 1 Pulso ativo.
 * Usado para decidir quais núcleos renderizar no mapa.
 *
 * Áreas vazias não aparecem (NeuroAdaptação:
 *  estrutura cresce com o uso, sem poluir visualmente).
 */
export function getActiveLifeAreas(notes) {
  const usage = getAreaUsage(notes);
  return listLifeAreas()
    .filter((area) => (usage[area.id] || 0) > 0)
    .map((area) => ({ ...area, usage: usage[area.id] || 0 }));
}

/**
 * Calcula a "gravidade cognitiva" de cada área:
 * áreas com mais Pulsos → maior gravity (mais perto do centro).
 * Retorna mapa { areaId: gravityFactor (0..1) }.
 *
 * Lei da gravidade documentada em:
 *  estrutura_neurocognitiva_mestre/areas-da-vida.md (seção comportamento adaptativo)
 *  estrutura_neurocognitiva_mestre/FEEDBACK-USUARIO-R3.md (Ponto 3)
 */
export function calculateAreaGravity(notes) {
  const usage = getAreaUsage(notes);
  const counts = Object.values(usage);
  if (counts.length === 0) return {};
  const max = Math.max(...counts, 1);
  const gravity = {};
  Object.entries(usage).forEach(([areaId, count]) => {
    gravity[areaId] = count / max; // 0..1
  });
  return gravity;
}

/**
 * Formato Tailwind dos tokens — útil para componentes que precisam
 * gerar className dinamicamente baseado na área.
 *
 * Ex: bg-area-saude-light, text-area-saude-dark, border-area-saude-base
 */
export function getAreaTailwindTokens(areaId) {
  const area = getLifeArea(areaId);
  return {
    bgLight: `bg-area-${area.id}-light`,
    bgBase: `bg-area-${area.id}-base`,
    bgDark: `bg-area-${area.id}-dark`,
    textBase: `text-area-${area.id}-base`,
    textDark: `text-area-${area.id}-dark`,
    borderBase: `border-area-${area.id}-base`,
    ringGlow: `ring-area-${area.id}-glow`,
  };
}

// ============================================================
// 3) ESTADOS SEMÂNTICOS (Camada 3 da regra de cor)
// ============================================================

export const NOTE_STATES = {
  critico:     { id: 'critico',     label: 'Crítico',      color: '#EF4444', bg: '#FEE2E2', dark: '#991B1B', icon: 'AlertTriangle' },
  atencao:     { id: 'atencao',     label: 'Em atenção',   color: '#F59E0B', bg: '#FEF3C7', dark: '#92400E', icon: 'AlertCircle'   },
  saudavel:    { id: 'saudavel',    label: 'Saudável',     color: '#10B981', bg: '#D1FAE5', dark: '#065F46', icon: 'CheckCircle'   },
  informativo: { id: 'informativo', label: 'Informativo',  color: '#3B82F6', bg: '#DBEAFE', dark: '#1E40AF', icon: 'Info'          },
  esquecido:   { id: 'esquecido',   label: 'Esquecido',    color: '#9CA3AF', bg: '#F3F4F6', dark: '#4B5563', icon: 'CloudOff'      },
  pulsando:    { id: 'pulsando',    label: 'Recém-criado', color: '#A07BD6', bg: '#EDE8F2', dark: '#5B2D8E', icon: 'Sparkles'      },
  favorito:    { id: 'favorito',    label: 'Favorito',     color: '#F0B400', bg: '#FEF3C7', dark: '#92400E', icon: 'Star'          },
};

/**
 * Retorna o estado pelo id, com fallback para informativo.
 */
export function getNoteState(stateId) {
  if (!stateId || typeof stateId !== 'string') return NOTE_STATES.informativo;
  return NOTE_STATES[stateId] || NOTE_STATES.informativo;
}

// ============================================================
// 4) Default export — objeto único pra import simplificado
// ============================================================

export default {
  LIFE_AREAS,
  NOTE_STATES,
  getLifeArea,
  listLifeAreas,
  getAreaUsage,
  getActiveLifeAreas,
  calculateAreaGravity,
  getAreaTailwindTokens,
  getNoteState,
};
