# Especificação Técnica
## Hierarquia: Áreas da Vida → Projetos → Cadernos → Notas
## + Agente Inteligente Local

> **Status:** Rascunho aguardando aprovação do usuário
> **Autor:** Kiro, com base em diálogo com o usuário (28/05/2026)
> **Tipo:** Refator estrutural (modelo de dados + UI + mapa) + nova peça central (Agente)
> **Tamanho:** Grande — 10 PRs pequenos faseados

---

## 0. Princípio fundador desta spec

> **"O sistema faz pelo usuário tudo que conseguir inferir. Botão manual é último recurso. Tela limpa é prioridade."**

Esta especificação foi reescrita com esse princípio depois que o usuário deixou claro que automação > escolha manual.

Documentado em `.kiro/steering/principios-do-produto.md`.

**O modelo visual atual da nota (PR #19) está aprovado e NÃO será mudado nesta spec.**

---

## 1. Por que essa especificação existe

Hoje o NotePulse tem dois conceitos paralelos:
- **Áreas da Vida** (etiqueta colorida na nota — 11 áreas fixas)
- **Cadernos** (agrupador clássico de notas)

E o mapa visual trata isso como **dois mapas alternativos**, via toggle no header.

Mas a verdade do produto é diferente: existe UMA hierarquia única, com **4 camadas de profundidade**, e o conceito de **Projeto** ainda nem foi implementado.

Além disso, hoje o usuário precisa decidir manualmente:
- Em qual caderno cada nota vai
- Qual a área da vida da nota
- Quais notas se conectam

Isso vai contra o princípio de "tela limpa". O **Agente Inteligente Local** vai fazer essas decisões em background.

---

## 2. A hierarquia (a árvore do produto)

```
                        MEU ESPAÇO
                            │
               ┌────────────┴────────────┐
               │      ÁREAS DA VIDA      │   (11 áreas fixas)
               └────────────┬────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
            PROJETOS              CADERNOS AVULSOS
            (opcional)             (sem projeto)
                │                       │
            CADERNOS                  NOTAS
                │
              NOTAS
```

### Cardinalidades:

| Pai | Filho | Regra |
|---|---|---|
| Área da Vida | Projetos | 0..N |
| Área da Vida | Cadernos avulsos | 0..N |
| **Projeto** | Cadernos | **1..N (projeto vazio NÃO existe no mapa)** |
| Caderno | Notas | 0..N |
| Projeto | Área da Vida | 1 (todo projeto pertence a UMA área) |
| Caderno | Projeto OU Área | exatamente um dos dois |
| Nota | Caderno | 0 ou 1 (nota órfã pode existir temporariamente — ver 3.2) |

---

## 3. Casos especiais

### 3.1 Caderno avulso

Caderno direto na área, sem projeto.

**Exemplo:** "Receitas favoritas" na área **Lar** — não faz parte de um projeto.

**Visual no mapa:** orbita a área da vida diretamente.

### 3.2 Nota órfã (sem caderno) — TEMPORÁRIA

> **Regra fundamental:** nota órfã é estado **transitório**, não estado final.

Por que existe: TDAH escreve rápido, anota sem categorizar. Forçar caderno trava o fluxo de pensamento.

**Comportamento esperado pelo usuário:**
> "Toda nota tem que encontrar seu caderno. Se uma nota estiver solta no universo Note Pulse, ela se comporta orbitando de forma sutil e fria, a órbita do núcleo, depois de todas as notas finais. Pode-se representar ela como uma bolinha levemente transparente que pulsa suavemente, percorrendo a órbita longe do núcleo. Se ela tem traços de uma nota da área da saúde, porém é uma nota vaga, solta, ela vai orbitar no círculo de saúde, depois das notas de forma profissional UI/UX."

**Tradução técnica:**

| Atributo | Comportamento |
|---|---|
| Posição | Órbita externa, depois das notas formais |
| Opacidade | ~0.5 |
| Animação | Pulso suave próprio + movimento orbital lento |
| Cor | Da área inferida (se houver) com transparência maior |
| Sem área inferida | Orbita externa do núcleo MEU ESPAÇO, em zona "limbo" |

**Por que é temporária:** o **Agente Inteligente Local** roda em background tentando vincular cada nota órfã ao caderno mais provável. Quando consegue, vincula automaticamente. Sem perguntar. Sem banner.

### 3.3 Caderno virgem (sem notas)

Pode existir. Não tem comportamento especial — orbita normalmente, só com contagem zero.

---

## 4. Agente Inteligente Local

Esta é a **peça central** do produto a partir desta spec. Tudo que conseguir ser automatizado, será.

### 4.1 Funções do agente

| # | Função | Já existe? | Algoritmo |
|---|---|---|---|
| 1 | Inferir área da vida da nota | LifeAreaSuggester (sim) | Palavras-chave por área |
| 2 | Vincular nota órfã → caderno | NÃO | Score = palavras compartilhadas + área compatível |
| 3 | Detectar conexões entre notas | NÃO (existem manuais) | Cosine similarity de bag-of-words |
| 4 | Sugerir título de nota nova | NÃO | Primeiro sintagma significativo do conteúdo |
| 5 | Agrupar cadernos em projeto | NÃO | Tema comum + frequência de cross-reference |
| 6 | Detectar duplicatas | NÃO | Similaridade > 0.85 |
| 7 | Sugerir tags / palavras-chave | NÃO | TF-IDF local |

### 4.2 Como o agente roda

- **Web Worker** (preferencial, pra não travar a UI)
- Disparado em: salvar nota, editar nota, idle do app (a cada 2-3 minutos)
- Decisões persistidas em campos derivados no estado: `inferredLifeArea`, `inferredNotebookId`, `suggestedConnections`, etc.
- Sem IA externa. Só lógica local (palavras-chave, TF-IDF, cosine similarity).

### 4.3 Regras do agente (INVIOLÁVEIS)

1. **Nunca pede permissão.** Apenas faz.
2. **Toda decisão é reversível.** Usuário pode mover, desfazer, mas não precisa decidir nada na hora da criação.
3. **Mostra o que fez de forma sutil.** Sem banner, sem modal — só o resultado visual no mapa.
4. **Confiança mínima:** se o agente não tem confiança >= 60% em uma vinculação, deixa a nota como órfã. Não chuta.
5. **Aprende com correção implícita:** se o usuário arrasta a nota X do caderno A pra B, na próxima vez sugere B.

### 4.4 Exemplo de fluxo

**Usuário escreve uma nota:**

```
"Lembrar de comprar açafrão e óleo de coco pra fazer o curry de grão de bico segunda. Tem que pegar antes do almoço."
```

**Agente, em background, detecta:**
- Área da vida: **Lar** (palavras: "comprar", "almoço", "fazer") + **Saúde** (curry, grão de bico, açafrão)
- Caderno mais provável: "Receitas" ou "Compras da semana" (se existir)
- Tags inferidas: `compras`, `receita`, `segunda-feira`
- Conexões: notas que mencionam "curry", "grão de bico" ou "compras semanais"

**Resultado para o usuário:**
- Nota aparece no caderno "Receitas" se ele existir, ou orbita a área "Lar" como órfã (até o agente identificar caderno melhor)
- No mapa, surge uma sinapse fina entre essa nota e outras receitas
- Tudo silencioso. Sem aviso. Sem modal.

**Se o usuário quiser corrigir:** arrasta a nota pra outro caderno, e o agente aprende.

---

## 5. Modelo de dados

### 5.1 Estado atual (`src/store/useStore.js`)

```js
{
  notes: [
    {
      id: 'note-uuid',
      title: '...',
      content: '...',
      lifeArea: 'saude' | ... | null,
      notebookId: 'nb-uuid' | null,
      // ...outros
    }
  ],
  notebooks: [
    {
      id: 'nb-uuid',
      title: '...',
      color: '#...',
      // ...
    }
  ]
}
```

### 5.2 Estado proposto

**Adiciona `projects`:**

```js
projects: [
  {
    id: 'proj-uuid',
    title: 'Lançar curso de neurodesign',
    description: 'Curso completo em 3 meses',
    lifeArea: 'carreira',                       // OBRIGATÓRIO
    color: '#9B5DE5',                            // herda da área ou customizado
    coverEmoji: '🚀',                            // opcional
    createdAt: '2026-05-28T10:00:00Z',
    updatedAt: '2026-05-28T10:00:00Z',
    archived: false,
  }
]
```

**Estende `notebooks`:**

```js
notebooks: [
  {
    id: 'nb-uuid',
    title: '...',
    color: '#...',
    lifeArea: 'carreira',           // NOVO: deduzido na migração
    projectId: 'proj-uuid' | null,  // NOVO: opcional (caderno avulso)
    keywords: ['react', 'frontend'], // NOVO: palavras-chave do caderno (auto + manual)
  }
]
```

**Estende `notes` (campos derivados pelo agente):**

```js
notes: [
  {
    id: 'note-uuid',
    title: '...',
    content: '...',
    lifeArea: 'saude' | null,                // mantido
    notebookId: 'nb-uuid' | null,            // mantido (null = órfã)
    // === Campos derivados pelo Agente ===
    inferredLifeArea: 'saude',               // sugerido pelo agente
    inferredNotebookId: 'nb-uuid' | null,    // sugerido pelo agente
    inferredTags: ['curry', 'compras'],      // tags automáticas
    confidenceScore: 0.78,                    // 0-1, confiança da inferência
    suggestedConnections: ['note-uuid-2'],   // sinapses sugeridas
    lastAgentRun: '2026-05-28T10:00:00Z',
  }
]
```

### 5.3 Migração dos dados existentes

Quando o app abrir após o update, fazer migração silenciosa:

1. **Para cada caderno sem `lifeArea`:**
   - Pegar todas as notas dentro
   - Contar áreas mais frequentes
   - Definir `lifeArea` do caderno como a maioria
   - Se não houver maioria clara: `'outros'`

2. **Para cada caderno: `projectId = null`** (todos viram avulsos; usuário cria projetos depois)

3. **Notas existentes:** sem mudança imediata. O agente roda numa primeira passagem completa após a migração e preenche os campos derivados.

4. **Migração roda UMA vez** — flag `np_migration_v2_done = true` em localStorage

5. **Backup automático:** antes da migração, dump do estado em `localStorage.np_backup_pre_v2`

---

## 6. Mudanças de UI

### 6.1 Home (`src/components/Home.jsx`)

**Antes:**
```
┌────────────────┐
│   Cadernos     │
└────────────────┘
```

**Depois:**
```
┌────────────────┐  ┌────────────────┐
│   Projetos     │  │   Cadernos     │
└────────────────┘  └────────────────┘
```

**Card de Projeto:** cover (emoji), título, lista mini dos primeiros 3 cadernos, borda lateral colorida (cor da área), contagem de notas.

### 6.2 Tela de Projetos (nova)

`src/components/Projects.jsx` (rota nova).

- Header: "Projetos" + botão "Novo projeto"
- Filtro por área da vida
- Lista vertical de projetos
- Click no projeto: abre o "espaço do projeto" (lista de cadernos + atalho pro mapa)

**Criar projeto:** título + área + emoji opcional. Sem caderno na criação — pode ficar vazio temporariamente, mas só aparece no mapa quando tiver caderno dentro.

### 6.3 Mapa (`src/components/ConnectionMap.jsx`)

**Toggle "Cadernos / Áreas" REMOVIDO.**

Mapa único, com **4 camadas que aparecem progressivamente conforme zoom (Level of Detail)**:

| Zoom | Camadas visíveis |
|---|---|
| Distante | Só áreas da vida |
| Médio | Áreas + projetos |
| Próximo | Áreas + projetos + cadernos |
| Muito próximo | Tudo |

**Notas órfãs:** sempre visíveis, em órbita externa, com opacidade ~0.5 e pulso suave.

**Sinapses (conexões entre notas):** **automaticamente desenhadas pelo agente** quando confidence > 0.7. Sem botão "criar conexão".

### 6.4 Editor de Nota (`src/components/Editor.jsx` + `NoteMetaBar.jsx`)

**Princípio: TELA LIMPA. Editor é texto puro.**

**O que SAI da UI:**
- Campo "Caderno" → invisível (preenchido pelo agente)
- Campo "Área da vida" → invisível (preenchido pelo agente)
- Campo "Tags" → invisível (preenchido pelo agente)
- Botão "Sugerir caderno" → SAI (automatizado)
- Botão "Conectar com outra nota" → SAI (automatizado)

**O que FICA:**
- Texto puro
- Botão de favorito (ação rápida)
- Botão de fechar/voltar
- Indicador discreto da área inferida (cor da borda esquerda, igual ao mapa)

**Como editar manualmente esses campos:** tela secundária acessível por gesto sutil (ex: long-press no indicador da área). Reservado pra correções, não pro fluxo principal.

---

## 7. Plano de PRs faseados

| # | PR | O que entrega | Tamanho |
|---|---|---|---|
| **A** | **Spec técnica** (este documento) | Doc em `docs/` + steering em `.kiro/steering/`, sem código | Pequeno |
| **B** | Modelo de dados (Projetos) | `projects: []` no store, `lifeArea` e `projectId` em cadernos, migração silenciosa, testes | Médio |
| **C** | CRUD de Projetos no store | `addProject`, `updateProject`, `deleteProject`, `archiveProject` — sem UI | Pequeno |
| **D** | Tela de Projetos | `Projects.jsx` com listagem, criação, edição | Médio |
| **E** | Bloco "Projetos" na Home | `ProjectGrid.jsx` ao lado de `NotebookGrid.jsx` | Pequeno |
| **F** | Mapa: 4 camadas + toggle removido | Layout do mapa com camada de projeto | Médio |
| **G** | Mapa: Level of Detail (zoom progressivo) | Camadas aparecem/somem conforme zoom, com fade | Médio |
| **H** | Notas órfãs no mapa | Tratamento visual especial (órbita externa, opacidade, pulso) | Pequeno |
| **I** | **Agente Inteligente — esqueleto** | Web Worker, disparo em save, campos derivados, mas só com inferência de área (já existe o LifeAreaSuggester) | Médio |
| **J** | **Agente: Detector de Caderno + Sinapses** | Vinculação automática nota → caderno (silenciosa), detecção automática de conexões | Grande |
| **K** | Editor limpo | Remove campos visuais de meta-dados do editor, só ficam por gesto sutil | Pequeno |

**Total estimado:** 8 a 12 sessões de trabalho.

---

## 8. O que NÃO está incluso nesta spec

- Mudanças visuais do "Ecossistema Vivo" do prompt do ChatGPT (raízes orgânicas, estados visuais por idade da nota, atmosfera) — **fase 5+**
- Mobile / responsividade (próxima rodada)
- Sincronização com backend (sem backend nesta fase)
- Aprendizado por correção implícita do agente (PR posterior, baseado em uso real)

---

## 9. Avisos honestos

- **Migração de dados é o ponto mais sensível.** Mitigação: backup automático antes.
- **Tempo total estimado:** 8 a 12 sessões de trabalho.
- **Cada PR mantém o app funcional.** Mesclar 1 não obriga mesclar os outros.
- **Agente Inteligente é a peça mais complexa.** PRs I e J vão precisar de cuidado extra com performance (Web Worker) e qualidade da inferência.

---

## 10. Decisões pendentes (a confirmar pelo usuário)

Marca um "X" no que aprovar, ou riscar e propor diferente:

- [ ] **Projeto sempre pertence a UMA área da vida** (sem multi-área nesta versão)
- [ ] **Projeto vazio (sem cadernos) não aparece no mapa**, mas pode existir na tela de Projetos
- [ ] **Migração silenciosa**: cadernos existentes ganham área deduzida pela maioria das notas, e `projectId = null`
- [ ] **Agente Inteligente é peça central**, roda em Web Worker, decisões reversíveis e silenciosas
- [ ] **Editor de nota fica LIMPO** (campos de meta-dados invisíveis, preenchidos pelo agente)
- [ ] **Modelo visual atual da nota (PR #19) NÃO muda** nesta spec
- [ ] **Ordem dos PRs** acima faz sentido pra você

---

## 11. Próximo passo após aprovação

Você lê este documento, edita o que quiser direto no Markdown (no GitHub, clicando no lápis), aprova mesclando o PR.

Depois eu começo o **PR B (modelo de dados)**, que é o tijolo número 1 da fundação.
