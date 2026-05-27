/**
 * ANOTATA — Templates de Anotação
 *
 * Modelos prontos para iniciar notas mais rápido.
 * Cada template tem estrutura inicial limpa, sem poluir.
 */

export const TEMPLATES = {
  ideia: {
    id: 'ideia',
    name: 'Ideia',
    icon: '💡',
    description: 'Capture uma ideia que surgiu',
    type: 'ideia',
    status: 'rascunho',
    priority: 'normal',
    titlePrefix: 'Ideia: ',
    content: `<h2>💡 Ideia</h2>
<p><strong>O que é:</strong></p>
<p></p>
<p><strong>Por quê é interessante:</strong></p>
<p></p>
<p><strong>Inspiração:</strong></p>
<p></p>
<p><strong>Próximo passo possível:</strong></p>
<p></p>`,
  },

  tarefa: {
    id: 'tarefa',
    name: 'Tarefa',
    icon: '✓',
    description: 'Algo que precisa ser feito',
    type: 'tarefa',
    status: 'ativo',
    priority: 'normal',
    titlePrefix: '',
    content: `<h2>✓ Tarefa</h2>
<p><strong>O que precisa ser feito:</strong></p>
<p></p>
<p><strong>Por quê:</strong></p>
<p></p>
<p><strong>Como começar:</strong></p>
<p></p>
<p><strong>Prazo:</strong></p>
<p></p>
<p><strong>Status:</strong> Aberta</p>`,
  },

  decisao: {
    id: 'decisao',
    name: 'Decisão',
    icon: '⚖️',
    description: 'Registre uma decisão importante',
    type: 'decisao',
    status: 'ativo',
    priority: 'alta',
    titlePrefix: 'Decisão: ',
    content: `<h2>⚖️ Decisão</h2>
<p><strong>Contexto:</strong></p>
<p></p>
<p><strong>Decisão:</strong></p>
<p></p>
<p><strong>Motivo:</strong></p>
<p></p>
<p><strong>Impacto esperado:</strong></p>
<p></p>
<p><strong>Próxima ação:</strong></p>
<p></p>
<p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>`,
  },

  problema: {
    id: 'problema',
    name: 'Problema',
    icon: '⚠️',
    description: 'Documente um problema para resolver',
    type: 'problema',
    status: 'ativo',
    priority: 'alta',
    titlePrefix: 'Problema: ',
    content: `<h2>⚠️ Problema</h2>
<p><strong>Problema:</strong></p>
<p></p>
<p><strong>Onde acontece:</strong></p>
<p></p>
<p><strong>Possível causa:</strong></p>
<p></p>
<p><strong>Tentativas feitas:</strong></p>
<ul><li></li></ul>
<p><strong>Próxima ação:</strong></p>
<p></p>
<p><strong>Status:</strong> Aberto</p>`,
  },

  referencia: {
    id: 'referencia',
    name: 'Referência',
    icon: '📚',
    description: 'Material de consulta ou guia',
    type: 'referencia',
    status: 'ativo',
    priority: 'normal',
    titlePrefix: '',
    content: `<h2>📚 Referência</h2>
<p><strong>Sobre:</strong></p>
<p></p>
<p><strong>Pontos principais:</strong></p>
<ul><li></li><li></li><li></li></ul>
<p><strong>Fonte:</strong></p>
<p></p>
<p><strong>Quando usar:</strong></p>
<p></p>`,
  },

  reuniao: {
    id: 'reuniao',
    name: 'Reunião',
    icon: '👥',
    description: 'Ata de reunião com pauta',
    type: 'reuniao',
    status: 'ativo',
    priority: 'normal',
    titlePrefix: 'Reunião — ',
    content: `<h2>👥 Reunião</h2>
<p><strong>Assunto:</strong></p>
<p></p>
<p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
<p><strong>Participantes:</strong></p>
<ul><li></li></ul>
<p><strong>Pontos discutidos:</strong></p>
<ul><li></li><li></li></ul>
<p><strong>Decisões:</strong></p>
<ul><li></li></ul>
<p><strong>Tarefas geradas:</strong></p>
<ul data-type="taskList"><li data-checked="false"><div><p></p></div></li></ul>
<p><strong>Próxima ação:</strong></p>
<p></p>`,
  },

  checklist: {
    id: 'checklist',
    name: 'Checklist',
    icon: '☑️',
    description: 'Lista de tarefas para verificar',
    type: 'checklist',
    status: 'ativo',
    priority: 'normal',
    titlePrefix: 'Checklist: ',
    content: `<h2>☑️ Checklist</h2>
<p><strong>Sobre:</strong></p>
<p></p>
<ul data-type="taskList">
<li data-checked="false"><div><p></p></div></li>
<li data-checked="false"><div><p></p></div></li>
<li data-checked="false"><div><p></p></div></li>
</ul>`,
  },

  prompt: {
    id: 'prompt',
    name: 'Prompt',
    icon: '🎯',
    description: 'Comando ou instrução para IA',
    type: 'prompt',
    status: 'ativo',
    priority: 'normal',
    titlePrefix: 'Prompt: ',
    content: `<h2>🎯 Prompt</h2>
<p><strong>Objetivo do prompt:</strong></p>
<p></p>
<p><strong>Prompt:</strong></p>
<blockquote><p></p></blockquote>
<p><strong>Quando usar:</strong></p>
<p></p>
<p><strong>Resultado esperado:</strong></p>
<p></p>`,
  },

  registroProjeto: {
    id: 'registroProjeto',
    name: 'Registro de projeto',
    icon: '📝',
    description: 'Anotação ligada a um projeto em andamento',
    type: 'registro',
    status: 'ativo',
    priority: 'normal',
    titlePrefix: '',
    content: `<h2>📝 Registro de projeto</h2>
<p><strong>Projeto:</strong></p>
<p></p>
<p><strong>Etapa atual:</strong></p>
<p></p>
<p><strong>O que foi feito hoje:</strong></p>
<ul><li></li></ul>
<p><strong>Próxima ação:</strong></p>
<p></p>
<p><strong>Bloqueios:</strong></p>
<p></p>`,
  },

  linkSalvo: {
    id: 'linkSalvo',
    name: 'Link salvo',
    icon: '🔗',
    description: 'Salve um link com contexto',
    type: 'link',
    status: 'ativo',
    priority: 'baixa',
    titlePrefix: '',
    content: `<h2>🔗 Link salvo</h2>
<p><strong>Link:</strong></p>
<p></p>
<p><strong>Sobre o que é:</strong></p>
<p></p>
<p><strong>Por quê salvei:</strong></p>
<p></p>
<p><strong>Quando usar:</strong></p>
<p></p>`,
  },

  planejamento: {
    id: 'planejamento',
    name: 'Planejamento',
    icon: '📅',
    description: 'Plano de ação estruturado',
    type: 'registro',
    status: 'ativo',
    priority: 'alta',
    titlePrefix: 'Plano: ',
    content: `<h2>📅 Planejamento</h2>
<p><strong>Objetivo:</strong></p>
<p></p>
<p><strong>Prazo:</strong></p>
<p></p>
<p><strong>Etapas:</strong></p>
<ol><li></li><li></li><li></li></ol>
<p><strong>Recursos necessários:</strong></p>
<ul><li></li></ul>
<p><strong>Próxima ação:</strong></p>
<p></p>`,
  },

  revisao: {
    id: 'revisao',
    name: 'Revisão',
    icon: '👁️',
    description: 'Reflexão ou retrospectiva',
    type: 'registro',
    status: 'revisar',
    priority: 'normal',
    titlePrefix: 'Revisão: ',
    content: `<h2>👁️ Revisão</h2>
<p><strong>O que foi revisado:</strong></p>
<p></p>
<p><strong>O que está funcionando bem:</strong></p>
<ul><li></li></ul>
<p><strong>O que precisa melhorar:</strong></p>
<ul><li></li></ul>
<p><strong>Aprendizado:</strong></p>
<p></p>
<p><strong>Próxima ação:</strong></p>
<p></p>`,
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

/**
 * Pega um template e retorna os dados pra criar a nota.
 */
export function applyTemplate(templateId, customTitle = '') {
  const tmpl = TEMPLATES[templateId];
  if (!tmpl) return null;

  const baseTitle = customTitle.trim() || `${tmpl.titlePrefix}Sem título`;
  return {
    title: baseTitle,
    content: tmpl.content,
    type: tmpl.type,
    status: tmpl.status,
    priority: tmpl.priority,
    source: `template:${templateId}`,
  };
}
