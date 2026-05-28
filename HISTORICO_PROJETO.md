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



---

### Mobile 1 — Layout responsivo (27/05/2026)
> Implementado em 5 fases pelo Design Mestre, sem quebrar nada do desktop.

**Resultado:** ANOTATA agora é **usável em celular**. Telas < 768px ganham layout de gavetas; ≥ 768px continua idêntico ao desktop original.

#### Fase A — Fundação
- `src/hooks/useIsMobile.js` — hook reativo de viewport (debounce via rAF, breakpoint configurável, default 768px)
- `App.jsx`: estado `sidebarOpenMobile` e `noteListOpenMobile` separados dos `*Collapsed` do desktop
- Travamento de scroll do body quando uma gaveta está aberta (evita rolagem dupla atrás do drawer)
- Auto-fecha gavetas ao trocar de view ou selecionar nota (UX: usuário clicou pra ir pra algum lugar, deixe ele ver)
- Tecla Esc fecha gaveta (após modais maiores na ordem de prioridade)
- Botões fixos do rodapé (Ctrl+K, Logout) escondidos em mobile — Ctrl+K não faz sentido sem teclado, e Logout migrou para o rodapé da Sidebar (drawer)

#### Fase B — Sidebar como gaveta
- Em mobile: `position: fixed`, `w-72 max-w-[85vw]`, `translate-x` controlando aberto/fechado, transição 300ms ease-in-out
- Backdrop preto translúcido `bg-black/40` com fade
- Header da gaveta: botão X (mobile) ↔ ChevronLeft (desktop)
- Rodapé extra com "Central de comandos" e "Sair" (só em mobile)
- Conteúdo expandido extraído em sub-componente `<ExpandedSidebar>` reaproveitado entre desktop expandido e mobile

#### Fase C — NoteList como gaveta
- Mesma técnica da Sidebar: drawer da esquerda em mobile, layout intacto em desktop
- Header da gaveta com botão X de fechar + botão "+" de criar nota
- 3 modos coexistindo: collapsed (faixa de 48px), expanded (320px), mobile (drawer 80% da tela)
- Auto-fecha quando usuário seleciona uma nota (foco no editor)

#### Fase D — Editor adapta header
- 2 botões hambúrguer só em mobile (Menu = abrir Sidebar, FileText = abrir NoteList)
- Padding reduzido em mobile: `px-3 py-3` vs `px-6 py-4` desktop
- Título da nota: `text-xl` em mobile, `text-2xl` em desktop
- 5 botões da toolbar do header escondidos em mobile (Imagem, Conexão, Mapa, Painel diagnóstico, IA) — `hidden sm:inline-flex`. Em telas pequenas só aparecem os essenciais: Reescrever, Gramática, Favoritar, Excluir
- Empty state ("Selecione uma nota") com mesmos botões hambúrguer flutuantes + texto adaptado

#### Fase E — Telas globais responsivas
- **Home**: `px-4 sm:px-6 lg:px-8`, greeting em coluna no mobile, stats em grid 2x2 no mobile, grid de cadernos `minmax(160px, 1fr)` (era 200), botão hambúrguer flutuante no canto, NotebookCard sem width fixo (aspect-ratio em vez de pixels), texto auxiliar escondido em mobile (`hidden sm:block`)
- **Dashboard**: padding adaptado, botão hambúrguer no header gradient, grid de stats já era `grid-cols-2 md:grid-cols-4`
- **Corretor**: 2 colunas viram empilhadas em mobile (`flex-col md:flex-row`), coluna de sugestões com `max-h-[50vh]` em mobile
- **Timeline**: botão hambúrguer no header
- **Modais grandes**: já usavam `max-w-*` + `w-full` + `p-4` no overlay → responsivos por design, sem mudança

#### Arquivos novos
- `src/hooks/useIsMobile.js`

#### Arquivos modificados
- `src/App.jsx` — orquestração mobile + estados de gaveta
- `src/components/Sidebar.jsx` — modo drawer
- `src/components/NoteList.jsx` — modo drawer
- `src/components/Editor.jsx` — botões hambúrguer + paddings adaptativos
- `src/components/Home.jsx` — layout responsivo
- `src/components/Dashboard.jsx` — header mobile
- `src/components/Corretor.jsx` — colunas empilhadas
- `src/components/Timeline.jsx` — header mobile

#### Tests
32 testes vitest passando. Build OK 3.2s. Sem mudança comportamental em desktop.

— última atualização: Mobile 1 (layout responsivo), 27/05/2026



---

### Mobile 2 + 3 + Polimento de modais (27/05/2026)
> Pacote completo: touch confortável, app instalável, modais que cabem no celular.

#### Mobile 2 — Touch + teclado virtual
**CSS global (`src/index.css` + `index.html`):**
- `viewport-fit=cover` + paddings `env(safe-area-inset-*)` no body — respeita o notch e a barra de gestos do iPhone (PWA standalone)
- `100dvh` (com fallback `100vh`) — altura ajusta quando o teclado virtual abre/fecha
- `-webkit-tap-highlight-color: transparent` — tira o cinza-azulado do toque
- `touch-action: manipulation` — desativa double-tap zoom acidental (mantém pinch-zoom)
- `font-size: 16px` em inputs/textarea em mobile — evita auto-zoom do iOS quando foca campo
- ProseMirror em mobile: padding 1rem em vez de 2rem (mais largura útil)

**IconButton** ganhou `data-touch="true"`:
- Em mobile (CSS: `@media (max-width: 767px)`), botões com esse atributo viram `min-width: 44px; min-height: 44px` — mínimo recomendado pelas WCAG e pela Apple HIG
- Em desktop: tamanho compacto via padding (sm/md/lg) como antes

**Toolbar do editor** ganhou `data-toolbar="true"`:
- Em mobile: `flex-wrap: nowrap` + `overflow-x: auto` + `-webkit-overflow-scrolling: touch` — os 18 botões rolam horizontalmente em vez de quebrar em 2 linhas (que rouba altura útil)
- Scrollbar fina (3px) só aparece em mobile

#### Mobile 3 — PWA (instalável no celular, funciona offline)
**Arquivos novos:**
- `public/icon.svg` — ícone mestre 512×512, gradiente roxo + caderno + estrela goiaba
- `public/manifest.webmanifest` — declaração PWA: nome, ícones, tema #5B2D8E, display standalone, orientation any, lang pt-BR
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` — gerados a partir do SVG via `scripts/gen-icons.mjs` (sharp). O maskable tem 56px de padding pra Android cortar em adaptive icon sem comer o desenho
- `public/sw.js` — Service Worker com estratégia híbrida:
  - **Cache-first** pros bundles em `/assets/` (nome com hash, sempre seguro)
  - **Network-first** pra navegação (HTML) com fallback ao cache
  - **Cross-origin** passa direto sem cachear (LanguageTool não polui o cache)
  - 2 caches versionados: `anotata-v1-shell` e `anotata-v1-assets`
  - Limpa caches antigos no activate
- `scripts/gen-icons.mjs` — script Node que regenera os PNGs a partir do SVG. Roda manual quando o ícone mudar

**index.html ganhou:**
- `<meta theme-color="#5B2D8E">` — barra do navegador roxa
- `<meta apple-mobile-web-app-capable>` + status-bar-style + title — iOS instala como app sem barra
- `<link rel="manifest" href="./manifest.webmanifest">`
- `<link rel="apple-touch-icon" href="./icon-192.png">`
- description meta pra SEO

**main.jsx registra o SW**:
- Só em produção (`import.meta.env.PROD`)
- No `window.load` pra não competir com a primeira renderização
- Falha graciosamente se o registro der erro (não trava o app)

#### Polimento de modais mobile
- **RephrasePanel**: as 2 colunas Original/Reescrito empilham em mobile (`flex-col md:flex-row`), border-r vira border-b. Adicionado `max-h-[88vh]` pra encolher quando o teclado abrir
- **ConnectionMap**: idem `max-h-[90vh]`
- **CommandPalette**: `pt-[15vh]` (15% do topo) → `pt-[8vh] sm:pt-[15vh]` em mobile (modal mais perto do topo, sobra altura útil)

#### Como o usuário instala como app
**Android (Chrome):**
1. Abre o site → aparece banner "Instalar ANOTATA?"
2. Confirma → ícone vai pra tela inicial
3. Toca → abre como app fullscreen (sem barra do navegador)

**iPhone (Safari):**
1. Abre o site
2. Toca no botão Compartilhar → "Adicionar à Tela de Início"
3. Confirma → ícone na home screen

#### Tests
32 testes vitest passando. Build OK 3.11s. Zero mudança comportamental em desktop.

#### Arquivos novos
- `public/icon.svg`
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`
- `public/manifest.webmanifest`
- `public/sw.js`
- `scripts/gen-icons.mjs`

#### Arquivos modificados
- `index.html` (meta tags PWA + viewport-fit)
- `src/index.css` (safe-area + 100dvh + 16px inputs + data-touch + data-toolbar)
- `src/main.jsx` (registra service worker)
- `src/components/ui/IconButton.jsx` (data-touch="true")
- `src/components/Toolbar.jsx` (data-toolbar="true" + scroll horizontal)
- `src/components/RephrasePanel.jsx` (colunas empilhadas em mobile)
- `src/components/ConnectionMap.jsx` (max-h responsivo)
- `src/components/CommandPalette.jsx` (pt menor em mobile)

— última atualização: Mobile 2 + PWA + polimento de modais, 27/05/2026



---

### Pacote Quatro-em-Um: Slash + Notificações + Exportação em lote + Gestos Mobile (28/05/2026)
> Quatro funcionalidades novas entregues juntas, em fases com checkpoint, build e teste entre cada.

**Resultado:** ANOTATA ganhou comandos rápidos no editor, lembretes do navegador, backup em ZIP e gestos mobile completos. Total **44 testes vitest passando** (12 novos do encoder ZIP).

#### Pacote E — Comandos `/` no editor

Digitar `/` em qualquer parágrafo abre um popover flutuante com 13 comandos:
- Cabeçalho 1/2/3, Texto normal
- Lista, Lista numerada, Lista de tarefas
- Citação, Bloco de código, Divisor
- Data de hoje, Data e hora
- Inserir imagem (abre seletor de arquivo)

**Implementação:**
- `src/extensions/SlashCommand.js` — Plugin do ProseMirror (sem dependência `@tiptap/suggestion`). Mantém um state interno `{active, query, range}` e dispara callback `onChange` toda vez que o usuário digita ou apaga.
- `src/components/SlashMenu.jsx` — Popover renderizado via `createPortal`, posicionado por `editor.view.coordsAtPos(range.from)`. Auto-flip vertical, navegação por setas/Enter/Tab/Esc, busca por keywords PT-BR.
- Cada comando executa `editor.chain().focus().deleteRange(range).[ação]().run()` — apaga o "/foo" digitado e aplica o comando do Tiptap.
- Editor.jsx ganhou `slashState` + `slashKeyHandlerRef` (ANTES de qualquer early return — Rules of Hooks).

#### Pacote B — Notificações de prazo (Web Notifications API)

Sino 🔔 no topo da Sidebar (visível tanto expandida quanto recolhida). Badge numérico mostra quantos prazos urgentes existem (vencidos / hoje / amanhã), com cor por severidade. Clicar abre popover com:
- Status da permissão (concedida / negada / não suportado)
- Toggle "Ativar / Desativar lembretes"
- Botão "Tocar agora" (notificação de teste)
- Lista de prazos próximos (clicáveis → abrem a nota)

**Comportamento:**
- Permissão real (`Notification.requestPermission`) só é pedida quando o usuário clica em "Ativar" pela primeira vez (gesto do usuário — exigência dos browsers).
- Verifica prazos a cada 5 minutos + sempre que a aba fica invisível (`visibilitychange`).
- **Não notifica** quando a aba está visível e em foco — UX: o usuário já está vendo o app.
- Dedup por `noteId-status-yyyymmdd` em `store.settings.notifications.lastNotifiedKeys` (auto-cleanup das chaves > 7 dias).
- Click na notificação foca a aba e abre a nota correspondente.

**Arquivos novos:**
- `src/hooks/useDueDateReminders.js` (~180 linhas) — hook com `requestNotificationPermission`, `fireNotification`, `fireTestNotification`, e o hook principal com checagem periódica + visibilitychange.
- `src/components/NotificationsBell.jsx` (~250 linhas) — botão do sino + popover via portal.

**Arquivos modificados:**
- `src/store/useStore.js` — campo `settings.notifications` com migração suave (`migrateSettings`), 3 setters: `setNotificationsEnabled`, `recordNotificationKey`, `clearNotificationKeys`.
- `src/components/Sidebar.jsx` — sino no header expandido + entre Menu e nav no recolhido.
- `src/App.jsx` — chama `useDueDateReminders(...)` (ANTES de qualquer early return) + `handleOpenNoteFromReminder`.

#### Pacote C — Exportação em lote (ZIP nativo, sem dependências)

Cada caderno na home ganhou opção "Exportar caderno..." no menu de "...". O cabeçalho da Home tem botão "Exportar tudo" (todas as notas do app). A Central de Comandos (`Ctrl+K`) tem entrada pra cada caderno + uma genérica.

**Modal de exportação** oferece escolha de:
- **Escopo:** todas as notas ou só favoritas
- **Formato:** `.md` (Markdown), `.txt` (texto puro), ou os dois
- Resumo prévio com contagem de notas e palavras
- Estado de "Gerando..." → "Pronto ✓" pra evitar duplo-clique

**O ZIP gerado contém:**
- Cada nota como arquivo separado, nome derivado do título (sanitizado, com unicidade `(2)`, `(3)`...)
- Markdown com cabeçalho de metadados (tipo, status, prioridade, tags, prazo, datas)
- Um `LEIA-ME.md` explicando o pacote, com lista numerada de todas as notas

**Encoder ZIP do zero (~280 linhas):**
- `src/engine/ZipEncoder.js` — encoder STORE (sem compressão DEFLATE), CRC32 com tabela pré-computada, suporte UTF-8 nativo (general purpose flag bit 11), datetime DOS, helpers `safeFilename` e `uniqueNames`.
- Por que não usar JSZip? Texto markdown comprime mal mesmo com DEFLATE, e a engine do ANOTATA tem policy de zero dependências externas pra funcionalidade local. STORE serve perfeitamente e o código é auditável.

**Testes:**
- `src/engine/__tests__/ZipEncoder.test.js` — 12 testes cobrindo: assinaturas válidas (PK\3\4, PK\1\2, PK\5\6), múltiplos arquivos com nomes UTF-8 e emojis, validação de erros, sanitização de nomes (caracteres proibidos, limite 80 chars, fallback de vazio), unicidade com sufixos numerados.

**Arquivos novos:**
- `src/engine/ZipEncoder.js`
- `src/engine/__tests__/ZipEncoder.test.js`
- `src/components/ExportNotebookModal.jsx`

**Arquivos modificados:**
- `src/components/Home.jsx` — botão "Exportar tudo" no header + opção "Exportar caderno..." no menu "..." de cada NotebookCard + state `notebookToExport`.
- `src/components/CommandPalette.jsx` — comando `export-all-zip` + um por caderno (`export-notebook:{id}`).
- `src/App.jsx` — `exportTarget` state + handlers no `handlePaletteAction`.

#### Pacote D — Mobile 4: Gestos

Dois gestos novos, ambos nativos no mobile:

**1. Edge swipe da borda esquerda → abre Sidebar**
- Arraste o dedo de fora pra dentro a partir do canto esquerdo da tela (zona de 24px) → a Sidebar desliza como gaveta.
- Cancela automaticamente se houver muito movimento vertical (sinal de scroll, não swipe).
- Cancela se o gesto durar mais de 700ms.

**2. Swipe nos cards de nota**
- Arrastar o card pra **esquerda** (≥ 180px) → arquiva a nota (ou desarquiva se já estiver arquivada).
- Arrastar o card pra **direita** (≥ 80px) → favorita/desfavorita.
- Background revelado durante o gesto: goiaba com ícone de Arquivo à esquerda, dourado com Estrela à direita.
- Resistência elástica nos extremos (sensação de borracha).
- Ao soltar antes do gatilho, snap-back animado.
- Após arquivar, o card sai voando pra fora da tela (animação de 220ms).

**Por que cada um vive em seu hook:**
- Edge swipe é GLOBAL — listener em `document`. Útil em qualquer tela mobile.
- Card swipe é LOCAL — listener no elemento específico. Cada card tem seu próprio estado de gesto, sem interferência entre cards.

**Detecção de scroll vs swipe:**
- O hook `useSwipeableCard` trava a direção dominante no início do gesto. Se ady > adx + dead-zone, abandona o gesto (deixa o scroll vertical acontecer normal).
- Quando trava em horizontal, `preventDefault()` no `touchmove` (listener não-passivo) impede a página de rolar enquanto o card desliza.

**Arquivos novos:**
- `src/hooks/useEdgeSwipe.js` (~85 linhas)
- `src/hooks/useSwipeableCard.js` (~170 linhas)

**Arquivos modificados:**
- `src/App.jsx` — chama `useEdgeSwipe` (apenas em mobile e quando nenhuma gaveta está aberta).
- `src/components/NoteList.jsx` — `NoteCard` virou wrapper com 2 camadas: background revelado + card que move via `translateX`. `touchAction: pan-y` permite rolagem vertical normal mas reserva horizontal pro nosso gesto.

#### Tests
- 32 testes antigos (Reescritor F3, smoke, RephrasePopover, LinkPicker)
- 12 testes novos (ZipEncoder)
- **Total: 44 testes vitest passando** (`npm test`)

#### Build final
- 912 KB / 268 KB gzip (CSS 43 KB / 8 KB gzip)
- Build em 3.34s
- Zero warning além do "chunk maior que 500 KB" que já existia

#### Lições da entrega
1. **Encoder ZIP em puro JS é viável e barato** quando o conteúdo é só texto. STORE+CRC32 = ~150 linhas de código estável.
2. **Web Notifications precisa de gesto do usuário** pra pedir permissão. Tentar dentro de um useEffect = browser ignora. Botão clicável é obrigatório.
3. **Gestos no mobile + scroll + swipe = brigam fácil**. A solução é travar a direção dominante na "dead zone" inicial e nunca mais soltar. Sem isso, o app fica intratável.
4. **Slash commands sem `@tiptap/suggestion`** funcionam perfeitamente: um Plugin de ~100 linhas com `appendTransaction` + regex no texto antes do cursor faz o trabalho, sem dep externa.

— última atualização: Slash + Notificações + Exportação ZIP + Gestos Mobile, 28/05/2026
