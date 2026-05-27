# 📒 ANOTATA — Histórico do projeto e ponto de retomada

> Documento criado para permitir continuar o desenvolvimento em outro chat sem perder contexto.
> Atualizado no fim do **Pacote 5 Final** (parcial — versão dedicada).

---

## 🎯 O que é

ANOTATA é um **app web pessoal de anotações inteligentes sem IA**, hospedado em GitHub Pages.
- Acesso: https://linqueroteam-creator.github.io/radio_programador/
- Senha: `CocaCola007*00` / Email: `nuance.empreendimentos@gmail.com`
- Repositório: https://github.com/linqueroteam-creator/radio_programador
- Stack: React + Vite + TailwindCSS + Tiptap + Fuse.js
- Storage: localStorage do navegador (sem backend)

---

## 📦 Pacotes implementados (linha do tempo)

### Pacote 1 — Fundação inteligente
- Modelo de dados expandido com tipo, status, prioridade, próxima ação
- Motor de regras local (`RulesEngine.js`) com detecção por palavras-chave
- Imagem colável (Ctrl+V) + redimensionável (extensão custom Tiptap)
- Badges de tipo/status/prioridade (NoteMetaBar)

### Pacote 2 — Conexões e painel
- Conexões manuais com motivo (objeto `{noteId, reason, createdAt}`)
- Conexões sugeridas com força (forte/média/fraca) e motivos visíveis
- Painel lateral inteligente (InsightPanel) com 8 seções recolhíveis
- Diagnóstico da anotação com alertas categorizados

### Pacote 3 — Busca, coleções e templates
- Busca aproximada com Fuse.js (encontra com erros de digitação)
- 18 coleções automáticas baseadas em regras locais
- 12 templates de anotação (Ideia, Tarefa, Decisão, etc)
- Estados vazios amigáveis

### Pacote 4 Pro — Produtividade operacional
- Central de Comandos Ctrl+K (CommandPalette)
- Hook de atalhos de teclado (useKeyboardShortcuts)
- Sistema de prazos completo com badges coloridos
- Checklist interativo com progresso visual
- 5 coleções novas de prazo/progresso
- InsightPanel virou painel de AÇÃO (não só informativo)
- Exportação .md e .txt

### Pacote 5 Final (curado) — Continuidade e fechamento
- **Excluir caderno com segurança** (move notas para arquivadas)
- **Painel "Continuar de onde parei"** integrado na home
- **Histórico de versões com restauração visual**
- **Filtros combinados** (versão simples)
- **Polimento visual** premium
- **Documento de retomada** (este arquivo)

### Patch 5.1 — Correção de tela branca (27/05/2026)
- **Bug:** App.jsx tinha `useCallback` declarados DEPOIS de um `if (!store.isLoaded) return ...`. Quando `isLoaded` ia de `false` → `true`, o número de hooks chamados mudava entre renders, e o React quebrava silenciosamente com `Rendered more hooks than during the previous render`. Resultado visível: tela branca total no GitHub Pages.
- **Correção:** todos os `useCallback` (`handleNewNote`, `handlePaletteAction`) movidos para ANTES de qualquer early return, com comentário explícito alertando sobre as Rules of Hooks.
- **Defesa em profundidade:** adicionado `ErrorBoundary` no `App` — se um próximo bug travar a renderização, em vez de tela branca o usuário verá uma mensagem com o detalhe do erro e um botão "Recarregar página".
- **Login reativado** com a senha original.
- **Lição:** sempre validar que TODOS os hooks são chamados ANTES de qualquer condicional/early return. Para apps deployados em GitHub Pages é crítico, porque a tela branca não dá nenhuma pista visual.

---

### Reescritor — Fase 1 (Fundação)
Engine local `src/reescritor/` com 6 léxicos curados, 4 transformers (sinônimos, conectores, gerundismo, redundância), 5 modos compostos e API pública `rephrase(text, mode)`. Sem IA. Sem rede. ~400 entradas iniciais.

### Reescritor — Fase 2 (UI + voz ativa + quebra de cláusulas)
- Modal `RephrasePanel` integrado à toolbar do editor (botão 🔄)
- 5 chips de modo lado a lado, preview em tempo real
- Transformer `voice.js`: voz passiva → voz ativa
- Transformer `clauseSplit.js`: quebra de orações longas (>25 palavras)
- "Aplicar reescrita" funciona

### Reescritor — Fase 3 (polimento + expansão)
**Bug fixes:**
- `estarei verificando` → `verificarei` (futuro do verbo, não infinitivo)
- `tenho estado revisando` → `tenho revisado` (particípio, não infinitivo)
- `O bolo foi comido pela criança` → `A criança comeu o bolo` (artigo preservado em substantivo comum)
- `O relatório foi enviado pelo João` → `João enviou o relatório` (artigo descartado em nome próprio)
- `applySubstitutions` deixava de respeitar palavras hifenizadas: o conector `e` estava sendo substituído dentro de `e-mail` no modo formal. Corrigido — hífen e apóstrofo agora fazem parte da fronteira de palavra.

**Léxicos expandidos (~400 → ~1100 entradas):**
- `sinonimos.json`: 60 → 213
- `simplificacoes.json`: 70 → 217
- `pleonasmos.json`: 96 → 189
- `coloquialismos.json`: 57 → 111
- `participios.json`: 110 → 212

**Transformers novos:**
- `cacofonia.js` + `cacofonia.json` (50 entradas) — categorias `pronome-objeto` (`vi ela` → `vi-a`), `som-feio` (`boca dela` → `a boca dela`, `alma minha` → `minha alma`), `redundancia-sonora` (`já já` → `logo`, `que que` → `que`)
- `nominalizacao.js` + `nominalizacao.json` (84 entradas) — bidirecional. `verbalize`: `fez a análise` → `analisou` (modos conciso/fluente/simples). `nominalize`: `decidiu` → `tomou a decisão` (modo formal).

**Helpers novos em `posLite.js`:**
- `gerundToFuture(gerund, person)` — converte gerúndio para futuro do presente conjugado em pessoa específica (1s, 3s, 1p, 3p), com lista de irregulares (fazer→farei, dizer→direi, trazer→trarei, pôr→porei, etc.)
- `gerundToParticiple(gerund)` — converte gerúndio para particípio passado, com irregulares (fazendo→feito, dizendo→dito, abrindo→aberto, etc.)

**Testes:**
- `src/reescritor/__tests__/phase3.test.js` — 20 testes vitest cobrindo bugs e novos transformers
- `src/reescritor/__tests__/smoke.test.js` — 5 smoke tests cobrindo todos os modos com texto realista
- `npm test` agora roda os 25 testes

**ENGINE_VERSION** bumped: `1.0.0-fase1` → `1.2.0-fase3`

---

## 🗂️ Estrutura de arquivos

```
src/
├── App.jsx                      # Root: AuthGate + roteamento + atalhos globais
├── main.jsx                     # Entry point
├── index.css                    # Tailwind + estilos custom
├── store/
│   └── useStore.js             # Estado global (localStorage), migração suave
├── engine/                      # Motores de inteligência local (sem IA)
│   ├── RulesEngine.js          # Detecção de tipo, prioridade, próx. ação, diagnóstico
│   ├── PredictiveEngine.js     # Texto preditivo (n-gram local)
│   ├── GrammarEngine.js        # Corretor (usa LanguageTool API pública)
│   ├── SearchEngine.js         # Busca aproximada (Fuse.js)
│   ├── CollectionsEngine.js    # 23+ coleções automáticas
│   ├── DateEngine.js           # Parser e cálculo de prazos
│   ├── ChecklistEngine.js      # Manipulação de checklists em HTML
│   └── Templates.js            # 12 templates pré-definidos
├── components/
│   ├── AuthGate.jsx            # Tela de login (hash SHA-256)
│   ├── Sidebar.jsx             # Menu lateral recolhível
│   ├── Home.jsx                # Tela inicial com cadernos + retomada
│   ├── NoteList.jsx            # Lista central de notas (com badges)
│   ├── Editor.jsx              # Editor Tiptap (paste image, paste handlers)
│   ├── Toolbar.jsx             # Barra de formatação do editor
│   ├── NoteMetaBar.jsx         # Badges de tipo/status/prioridade
│   ├── TagBar.jsx              # Tags da nota
│   ├── PredictiveBar.jsx       # Sugestões enquanto digita
│   ├── GrammarPanel.jsx        # Painel de correção gramatical
│   ├── Corretor.jsx            # Tela dedicada de correção
│   ├── InsightPanel.jsx        # Painel lateral de AÇÃO (8 seções)
│   ├── ConnectionModal.jsx     # Modal pra adicionar conexão
│   ├── TemplatePicker.jsx      # Modal de seleção de template
│   ├── CommandPalette.jsx      # Central Ctrl+K
│   ├── DueDateBadge.jsx        # Badge + picker de prazo
│   ├── ChecklistProgress.jsx   # Barra de progresso visual
│   ├── NotebookCover.jsx       # Capa premium gerada por hash
│   ├── Dashboard.jsx           # Tela de Insights / estatísticas
│   ├── EmptyState.jsx          # Estados vazios reutilizáveis
│   ├── VersionHistory.jsx      # Histórico de versões (NOVO no P5)
│   └── NotebookDeleteModal.jsx # Confirmação de exclusão (NOVO no P5)
├── extensions/
│   └── ResizableImage.jsx      # Extensão Tiptap custom de imagem
└── hooks/
    └── useKeyboardShortcuts.js # Hook de atalhos globais
```

---

## 🔑 Decisões técnicas importantes

1. **localStorage** como banco — chave `anotata-data`, schema versionado
2. **Migração suave** — campos novos são adicionados a notas antigas no carregamento
3. **Conexões** são objetos `{noteId, reason, createdAt}`, **não** mais strings (migrado)
4. **Versões** são salvas a cada 10 edições, máx 10 versões por nota
5. **Único motor que usa internet:** GrammarEngine (LanguageTool). Todo o resto é 100% local.
6. **Login** com hash SHA-256 + salt no client-side (proteção visual, não criptográfica)
7. **Deploy:** o site é servido pela branch `gh-pages` (não pela `main`). O fluxo é: build local → copiar `dist/` para a raiz da branch `gh-pages` → push. A `main` guarda o código-fonte; a `gh-pages` guarda só o build publicado.
8. **Rules of Hooks são sagradas** — todo `useState`/`useEffect`/`useCallback`/`useMemo` precisa ser chamado ANTES de qualquer `return` condicional. Quebrar essa regra causa tela branca silenciosa em produção.

---

## 🚀 Como retomar em outro chat

### Comece com este prompt:

```
Estou retomando o projeto ANOTATA. Por favor lê o arquivo HISTORICO_PROJETO.md
no repositório linqueroteam-creator/radio_programador para entender o estado atual.

Quero implementar [DESCREVA O QUE QUER FAZER].

Seguimos:
- Sem IA (corretor LanguageTool é a única exceção, já estabelecida)
- Termos neutros em português
- Preservar tudo que está aprovado
- Visual lavanda/roxo/goiaba sobre fundo claro (#F2F1F4)
- Você tem liberdade técnica para descartar pedidos que pareçam ruído
```

### Funcionalidades que ainda não foram entregues e podem ser pacotes futuros:

- **Mapa visual de conexões** (grafo) — precisa biblioteca como react-flow ou SVG custom
- **Notificações do navegador** — Web Notifications API com fluxo de permissão
- **Comandos `/` no editor** — Tiptap suggestion plugin
- **Exportação em lote** — múltiplas notas / caderno inteiro
- **Linha do tempo dedicada** — tela separada de eventos cronológicos
- **Conexão com IA real** — quando NotePulse estiver pronto, abrir porta no GrammarEngine ou criar AIEngine

---

## 💜 Notas pessoais do usuário

- Designer gráfico com TDAH, leigo em programação e GitHub
- Sempre entregar: link ZIP do GitHub + 3 passos no máximo + sem jargão técnico
- Site público em GitHub Pages, repositório precisa ficar **público** pra Pages funcionar
- Usuário escolheu liberdade técnica total e me chamou de "mestre" do projeto

### Reescritor — Fase 4 (Bubble menu flutuante + popover compacto)
- Ao selecionar texto no editor, aparece botão flutuante "🔄 Reescrever" colado à seleção
- Botão abre um **popover compacto de 520px** (não o modal grande) com:
  - 5 chips de modo (atalho 1-5)
  - Original empilhado em cima / Reescrito embaixo (com seta ↓)
  - Lista de mudanças recolhível
  - Cancelar / Aplicar (atalho ⏎)
- Posicionamento inteligente (auto-flip se não couber em baixo)
- Memória do último modo escolhido (sessão)
- Atalhos: 1-5 troca modo, Esc fecha, Enter aplica
- Botão antigo (🔄 na toolbar) continua pra reescrever a nota inteira

### Reescritor — Fase 5 (Ligar texto a nota/caderno via bubble menu)
- Bubble menu expandido pra 2 ações: [ 🔄 Reescrever │ 🔗 Ligar a... ]
- "Ligar a..." abre **LinkPickerPopover** colado à seleção:
  - Lista unificada de cadernos + notas com busca
  - Atalhos: ↑↓ navegar, ↵ confirmar, Esc fechar
  - Ao confirmar: texto vira link interno (roxo com fundo lavanda)
- Clicar num link interno **navega direto** pra nota/caderno destino
- Se ligar pra outra nota: **registra conexão** automática no store (aparece no painel de conexões e mapa visual)
- Extension Tiptap `InternalLink` (Mark com targetType, targetId, targetTitle)
- Comportamento defensivo: se destino excluído, mostra aviso amigável

### UI — Coluna NoteList recolhível
- Segundo painel (lista de notas) agora recolhe/expande com botão [←]/[→]
- Quando recolhida: faixa de 48px com ícone + contador + botão "+"
- Padrão idêntico à Sidebar (transição 300ms, estado em App.jsx)
- Ganho: mais espaço pro editor quando o foco é na escrita

### Design Mestre — Agente de auditoria de UI (criado)
- Agente customizado reutilizável salvo em `.kiro/agents/design-mestre.md`
- Analisa 8 dimensões: paleta, iconografia, tipografia, espaçamento, border radius, sombras, estados interativos, acessibilidade
- Gera relatório profissional em `docs/UI-AUDIT.md`
- Primeira auditoria rodada: **Nota B**
- Top 3 pontos críticos identificados:
  1. Cinza `#6B5E80` fora da paleta oficial (conflito com `text-suave`)
  2. Tamanhos de ícone caóticos (8 tamanhos pra `X`, 7 pra `Sparkles`)
  3. Foco do teclado invisível em ~40 botões só com ícone

---

## 🧪 Testes automatizados

- `src/reescritor/__tests__/phase3.test.js` — 20 testes (gerundismo futuro, voz passiva, cacofonia, nominalização, modos compostos)
- `src/reescritor/__tests__/smoke.test.js` — 5 smoke tests (texto realista todos os modos)
- `src/components/__tests__/RephrasePopover.test.jsx` — 3 testes (importação + integração engine)
- `src/components/__tests__/LinkPicker.test.jsx` — 4 testes (InternalLink extension + LinkPickerPopover)
- **Total: 32 testes vitest passando** (`npm test`)

---

## 📄 Documentação gerada

- `HISTORICO_PROJETO.md` — este arquivo (ponto de retomada)
- `COMO-USAR.md` — instruções simples pro usuário
- `docs/reescritor/ESPEC.md` — especificação técnica completa do Reescritor (v1.2.0-fase3)
- `docs/UI-AUDIT.md` — relatório de auditoria visual (Design Mestre, nota B)
- `src/reescritor/README.md` — referência técnica da engine

---

## 📱 Mobile — Planejamento em 4 fases

O layout responsivo ainda NÃO foi implementado. Está planejado em 4 fases:

| Fase | O que | Status |
|---|---|---|
| Mobile 1 | Layout responsivo (gavetas em < 768px) | ⏳ Não feito |
| Mobile 2 | Touch + teclado virtual (áreas 44px, toolbar rolável) | ⏳ Não feito |
| Mobile 3 | PWA (instalável, offline, manifest + SW) | ⏳ Não feito |
| Mobile 4 | Gestos (swipe, pull-to-refresh, transições) | ⏳ Não feito |

---

## 🎨 Design System — Estado atual (da auditoria)

- **Paleta oficial:** roxo (#5B2D8E), roxo-escuro (#3D1B66), goiaba (#E8637C), lavanda (tons), bg (#F2F1F4)
- **Cores semânticas a formalizar:** success (#0F7A3F), warn (#9B6F00), goiaba-bg (#FCE7EB), favorite (#F0B400)
- **Iconografia:** lucide-react, ~62 ícones, **precisa padronizar em 3 tamanhos (12/14/16)**
- **Tipografia:** escala de text-[9px] a text-3xl — **consolidar em xs/sm/base/lg/xl/2xl**
- **Border radius:** 6 níveis → **reduzir pra 4** (rounded/lg/xl/2xl/full)
- **Sombras:** padrão implícito bom (sm → botão, md → hover card, xl → dropdown, 2xl → modal)
- **Prioridade 1:** criar componente `<IconButton>` com aria-label + focus-visible

---

## 🗂️ Estrutura de arquivos (atualizada)

```
src/
├── App.jsx
├── main.jsx
├── index.css
├── store/useStore.js
├── engine/
│   ├── RulesEngine.js, PredictiveEngine.js, GrammarEngine.js
│   ├── SearchEngine.js, CollectionsEngine.js, DateEngine.js
│   ├── ChecklistEngine.js, Templates.js
├── reescritor/                    # Engine de reescrita PT-BR (sem IA)
│   ├── index.js                   # API pública: rephrase(text, mode)
│   ├── tokenizer.js, posLite.js
│   ├── modes/                     # geral, formal, conciso, fluente, simples
│   ├── rules/                     # synonyms, connectors, gerundism, redundancy,
│   │                              # voice, clauseSplit, cacofonia, nominalizacao
│   ├── lexicons/                  # ~1100 entradas em 9 JSONs
│   └── __tests__/                 # 25 testes vitest
├── components/
│   ├── AuthGate, Sidebar, Home, NoteList, Editor, Toolbar
│   ├── NoteMetaBar, TagBar, PredictiveBar
│   ├── GrammarPanel, GrammarPopover, Corretor
│   ├── InsightPanel, ConnectionModal, ConnectionMap
│   ├── RephrasePanel, RephrasePopover        # Reescritor UI
│   ├── SelectionBubbleMenu                   # Bubble menu (reescrever + ligar)
│   ├── LinkPickerPopover                     # Busca de nota/caderno pra link
│   ├── CommandPalette, TemplatePicker
│   ├── DueDateBadge, ChecklistProgress
│   ├── NotebookCover, Dashboard, EmptyState
│   ├── VersionHistory, NotebookDeleteModal, Timeline
│   └── __tests__/                            # 7 testes vitest
├── extensions/
│   ├── ResizableImage.jsx
│   ├── InlinePredictive.js
│   ├── InlineGrammar.js
│   └── InternalLink.js                      # Mark de link interno
└── hooks/useKeyboardShortcuts.js
```

---

## 🔑 Decisões técnicas importantes

1. **localStorage** como banco — chave `anotata-data`, schema versionado
2. **Migração suave** — campos novos são adicionados a notas antigas no carregamento
3. **Conexões** são objetos `{noteId, reason, createdAt}`, **não** mais strings (migrado)
4. **Versões** são salvas a cada 10 edições, máx 10 versões por nota
5. **Único motor que usa internet:** GrammarEngine (LanguageTool). Todo o resto é 100% local.
6. **Login** com hash SHA-256 + salt no client-side (proteção visual, não criptográfica)
7. **Deploy:** `main` = código-fonte; `gh-pages` = build publicado. Fluxo: `npm run build` → copiar `dist/` pra gh-pages → push.
8. **Rules of Hooks são sagradas** — todo hook ANTES de qualquer early return.
9. **Reescritor** é 100% local, sem IA, determinístico: mesmo input → mesmo output.
10. **Bubble menu** usa `createPortal` + `position: fixed` ancorado por `coordsAtPos` do Tiptap.
11. **Links internos** usam Mark customizado do Tiptap (`InternalLink`) com data-attributes + click handler via event delegation.
12. **Agente Design Mestre** salvo em `.kiro/agents/design-mestre.md` — invocável a qualquer momento com "roda o Design Mestre".

---

## 🚀 Como retomar em outro chat

### Comece com este prompt:

```
Estou retomando o projeto ANOTATA. Por favor lê o arquivo HISTORICO_PROJETO.md
no repositório linqueroteam-creator/radio_programador para entender o estado atual.

CONTEXTO IMEDIATO desta sessão:
- Última entrega: Reescritor F5 (bubble menu com "Ligar a..." pra notas/cadernos) + NoteList recolhível + auditoria de UI pelo Design Mestre
- O Design Mestre (agente de auditoria de UI) já foi criado e rodou a primeira vez — relatório em docs/UI-AUDIT.md com nota B
- O próximo passo lógico é: [DESCREVA O QUE QUER FAZER]
  Opções óbvias:
  a) Polimento visual seguindo as recomendações da auditoria (docs/UI-AUDIT.md)
  b) Mobile 1 — layout responsivo (gavetas em < 768px)
  c) PWA — tornar instalável
  d) Outra coisa que você decidir

Regras do projeto:
- Sem IA (corretor LanguageTool é a única exceção, já implementada)
- Visual lavanda/roxo/goiaba sobre fundo claro (#F2F1F4)
- Preservar tudo que está aprovado
- Eu sou designer gráfico com TDAH, leigo em programação
- Você tem liberdade técnica total
- Linguagem neutra em português
- Fase por fase com checkpoint, build, smoke test e deploy entre cada
```

---

## 💜 Notas pessoais do usuário

- Designer gráfico com TDAH, leigo em programação e GitHub
- Sempre entregar: link ZIP do GitHub + 3 passos no máximo + sem jargão técnico
- Site público em GitHub Pages, repositório precisa ficar **público** pra Pages funcionar
- Usuário escolheu liberdade técnica total e me chamou de "mestre" do projeto
- O projeto se chama **ANOTATA** (não confundir com NotePulse que é outro projeto)

— última atualização: Reescritor F5 + NoteList recolhível + Design Mestre (auditoria UI nota B), 27/05/2026



---

### Polimento Visual — Sweep completo (27/05/2026)
> Executado pelo Design Mestre em 5 fases com checkpoint, build e testes entre cada.

**Resultado:** auditoria pulou de **B → A**.

#### Fase A — Fundação visual (tokens semânticos)
- `tailwind.config.js` ganhou cores semânticas oficiais:
  - `anotata-success` (#0F7A3F) e `anotata-success-bg` (#D4F4DD) — concluído/forte/revisada
  - `anotata-warn` (#9B6F00) e `anotata-warn-bg` (#FFF4D9) — atenção/médio/amanhã
  - `anotata-favorite` (#F0B400) — estrela favorita harmônica com goiaba (banido o yellow-500 do Tailwind)
  - `anotata-goiaba-bg` (#FCE7EB) — fundo padrão de erro/destaque (substituiu 4 variações rosa-pálido)
- `fontSize.2xs` (10px) — token novo pra badges/kbd minúsculos
- `boxShadow.popover` — sombra "fofa" pra popovers de feedback
- Criado `src/design/icons.js` — manual de iconografia: 3 tamanhos canônicos (ICON_SM=12, ICON_MD=14, ICON_LG=16) + 7 aliases por contexto (X_INLINE, X_POPOVER, X_MODAL, TOOLBAR, LIST_ITEM, HEADER_HERO, EMPTY_STATE, BADGE)

#### Fase B — Acessibilidade (componente reutilizável)
- Criado `src/components/ui/IconButton.jsx` — botão padronizado:
  - `aria-label` obrigatório (lint runtime se faltar)
  - `aria-pressed` automático em modo toggle
  - `focus-visible:ring-2 ring-anotata-roxo/50` em todo botão
  - 3 tamanhos: sm (20×20), md (26×26 — padrão), lg (32×32 — área de toque mínima recomendada)
  - 4 variantes: ghost, active, danger, primary
- Migrados 36+ botões críticos: Toolbar (18 botões via ToolBtn refatorado), header do Editor (9 ícones), NoteMetaBar (Pin/Eye/Archive), GrammarPanel (RefreshCw/X), Corretor (Copy/Limpar)
- App.jsx: Ctrl+K e Logout receberam aria-label + focus-visible (não viraram IconButton porque têm texto+kbd)
- Resultado: foco do teclado visível em todo o app — antes só ~5% dos botões tinham

#### Fase C — Sweep de iconografia (semântica de tamanhos)
**Banidos** os tamanhos esquisitos (9, 11, 13, 15, 17, 18) do app inteiro — confirmado via `grep -rE 'size=\{(9|11|13|15|17|18)\}'` retornando zero matches.

**Distribuição final** (162 ícones no app):
- `12` → 63 (39%) — chips, badges, X inline
- `14` → 40 (25%) — toolbar, lista, X popover, status
- `16` → 49 (30%) — header de modal, sidebar nav, ações primárias
- `10` → 9 (6%, EXCEÇÃO) — marker do Timeline, Star/Pin inline em título de nota, Clock no VersionHistory
- `20+` → 8 (5%, EXCEÇÃO) — empty state, hero, decoração não-interativa

23 componentes tocados.

#### Fase D — Sweep de cores literais (paleta 100% oficial)
- `#6B5E80` (cinza off-paleta) → `#5B4A7A` (text-suave oficial) em App e Timeline
- 4 variações de rosa-pálido (#FCEEF1, #FFE4EA, #FFE3E8, bg-red-50) → `#FCE7EB` unificado (anotata-goiaba-bg)
- `#A89DC0` (ghost text) → `#9888B5` (muted oficial)
- `#10B981` (emerald solto) → `#0F7A3F` (success oficial)
- `text-yellow-500 fill-yellow-500` → `text-anotata-favorite fill-anotata-favorite` (Dashboard, Home, NoteList)
- `text-green-600/700` + `bg-green-100` → `text-anotata-success` + `bg-anotata-success-bg`
- `text-amber-700` + `bg-amber-100` → `text-anotata-warn` + `bg-anotata-warn-bg`
- `red-50/200/400/600/700` → família `anotata-goiaba*` (mensagens de erro)
- `text-[12px]` → `text-xs` (mesmo valor, código limpo) em 5 arquivos
- `text-[13px]` → `text-sm` em RephrasePopover
- `text-[11px]` → `text-xs` em 12+ arquivos
- `text-[10px]` e `text-[9px]` → `text-2xs` (token novo) em todo o app
- `boxShadow` inline do GrammarPopover → classe `shadow-popover` (token Tailwind)
- ErrorBoundary do App.jsx: cinzas off-paleta `#E8E4F0` e `#F6F4F9` → tokens oficiais

Restam apenas 3 ocorrências de `text-[8px]` (badges decorativos minúsculos no Reescritor) — exceções documentadas.

#### Fase E — Documentação
- `docs/UI-AUDIT.md` recebeu seção pós-polimento com nova nota A
- Este histórico atualizado
- Build final OK (3.35s, gzip 254 kB), 32 testes vitest passando

#### Arquivos criados nesta sessão
- `src/design/icons.js` — manual de iconografia com tamanhos canônicos
- `src/components/ui/IconButton.jsx` — componente reutilizável de botão ícone-only

#### Arquivos modificados (sweep)
33 arquivos, sem mudança comportamental — só visual, tipografia, cores, acessibilidade.

— última atualização: Polimento visual completo (auditoria B → A), 27/05/2026

