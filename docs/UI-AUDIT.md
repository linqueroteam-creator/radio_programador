# ANOTATA — Auditoria de UI
> **Agente:** Design Mestre  
> **Gerado em:** 2026-05-27T15:10:29+00:00  
> **Versão:** primeira auditoria  
> **Componentes analisados:** 28 componentes em `src/components/` + 4 extensões em `src/extensions/` + `src/index.css` + `tailwind.config.js`

---

## 📊 Sumário Executivo

**Nota geral:** **B**

O projeto tem uma base sólida e bonita. A paleta lavanda/roxo/goiaba está bem aplicada na maior parte das telas, e dá pra perceber o cuidado do designer no detalhe (capas dos cadernos, popovers, mapa de conexões). Os problemas que aparecem são típicos de quem foi acrescentando peças ao longo do tempo: muito tamanho de ícone diferente pro mesmo papel, alguns cinzas que não estão na paleta oficial, e foco do teclado quase invisível em botões só com ícone. Nada é grave — tudo é corrigível em algumas horas de polimento.

### 🎯 Top 3 pontos críticos a melhorar

1. **Cinza fora da paleta no texto secundário** — `#6B5E80` é usado em `Timeline.jsx:31` e `App.jsx:39`, mas a paleta oficial declara `text-suave: #5B4A7A`. São dois cinzas levemente diferentes coexistindo. Usuário não vê, mas é o tipo de coisa que dá "ruído visual" sem motivo.
2. **Tamanhos de ícone caóticos** — `X` (fechar) aparece nos tamanhos 9, 10, 11, 12, 13, 14, 16 e 18. `Star` aparece em 10, 11, 12, 14, 15, 16, 18, 20. Não há um padrão de "ícone pequeno / médio / grande". Exemplo: `Home.jsx:445` (X 18) vs `TagBar.jsx:30` (X 10) — ambos cumprem o mesmo papel de "fechar".
3. **Foco do teclado invisível em botões só com ícone** — quase 40 botões ícone-only têm `title=` mas não têm `aria-label`, nem `focus-visible:ring`. Quem navega só com Tab simplesmente não enxerga onde está. Ex.: `Toolbar.jsx`, `NoteMetaBar.jsx`, `Editor.jsx` (botões de Star/Trash/Link2 do header).

### ✨ O que está muito bom

- A escolha de paleta semântica nos chips do Reescritor (5 cores pra 5 modos) é proposital e funciona muito bem — não é inconsistência, é decisão de design.
- O sistema de capas geradas em SVG no `NotebookCover.jsx` é primoroso e único pro app, dá personalidade.
- Os popovers (`GrammarPopover`, `RephrasePopover`, `LinkPickerPopover`) são consistentes entre si: mesmo formato de header, mesmos atalhos, mesmo z-index, mesma cor de fundo. Esse padrão tá maduro.
- O uso correto de `aria-label` nos botões do `SelectionBubbleMenu`, `LinkPickerPopover` e `RephrasePopover` mostra que você sabe fazer — só falta espalhar pra todo o app.
- Sidebar tem dois modos (recolhido / expandido) com transição cuidada e atalho de tecla — bem-feita.

---

## 🎨 Paleta de Cores

### Cores oficiais (em uso)

| Cor | Hex | Tailwind | Ocorrências (aprox.) | Onde aparece (top 3) |
|---|---|---|---:|---|
| Roxo principal | `#5B2D8E` | `anotata-roxo` | ~150 | praticamente todos os componentes |
| Roxo escuro | `#3D1B66` | `anotata-roxo-escuro` | ~25 | botões hover, ProseMirror h1/h2, gradientes |
| Roxo claro | `#7C4DC9` | `anotata-roxo-claro` | ~6 | Dashboard header, RulesEngine, Home |
| Goiaba | `#E8637C` | `anotata-goiaba` | ~40 | favoritar, alertas, links, sublinhado |
| Goiaba escuro | `#C44862` | `anotata-goiaba-escuro` | ~10 | erros de ortografia (wavy), botão excluir |
| Goiaba claro | `#F08AA0` | `anotata-goiaba-claro` | ~5 | mark de highlight, RulesEngine insight |
| Texto principal | `#2D1B4E` | `anotata-text` | ~80 | corpo de texto, títulos, ProseMirror |
| Texto suave (declarado) | `#5B4A7A` | `anotata-text-suave` | ~50 | subtítulos, blockquote no Tiptap |
| Muted | `#9888B5` | `anotata-muted` | ~70 | placeholder, metadados, hints |
| Background | `#F2F1F4` | `anotata-bg` | ~25 | corpo de página, scrollbar track |
| Sidebar | `#EDE8F2` | `anotata-sidebar` | ~20 | sidebar, painéis laterais |
| Lavanda | `#E0D7EC` | `anotata-lavanda` | ~12 | tags, borders sutis |
| Lavanda clara | `#F0E9F8` | `anotata-lavanda-clara` | ~50 | hover states, fundos suaves |
| Border | `#DCD2E8` | `anotata-border` | ~120 | divisores, contornos de card |
| Border suave | `#EAE0F2` | `anotata-border-suave` | ~3 | só dentro de popovers |
| Hover | `#E8DFF2` | `anotata-hover` | ~40 | hovers de menu lateral |

### ⚠️ Cores fora da paleta oficial

| Cor | Hex | Onde | Sugestão |
|---|---|---|---|
| Verde escuro semântico | `#0F7A3F` | `Timeline.jsx:32`, `ConnectionMap.jsx:28`, `InsightPanel.jsx:46`, `RephrasePanel.jsx:32` (modo Conciso e regras "voz ativa"/"quebra"/"enxugar"), `Dashboard.jsx` (ícone Check) | Adicionar como `anotata-success` no `tailwind.config.js` (legítimo: cor semântica de "sucesso/forte/concluído"). |
| Verde claro | `#D4F4DD` | mesmos lugares acima | Adicionar como `anotata-success-bg`. |
| Verde Tailwind emerald-500 | `#10B981` | `InsightPanel.jsx:46` (border), `ChecklistProgress.jsx:13` | Trocar pela versão `#0F7A3F` declarada acima ou unificar em `anotata-success`. |
| Âmbar escuro | `#9B6F00` | `Timeline.jsx:34`, `ConnectionMap.jsx:29`, `DateEngine.js:125,127`, `RephrasePanel.jsx:32` (gerundismo) | Adicionar como `anotata-warn` (cor semântica de "atenção/médio/amanhã"). |
| Âmbar claro | `#FFF4D9` | mesmos lugares | Adicionar como `anotata-warn-bg`. |
| Rosa pálido (fundo de erro) | `#FCEEF1` / `#FCE7EB` / `#FFE4EA` / `#FFE3E8` | `GrammarPopover.jsx:153,159`, `GrammarPanel.jsx:5,6`, `Corretor.jsx:9,10`, `DateEngine.js:123,124`, `Timeline.jsx:35`, `RephrasePanel.jsx:33` | **Quatro variações quase idênticas.** Padronizar em uma só (`anotata-goiaba-bg: #FCE7EB`) e excluir as outras. |
| Cinza-roxo | `#6B5E80` | `Timeline.jsx:31`, `App.jsx:39` (ErrorBoundary) | **Conflito direto com `text-suave: #5B4A7A`** declarado no `tailwind.config.js`. Trocar para `text-anotata-text-suave`. |
| Lavanda escura "extra" | `#8B5FBF` | `Home.jsx:16` (paleta de cores de caderno) | É opção do usuário, não bug — mas considere comentar no código que é decisão proposital. |
| Violeta extra | `#9B6FD9` | `Home.jsx:17` | idem |
| Rosa profundo extra | `#D45A8A` | `Home.jsx:18` | idem |
| Cinza ErrorBoundary | `#E8E4F0`, `#F6F4F9` | `App.jsx:34,42` | Trocar por `anotata-border` e `anotata-bg`. |
| Cinza ghost text | `#A89DC0` | `InlinePredictive.js:81` | Considere `anotata-muted` (`#9888B5`) — diferença é imperceptível. |
| Cor "cacofonia" Reescritor | `#FFE7D9` / `#9B4E00` | `RephrasePanel.jsx:336`, `RephrasePopover.jsx:399` | Decisão de design proposital (chips do Reescritor). Não acuso como erro, mas vale documentar. |
| Cor "nominalização" Reescritor | `#E0F2FA` / `#1A5C99` | mesmos lugares | idem |
| Border info | `#C9B8E8` | `InsightPanel.jsx:45` | É derivada do roxo claro — considere `anotata-lavanda` (`#E0D7EC`). |
| Tailwind defaults `red-50/200/600/700`, `yellow-500`, `green-600`, `amber-100/700`, `green-100/700` | spread by `bg-red-50`, `text-yellow-500`, etc. | `AuthGate.jsx:242-247`, `RephrasePanel.jsx:147-148`, `RephrasePopover.jsx:202-203`, `NoteList.jsx:81,141`, `Home.jsx:289`, `Editor.jsx:660,675,692`, `GrammarPanel.jsx:55`, `Dashboard.jsx`, `NotebookDeleteModal.jsx:97-98` | Mapear cada uso semântico para um par `anotata-*`. Em especial: substituir `text-yellow-500 fill-yellow-500` (estrela favoritada) por `text-anotata-goiaba` ou um novo `anotata-favorite`. |

### 🔄 Mesma cor, sintaxes diferentes (candidatas a padronizar)

- `#5B2D8E` aparece como classe (`bg-anotata-roxo`), como `style={{ background: '#5B2D8E' }}` (`App.jsx:51`), como atributo SVG (`AuthGate.jsx:137`, `ConnectionMap.jsx:34,198,290`), e dentro de strings (`Toolbar.jsx:30` paleta hardcoded). **Mesma cor, ≥ 4 sintaxes** — todas legítimas, mas misturadas no mesmo arquivo.
- `#2D1B4E` (text) aparece como `text-anotata-text`, como `color: '#2D1B4E'` em `index.css` (linhas 17, 65, etc.) e em `style={{ color: '#2D1B4E' }}`. Quando a paleta evoluir, vai ter que trocar em N lugares.
- `#9888B5` (muted) está como `text-anotata-muted`, como `color: #9888B5` em `index.css:31` (placeholder) e como `color: '#9888B5'` em `RulesEngine.js:19`.
- `#E8637C` (goiaba) como `text-anotata-goiaba`, `border-left: 3px solid #E8637C` em `index.css:62`, e literal em vários componentes.

### Variações sutis (candidatas a unificar)

- **4 fundos rosa-pálido quase iguais** que podem virar 1: `#FCEEF1`, `#FCE7EB`, `#FFE4EA`, `#FFE3E8`. Ninguém vai notar a diferença.
- **2 cinzas-suave coexistindo**: `#5B4A7A` (oficial, declarado) vs `#6B5E80` (Timeline + App). Unificar em `#5B4A7A`.
- **3 verdes "sucesso"**: `#0F7A3F` (texto), `#D4F4DD` (fundo), `#10B981` (border). Faz sentido — só precisa entrar oficialmente na paleta.

---

## 🔣 Iconografia (Lucide React)

**Total de ícones únicos em uso:** ~62

Distribuição por arquivo:
- `App.jsx`: 3 (LogOut, Command, AlertTriangle)
- `Sidebar.jsx`: 13 (FileText, Star, Trash2, BookOpen, Tag, Plus, ChevronDown, ChevronRight, Search, Sparkles, X, ChevronLeft, Menu, SpellCheck, HomeIcon, TrendingUp, Layers, Pin, Archive, Clock)
- `NoteList.jsx`: 11 (Plus, Star, Trash2, RotateCcw, Copy, MoreVertical, Sparkles, Pin, PanelLeftClose, PanelLeftOpen, FileText)
- `Editor.jsx`: 13 (Star, Trash2, BookOpen, Clock, Sparkles, SpellCheck, ImageIcon, CheckCircle, AlertCircle, Cloud, CloudOff, PanelRight, Link2, MapIcon, RotateCw)
- `Toolbar.jsx`: 18 (Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered, CheckSquare, Quote, Minus, Heading1-3, Link2, Image, Highlighter, Undo2, Redo2, Palette)
- `Home.jsx`: 12 (Plus, BookOpen, Star, Clock, TrendingUp, Sparkles, Search, ChevronRight, Edit3, X, Trash2, MoreVertical)
- `Dashboard.jsx`: 13
- `InsightPanel.jsx`: 22 (a maioria de qualquer componente)
- `CommandPalette.jsx`: 22
- `RephrasePanel.jsx` / `RephrasePopover.jsx`: 7 / 8
- `LinkPickerPopover.jsx`: 5
- demais: 2-5 ícones cada

### Top 15 ícones mais usados

| Ícone | Componentes onde aparece (parcial) | Tamanhos detectados |
|---|---|---|
| **X** (fechar) | AuthGate, CommandPalette, ConnectionMap, ConnectionModal, DueDateBadge, GrammarPanel, GrammarPopover, Home, InsightPanel, LinkPickerPopover, NotebookDeleteModal, RephrasePanel, RephrasePopover, Sidebar, TagBar, TemplatePicker, VersionHistory | **9, 10, 11, 12, 13, 14, 16, 18** (8 tamanhos!) |
| **Sparkles** | Sidebar, NoteList, Editor, NoteMetaBar, Home, Dashboard, InsightPanel, ConnectionMap, RephrasePanel, RephrasePopover, Corretor, CommandPalette | **9, 10, 12, 13, 14, 15, 16** (7 tamanhos) |
| **Star** | Sidebar, NoteList, Editor, Home, Dashboard, InsightPanel, CommandPalette | **10, 11, 12, 14, 15, 16, 18, 20** (8 tamanhos) |
| **Plus** | Sidebar, NoteList, Home, ConnectionMap, InsightPanel, TagBar, Dashboard, CommandPalette | **10, 11, 12, 14, 15, 16** (6 tamanhos) |
| **Trash2** | Sidebar, Editor, NoteList, Home, NotebookDeleteModal, Dashboard, CommandPalette | **12, 13, 14, 16, 18** (5 tamanhos) |
| **Pin** | Sidebar, NoteList, NoteMetaBar, InsightPanel, CommandPalette | **10, 11, 12, 14, 16** (5 tamanhos) |
| **Search** | Sidebar, ConnectionModal, Home, CommandPalette, LinkPickerPopover | **12, 14, 16** (3 tamanhos — ok) |
| **Link2** | ConnectionModal, ConnectionMap, Editor, InsightPanel, LinkPickerPopover, SelectionBubbleMenu, Toolbar | **11, 12, 14, 16, 26** (5 tamanhos) |
| **BookOpen** | Sidebar, Editor, Dashboard, Home, GrammarPopover, NotebookDeleteModal, LinkPickerPopover | **12, 14, 16, 18** (4 tamanhos) |
| **FileText** | Sidebar, NoteList, Dashboard, InsightPanel, CommandPalette, Corretor, LinkPickerPopover, Timeline | **12, 14, 16, 20** (4 tamanhos) |
| **Clock** | Sidebar, Editor, Home, Dashboard, InsightPanel, Timeline, VersionHistory, DueDateBadge, CommandPalette | **9, 10, 11, 12, 14, 18** (6 tamanhos) |
| **ChevronDown** | NoteMetaBar, Sidebar, RephrasePopover, InsightPanel, NotebookCover | **9, 11, 12, 14, 16** (5 tamanhos) |
| **ChevronRight** | Home, Sidebar, RephrasePopover, InsightPanel | **11, 12, 14** (3 tamanhos) |
| **Calendar** | DueDateBadge, Timeline, InsightPanel, Dashboard, CommandPalette | **9, 10, 11, 12, 14** (5 tamanhos) |
| **AlertCircle** | DueDateBadge, GrammarPopover, RephrasePanel, Editor, Corretor, InsightPanel | **11, 12, 13, 14, 16** (5 tamanhos) |

### Inconsistências de tamanho

- **`X` em headers de modal**: `ConnectionModal.jsx:80` usa 18, `RephrasePanel.jsx:101` usa 16, `RephrasePopover.jsx:212` usa 13, `TemplatePicker.jsx:48` usa 18, `Home.jsx:445` (modal de novo caderno) usa 18, `LinkPickerPopover.jsx:228` usa 12, `GrammarPopover.jsx:96` usa 13. **Mesmo papel, 4 tamanhos diferentes**.
- **`Sparkles` no header de seção**: 14 em `InsightPanel.jsx:259`, 16 em `Home.jsx:140`, 13 em `Editor.jsx` (NextActionCard), 12 em `ConnectionMap.jsx:427`. Sem padrão claro.
- **`Star` ao lado de título de nota**: 10 em `NoteList.jsx:128,137`, 11 em `Home.jsx:280`, 12 em `Dashboard.jsx:218`, 14 em `Editor.jsx:599`. Mesmo contexto, 4 tamanhos.
- **Toolbar do editor**: todos os 18 ícones em `Toolbar.jsx` são 14 — esse é o único lugar consistente, parabéns.
- **Ícones decorativos com fundo colorido (ex.: capas de seção, headers de modal)**: variam entre 16, 17 e 20 sem critério explícito (`Editor.jsx:564 ImageIcon=16`, `ConnectionMap.jsx:179 MapIcon=17`, `Corretor.jsx:128 SpellCheck=20`).

### Recomendação

Adotar **3 tamanhos canônicos**:

- `12` → ícone denso (chip pequeno, badge, kbd, breadcrumb interno)
- `14` → padrão (botão de toolbar, item de lista, fechar de popover)
- `16` → destaque (header de modal, card de "ação rápida", botão primário)

Toda vez que precisar de algo maior (ex.: 20 ou 26 em estados vazios), tratar como exceção documentada. **Banir** `size={9}`, `size={10}`, `size={11}`, `size={13}`, `size={15}`, `size={17}` — todos são variações quase imperceptíveis.

---

## ✏️ Tipografia

### Escala em uso (frequência)

| Tamanho | Tailwind class | Frequência | Exemplos |
|---|---|---:|---|
| 9px | `text-[9px]` | ~6 | tags em `NoteList.jsx:144,148`, badge "Em breve" em `Sidebar.jsx:209`, badge de força em `ConnectionMap.jsx:444`, `RephrasePopover.jsx:223` |
| 10px | `text-[10px]` | ~30 | metadados em cards (Dashboard, NoteList, Home), kbd, badges minúsculos |
| 11px | `text-[11px]` | ~25 | subtítulos de modal, hints, legendas (Home, ConnectionMap, GrammarPopover, Corretor) |
| 12px | `text-xs` | ~110 | textinho corrente, descrições, metadados (em todos os componentes) |
| 12px | `text-[12px]` | 5 | `RephrasePopover.jsx:230`, `RephrasePanel.jsx:115` (chips de modo). **Duplica `text-xs`!** |
| 13px | `text-[13px]` | 2 | `RephrasePopover.jsx:264,302` (corpo do popover). **Não tem equivalente Tailwind padrão.** |
| 14px | `text-sm` | ~100 | corpo de texto principal, botões, labels |
| 16px | `text-base` | ~25 | títulos de seção (`text-base font-bold`), corpo do Corretor |
| 18px | `text-lg` | ~10 | subheaders (Corretor, NotebookDeleteModal, Dashboard, AuthGate, Home modal) |
| 20px | `text-xl` | ~3 | títulos de seção em `Sidebar.jsx:130`, `Home.jsx:200`, `Home.jsx:255` |
| 24px | `text-2xl` | ~5 | `text-2xl font-bold` em títulos de Auth, ProseMirror h1, Editor input title, Dashboard, Home |
| 30px | `text-3xl` | 3 | tela de loading + tela de auth (`AuthGate.jsx:115`, `App.jsx:137`, `Home.jsx:111`) |

### Pesos em uso

| Peso | font-class | Frequência |
|---|---|---:|
| 400 | `font-normal` | ~3 (raríssimo, só explícito em ToolBtn estado normal) |
| 500 | `font-medium` | ~110 |
| 600 | `font-semibold` | ~50 |
| 700 | `font-bold` | ~70 (h1/h2 ProseMirror, títulos de seção, botões primários) |

### Tamanhos arbitrários (`text-[Npx]`)

- `text-[9px]` — pode virar `text-[10px]`, ninguém percebe
- `text-[10px]` — manter (substitui falta de `text-2xs`)
- `text-[11px]` — pode virar `text-xs` na maioria dos casos
- `text-[12px]` — **redundante com `text-xs`** (que é exatamente 12px). Trocar todas as ocorrências por `text-xs`.
- `text-[13px]` — única no projeto, em `RephrasePopover.jsx`. Pode subir pra `text-sm` (14) ou descer pra `text-xs` (12).

### Recomendação de hierarquia

```
xs    12px   font-medium     → corpo secundário, metadados, hints, badges, kbd
sm    14px   font-medium     → corpo padrão, botões, links de menu, labels
base  16px   font-semibold   → títulos de seção pequenos, chamada de ação
lg    18px   font-bold       → headers de modal, headers de view
xl    20px   font-bold       → títulos de página principal (Sidebar "ANOTATA", Home "Seus cadernos")
2xl   24px   font-bold       → ProseMirror H1, input de título, AuthGate H1
3xl   30px   font-bold       → splash de loading, header decorativo único
```

Tudo abaixo de 12px é exceção declarada (badges minúsculos como "9px uppercase tracking-wider"). Não criar `text-[7px]`, `text-[8px]`, etc.

---

## 📐 Sistema de Espaçamento

### Valores em uso (escala atual)

| Valor px | Tailwind | Frequência |
|---|---|---:|
| 2px (0.5) | `p-0.5`, `px-0.5`, `py-0.5`, `gap-0.5` | ~30 (badges, tags, kbd) |
| 4px (1) | `p-1`, `gap-1`, `px-1`, `py-1` | ~50 |
| 6px (1.5) | `p-1.5`, `gap-1.5`, `px-1.5`, `py-1.5` | ~75 (botões pequenos) |
| 8px (2) | `p-2`, `gap-2`, `px-2`, `py-2` | ~120 |
| 10px (2.5) | `p-2.5`, `gap-2.5`, `px-2.5`, `py-2.5` | ~40 |
| 12px (3) | `p-3`, `gap-3`, `px-3`, `py-3` | ~70 |
| 16px (4) | `p-4`, `gap-4`, `px-4`, `py-4` | ~50 |
| 20px (5) | `p-5`, `gap-5`, `px-5`, `py-5` | ~25 |
| 24px (6) | `p-6`, `gap-6`, `px-6` | ~12 |
| 32px (8) | `p-8`, `px-8` | ~5 (apenas Home, AuthGate, Dashboard) |

### Valores arbitrários

Pesquisei `\[\d+px\]` no espaçamento e encontrei:

- `min-h-[400px]` em `Corretor.jsx:211,220` — exceção legítima (área de texto mínima)
- `min-w-[180px]` em `NoteList.jsx:60`, `NoteMetaBar.jsx:32` — exceção legítima (dropdown menu)
- `min-w-[240px]`, `min-w-[280px]`, `min-w-[48px]` em `Sidebar.jsx`, `NoteList.jsx` — exceção legítima (largura de painel)
- `pt-[15vh]` em `CommandPalette.jsx:284` — proposital
- `max-w-[85vh]` / `h-[85vh]` / `h-[88vh]` / `h-[90vh]` em modais — proposital
- `w-[260px]`, `w-[280px]`, `w-[340px]`, `w-[380px]`, `w-[520px]` em popovers e painéis laterais — proposital, **mas vale checar se podem encaixar na escala (pode virar w-72/80/96)**.

Não há p-[7px], p-[15px] ou similares — bom.

### Recomendação

A escala atual é boa, só **subutiliza** `p-2.5` (10px) e tem alguns `p-1.5` (6px) demais. Sugestão:

- **Padronizar paddings de botão pequeno** em `p-1.5` (atual `p-1`/`p-1.5`/`p-2` está misturado).
- **Padronizar cards de conteúdo** em `p-3` ou `p-4` — hoje varia entre `p-2.5`, `p-3` e `p-4` no mesmo papel.
- **Hero/header de página** sempre `px-6 py-4` ou `px-8 py-6` — escolher um e aplicar (Editor usa `px-6 py-4`, Home usa `px-8 pt-8 pb-6`, Corretor usa `px-6 py-4`).

---

## 🔘 Border Radius

| Valor | Tailwind | Onde |
|---|---|---|
| 4px | `rounded` | tags (`TagBar`, `NoteList`), inputs do Sidebar (`px-2 py-1`), code blocks no Tiptap, datas detectadas em `InsightPanel` |
| 6px | `rounded-md` | chips de modo do Reescritor, sugestões em `GrammarPopover`, botão "Abrir nota" no `ConnectionMap` |
| 8px | `rounded-lg` | **maioria absoluta** — botões, cards de nota, ícone-em-fundo, popovers menores |
| 12px | `rounded-xl` | StatCards do Dashboard, capas de cadernos, chips do Reescritor (modo ativo), gradient badges |
| 16px | `rounded-2xl` | TODOS os modais grandes (TemplatePicker, ConnectionModal, ConnectionMap, RephrasePanel, NotebookDeleteModal, AuthGate, VersionHistory, Home modal de novo caderno) |
| 9999px | `rounded-full` | badges arredondadas, swatch de cor, avatar de tipo de nota, bolinha decorativa |

São 6 níveis. Não é caótico, mas tem ambiguidade entre `rounded-lg` (8) e `rounded-xl` (12) usados pra coisas parecidas (ex.: botão primário do Home é `rounded-xl`, do Sidebar é `rounded-lg`).

### Recomendação

Reduzir pra **4 níveis** com regra clara:

- `rounded` (4px) — chip, kbd, swatch, badge minúsculo
- `rounded-lg` (8px) — botão padrão, input, popover pequeno, card de nota
- `rounded-xl` (12px) — card destacado, capa de caderno, popover grande
- `rounded-2xl` (16px) — só modais full-screen
- `rounded-full` — avatar circular, bolinha, badge oval

Abandonar `rounded-md` (vira `rounded` ou `rounded-lg`).

---

## ☁️ Sombras

| Valor | Tailwind | Onde |
|---|---|---|
| `shadow-sm` | botões primários (Home, NoteList, Sidebar collapse, Editor "Próxima ação"), card selecionado de nota, gradient avatars, RephrasePanel chips |
| `shadow-md` | hover de cards (Home `hover:shadow-md`, StatCard `hover:shadow-md`, botão Ctrl+K do App) |
| `shadow-xl` | dropdowns (`NoteList.jsx:60`, `NoteMetaBar.jsx:32`, color picker do Toolbar, dropdown de opções de caderno em Home, VersionHistory `confirmRestore`) |
| `shadow-2xl` | TODOS os modais grandes e popovers de seleção (RephrasePanel, RephrasePopover, ConnectionModal, ConnectionMap, TemplatePicker, NotebookDeleteModal, AuthGate, VersionHistory, Home modal, CommandPalette, LinkPickerPopover) |

Existe um padrão **implícito mas consistente**: botão = `sm`, hover de card = `md`, dropdown = `xl`, modal = `2xl`. Boa.

### Padrão por elemento (recomendação formal)

- **Botões e cards selecionados:** `shadow-sm`
- **Cards no hover (lift effect):** `hover:shadow-md`
- **Dropdowns e menus contextuais:** `shadow-xl`
- **Modais grandes e popovers principais (RephrasePopover, LinkPicker, GrammarPopover):** `shadow-2xl`

A única exceção encontrada: `GrammarPopover.jsx:80` usa `boxShadow: '0 8px 28px rgba(45, 27, 78, 0.18)'` inline — uma sombra customizada que não está no Tailwind. Documentar se é proposital (sombra mais "fofa" pra popover de erro) ou trocar por `shadow-2xl`.

---

## 🎯 Estados Interativos

Contagem aproximada (sobre ~250 botões clicáveis identificados nos componentes):

- Botões com `hover:` definido: **~230 / 250 (~92%)** — muito bom
- Com `transition-` (suave): **~200 / 250 (~80%)** — bom
- Com `disabled:` tratado (opacity ou cursor): **~25 botões** que podem ser desabilitados — todos parecem cobertos
- **Com `focus-visible:` ou `focus:ring`:** **~12 / 250 (~5%)** — só os inputs e formulários têm. Botões só com ícone NÃO têm foco visível.
- **Áreas de toque < 32×32 px estimadas:** ver lista abaixo

### Áreas de toque potencialmente < 32×32

- `NoteCard MoreVertical` em `NoteList.jsx:54` — sem padding, ícone size 14 → ~14×14 px
- `Star/Pin inline ao lado do título` em `NoteList.jsx:128,137` e `Home.jsx:280` — `size={10}` ou `size={11}` sem botão clicável real, mas indicadores
- `Toolbar.jsx ToolBtn`: `p-1.5` (6px) + ícone 14 = **26×26 px** — abaixo do mínimo recomendado (32 ou 44)
- `NoteMetaBar.jsx Pin/Eye/Archive`: `p-1.5` + ícone 12 = **24×24 px**
- `Editor.jsx` botões do header (Star, Trash, Image, Link2, Map, RotateCw, SpellCheck, PanelRight, Sparkles): `p-1.5` + ícone 16 = **28×28 px**
- `Sidebar.jsx` botão "+" novo caderno/tag inline: `Plus size={12}` no `<span>` — clicável mas tiny
- `TagBar.jsx` botão X de remoção de tag: `X size={10}` sem padding visível — minúsculo
- `GrammarPanel.jsx:23,30`: `p-1` + ícone 14 = **22×22 px**

### Recomendações

1. **Criar uma classe utilitária** `focus-visible:ring-2 focus-visible:ring-anotata-roxo focus-visible:ring-offset-2 focus-visible:outline-none` e aplicar em **todo** `<button>` ícone-only.
2. **Padronizar a Toolbar do editor** pra `p-2` (8px) + ícone 14 = 30×30 px — chega no limite mínimo. Idealmente `p-2.5` (10px) + 14 = 34×34 px.
3. Botões críticos como X-fechar de modal: garantir mínimo `p-2` + ícone 16 = 32×32 px.
4. `MoreVertical` do `NoteCard` precisa de padding (`p-1` mínimo).

---

## ♿ Acessibilidade Básica

### Botões só com ícone SEM `aria-label` nem `title` (críticos)

- `Sidebar.jsx:166` — `<button onClick={() => store.setSearchQuery('')}>` (X dentro do campo de busca) — só `<X size={14} />`, sem nenhuma legenda
- `Sidebar.jsx:262,266` — `<span role="button">` para abrir "Novo caderno"/"Nova tag" — sem aria-label
- `Sidebar.jsx:336,392` — botão `Plus` para confirmar criação de caderno/tag — sem nada
- `NoteList.jsx:54` — `<button>` `MoreVertical` no NoteCard — sem aria-label nem title
- `Home.jsx:404` — `<button>` `MoreVertical` no NotebookCard — só `title="Opções do caderno"`, sem aria-label
- `TagBar.jsx:23` — botão X para remover tag — sem nada
- `NoteList.jsx:138` — `Star` inline no título de nota não é botão (ok)

### Botões só com ícone que têm `title=` mas SEM `aria-label`

- `Sidebar.jsx:60` — Menu (expandir) — `title="Expandir menu"`, falta aria-label
- `Sidebar.jsx:135` — ChevronLeft (recolher) — `title="Recolher menu"`, falta aria-label
- `Sidebar.jsx:71-119` — `SidebarIconBtn` (todos os 8 ícones de navegação) — só `title=`
- `NoteList.jsx:204` — `MoreVertical` aberto pelo card — só `title=` se usuário tiver mouse
- `Editor.jsx:563-606` — **9 botões do header do editor** (Image, Link2, Map, RotateCw, SpellCheck, PanelRight, Sparkles, Star, Trash) — todos só com `title=`
- `NoteMetaBar.jsx:154,164,175` — Pin, Eye (revisada), Archive — só `title=`
- `Toolbar.jsx` — **todos os 18 ToolBtn** passam `title=` mas a função `ToolBtn` não tem `aria-label`. **Maior concentração de problema do app.**
- `App.jsx:212` — botão Ctrl+K — `title="Central de comandos (Ctrl+K)"`
- `App.jsx:225` — botão LogOut — `title="Sair do ANOTATA"`
- `Editor.jsx (NoteCard menu)` — Star, Pin, Copy, Trash dentro do dropdown — todos com texto ao lado, então não tem problema
- `GrammarPanel.jsx:24,32` — RefreshCw, X — só `title=`
- `Corretor.jsx:171,180` — Copy, RotateCcw — só `title=`
- `RephrasePanel.jsx`, `RephrasePopover.jsx`, `LinkPickerPopover.jsx` — esses 3 já têm aria-label nas peças certas, parabéns!

### Contraste fraco visualmente

- **`text-anotata-muted` (#9888B5) sobre `bg-anotata-bg` (#F2F1F4)**: contraste ~3.4:1 — abaixo do AA (4.5:1) pra texto pequeno. Aparece em **muitos lugares**: subtítulos de cards (Dashboard, Home), placeholders, hints, kbd com fundo `anotata-lavanda-clara`. Não é grave porque a fonte é pequena (intencional), mas em modo de claridade alta fica imperceptível.
- **`text-anotata-muted` sobre `bg-anotata-sidebar` (#EDE8F2)**: contraste ~3.6:1 — idem.
- **`text-white/55` em `NotebookCover.jsx:336`** (subtítulo da capa "X notas" / "caderno vazio") — sobre cores de fundo que variam (gradientes). Funciona em capas escuras (ex.: roxo escuro), mas em capas mais claras (goiaba claro) fica frágil.
- **`text-yellow-500 fill-yellow-500`** (estrela favoritada) sobre `bg-white`: amarelo fluorescente Tailwind contrasta bem **mas destoa da paleta lavanda/goiaba**. É a única coisa amarela do app — sugiro trocar pra `text-anotata-goiaba` ou um `anotata-favorite: #F0B400` declarado.

### Boas práticas em uso (positivo)

- ProseMirror com `:focus-visible` no link interno (`index.css:99`).
- Modais com `role="dialog"` e `aria-modal="true"` (`ConnectionMap.jsx:168-170`, `RephrasePanel.jsx:78-80`).
- Inputs com `focus:ring-2 focus:ring-anotata-roxo/10` consistente no app inteiro.
- `kbd` semanticamente corretos no `RephrasePopover` e `CommandPalette`.

---

## ⚠️ Inconsistências Detectadas (priorizado por impacto)

### 🔴 Alto impacto

1. **Cinza `#6B5E80` é diferente do `text-suave` declarado (`#5B4A7A`)**
   - `radio_programador/src/components/Timeline.jsx:31` — `edited: { ..., color: '#6B5E80', ... }`
   - `radio_programador/src/components/Timeline.jsx` (linha do bucket "edited") — `'#6B5E80'`
   - `radio_programador/src/App.jsx:39` — `<p style={{ color: '#6B5E80', ... }}>`
   - **Como corrigir:** trocar todas as ocorrências literais pelo valor declarado (`#5B4A7A`) ou usar a classe `text-anotata-text-suave`. Resultado: 1 cinza só no app inteiro.

2. **Tamanhos de ícone caóticos no mesmo papel**
   - `radio_programador/src/components/ConnectionModal.jsx:80` — `<X size={18} />` (header de modal)
   - `radio_programador/src/components/RephrasePanel.jsx:101` — `<X size={16} />` (header de modal — mesmo papel!)
   - `radio_programador/src/components/RephrasePopover.jsx:212` — `<X size={13} />` (header de popover)
   - `radio_programador/src/components/LinkPickerPopover.jsx:228` — `<X size={12} />` (header de popover — mesmo papel do anterior!)
   - **Como corrigir:** padronizar X de header de modal grande em `size={18}` e X de header de popover em `size={14}`. Atualizar os ~17 arquivos onde X aparece.

3. **Foco do teclado invisível em ~40 botões só com ícone**
   - `radio_programador/src/components/Toolbar.jsx:7-19` — `function ToolBtn` não tem `focus-visible:`
   - `radio_programador/src/components/NoteMetaBar.jsx:147-180` — Pin/Eye/Archive sem focus visível
   - `radio_programador/src/components/Editor.jsx:563-606` — 9 botões do header sem focus visível
   - `radio_programador/src/components/App.jsx:212,225` — Ctrl+K e LogOut sem focus visível
   - **Como corrigir:** acrescentar `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/40` ao className de cada botão; ou criar componente `<IconButton>` reutilizável.

### 🟡 Médio impacto

1. **4 cores de fundo rosa-pálido coexistindo, todas com mesmo papel (fundo de erro/atenção)**
   - `radio_programador/src/components/GrammarPopover.jsx:153,159` — `'#FCEEF1'`
   - `radio_programador/src/components/GrammarPanel.jsx:5,6` e `Corretor.jsx:9,10` — `'#FCE7EB'`
   - `radio_programador/src/engine/DateEngine.js:124` — `'#FFE4EA'` (hoje)
   - `radio_programador/src/components/Timeline.jsx:35`, `RephrasePanel.jsx:33` — `'#FFE3E8'` (vencido / simplificação)
   - **Como corrigir:** declarar `anotata-goiaba-bg: '#FCE7EB'` no Tailwind config e trocar todas as ocorrências.

2. **`shadow-2xl` substituído por sombra customizada inline em GrammarPopover**
   - `radio_programador/src/components/GrammarPopover.jsx:80` — `boxShadow: '0 8px 28px rgba(45, 27, 78, 0.18)'`
   - **Como corrigir:** ou trocar por `shadow-2xl` (mantém consistência), ou declarar essa sombra em `tailwind.config.js` como `shadow-popover`.

3. **`text-[12px]` redundante com `text-xs`**
   - `radio_programador/src/components/RephrasePopover.jsx:230` — `text-[11px] font-medium` (chips de modo)
   - `radio_programador/src/components/RephrasePopover.jsx:264,302` — `text-[12px]` e `text-[13px]`
   - `radio_programador/src/components/RephrasePanel.jsx:115` — `text-[12px] font-semibold`
   - **Como corrigir:** trocar `text-[12px]` por `text-xs` (mesmo valor); decidir se `text-[13px]` deve descer pra `text-xs` (12) ou subir pra `text-sm` (14).

4. **`text-yellow-500 fill-yellow-500` destoa da paleta**
   - `radio_programador/src/components/NoteList.jsx:81,141`, `Editor.jsx:660,675`, `Home.jsx:289`, `Dashboard.jsx:218`
   - **Como corrigir:** ou declarar `anotata-favorite: '#F0B400'` (amarelo dourado mais quente, em harmonia com goiaba), ou simplesmente usar `text-anotata-goiaba`.

5. **3 versões de cinza ghost text / muted parecidas**
   - `#9888B5` (oficial muted)
   - `#A89DC0` em `radio_programador/src/extensions/InlinePredictive.js:81`
   - `#6B5E80` em Timeline e App (já listado)
   - **Como corrigir:** unificar em `#9888B5` (muted) — diferença é imperceptível.

### 🟢 Polimento

1. **Mistura de `rounded-lg` (8px) e `rounded-xl` (12px) pro mesmo papel**: botão primário do Home é `rounded-xl`, do Sidebar é `rounded-lg`. **Decidir** qual é o "botão padrão". Sugestão: `rounded-lg` em todos os botões; `rounded-xl` só em cards de destaque (StatCards, capas).

2. **Padding de ícone dentro de header decorativo varia**: `w-7 h-7`, `w-8 h-8`, `w-9 h-9`, `w-10 h-10`, `w-14 h-14`. Sugestão: `w-7 h-7` (pequeno em badge), `w-9 h-9` (header de modal), `w-14 h-14` (hero/empty state).

3. **Uso de `font-mono`**: aparece em 4 lugares (`code` no Tiptap, kbd em Reescritor/LinkPicker, ANOTATA na capa de caderno, prompt EXCLUIR no NotebookDeleteModal). Manter — é decisão semântica.

4. **`tracking-wide` / `tracking-wider` / `tracking-tight`**: 3 níveis em uso. `tracking-wide` em uppercase de seção (ok), `tracking-wider` em badges minúsculas (`text-[10px] uppercase tracking-wider`), `tracking-tight` em `NotebookCover` no nome do caderno. Tudo coerente.

5. **`leading-relaxed` vs `leading-snug`**: ambos aparecem. `leading-relaxed` em texto corrente do Editor / Corretor (ok), `leading-snug` em mensagens curtas dentro de popover. Coerente.

6. **Animações**: `animate-fade-in`, `animate-pulse`, `pulse-soft`, `transition-all`, `transition-colors`, `transition-shadow`, `transition-sidebar`. Há padrão. Só observe que `transition-all` é mais caro de renderizar — usar `transition-colors` quando só muda cor (já é o padrão na maioria, ok).

---

## ✅ Sugestões Priorizadas

### 🚀 Imediatas (até 2 horas)

1. **Padronizar tamanhos de ícone em 3 valores (12, 14, 16)** — abrir os 17 arquivos que usam `<X size=...>`, escolher 1 tamanho por papel (header de modal = 16, header de popover = 14, fechar inline = 12) e bater. Idem pra Star, Plus, Trash2. **Ganho:** fim do "ruído visual" instantâneo.

2. **Adicionar `anotata-success` e `anotata-warn` ao `tailwind.config.js`** — declarar `success: '#0F7A3F'`, `success-bg: '#D4F4DD'`, `warn: '#9B6F00'`, `warn-bg: '#FFF4D9'`, `goiaba-bg: '#FCE7EB'`. Trocar literais nos arquivos. **Ganho:** uma cor de "concluído", uma de "atenção", uma de "erro" em todo o app.

3. **Trocar `#6B5E80` por `text-anotata-text-suave` em Timeline e App** — 4 ocorrências, 5 minutos. **Ganho:** elimina o conflito mais visível com a paleta declarada.

4. **Banir o amarelo Tailwind `text-yellow-500`** — substituir as 6 ocorrências de estrela favoritada por `text-anotata-goiaba` (ou declarar `anotata-favorite`). **Ganho:** paleta 100% lavanda/goiaba/roxo, sem gambiarra.

5. **Trocar `text-[12px]` (5 ocorrências) por `text-xs`** — mesma renderização, código mais limpo.

### 📅 Médio prazo (1 sessão dedicada)

1. **Criar componente `<IconButton>` reutilizável** com: `p-1.5`/`p-2`/`p-2.5` (3 tamanhos), `aria-label` obrigatório, `focus-visible:ring`, `disabled` tratado. Migrar `Toolbar`, `NoteMetaBar`, header do `Editor`, botões fixos do `App`. **Ganho enorme:** acessibilidade resolvida em ~40 botões de uma vez, código menor, padrão eterno.

2. **Documentar o sistema visual num arquivo `docs/UI-TOKENS.md`** — listar tamanhos de ícone (12/14/16), tipografia (xs/sm/base/lg/xl/2xl), espaçamentos (1/1.5/2/2.5/3/4/6/8), bordas (lg/xl/2xl/full), sombras (sm/md/xl/2xl). Cada projeto novo já nasce sabendo o que existe.

3. **Padronizar o "header de modal/popover"** num componente `<DialogHeader>` com slot pra ícone-em-quadrado-gradiente (sempre `w-9 h-9 rounded-xl bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro`), título (`text-sm font-semibold`), subtítulo (`text-[11px] text-anotata-muted`) e botão X consistente. Hoje `RephrasePanel`, `ConnectionMap`, `Corretor`, `ConnectionModal`, `TemplatePicker`, `LinkPickerPopover`, `RephrasePopover`, `GrammarPopover` cada um faz à sua maneira.

4. **Auditar contraste do `text-anotata-muted` sobre fundos claros** — onde for crítico (placeholder, hint), bater 4.5:1; onde for decorativo (timestamp), aceitar 3:1.

5. **Definir `transition-` global por categoria** — botão = `transition-colors duration-150`, card hover = `transition-all duration-200`, modal entrar/sair = `transition-all duration-300`. Hoje varia entre 150ms, 200ms, 300ms, 350ms sem critério.

---

## 🎨 Design Tokens Recomendados

```js
// tailwind.config.js — extends.colors (sugerido — mantém o oficial e formaliza o semântico)
colors: {
  anotata: {
    // === fundos ===
    bg: '#F2F1F4',
    sidebar: '#EDE8F2',
    card: '#FFFFFF',

    // === marca: roxo ===
    roxo: '#5B2D8E',
    'roxo-claro': '#7C4DC9',
    'roxo-escuro': '#3D1B66',

    // === marca: goiaba ===
    goiaba: '#E8637C',
    'goiaba-claro': '#F08AA0',
    'goiaba-escuro': '#C44862',
    'goiaba-bg': '#FCE7EB',         // NOVO — substitui as 4 variações rosa-pálido

    // === marca: lavanda ===
    lavanda: '#E0D7EC',
    'lavanda-clara': '#F0E9F8',

    // === texto ===
    text: '#2D1B4E',
    'text-suave': '#5B4A7A',         // único — vamos abolir #6B5E80
    muted: '#9888B5',

    // === bordas ===
    border: '#DCD2E8',
    'border-suave': '#EAE0F2',
    hover: '#E8DFF2',

    // === semânticos NOVOS (formalizando o que já é usado) ===
    success: '#0F7A3F',              // verde escuro: forte, concluída, revisada
    'success-bg': '#D4F4DD',         // verde claro: fundo de chip
    warn: '#9B6F00',                 // âmbar: média, amanhã, gerundismo
    'warn-bg': '#FFF4D9',            // âmbar claro: fundo de chip
    favorite: '#F0B400',             // dourado quente: estrela (substitui yellow-500 do Tailwind)

    // === aliases (compatibilidade — manter pra não quebrar) ===
    accent: '#E8637C',
    accent2: '#5B2D8E',
    green: '#5B2D8E',                // legado — considerar remover
  }
}

// fontSize sugerido (consolidado — 6 níveis padrão + 1 raro)
fontSize: {
  // mantemos o default do Tailwind:
  // xs: 0.75rem  (12px)
  // sm: 0.875rem (14px)
  // base: 1rem   (16px)
  // lg: 1.125rem (18px)
  // xl: 1.25rem  (20px)
  // 2xl: 1.5rem  (24px)
  // 3xl: 1.875rem (30px) — só pra splash/AuthGate
  '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px — substitui text-[10px] e text-[9px]/[11px]
}

// spacing sugerido — Tailwind default já cobre tudo, só usar:
// 0.5(2px), 1(4px), 1.5(6px), 2(8px), 2.5(10px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px)
// abolir todos os arbitrários como p-[7px] (não há nenhum hoje, só manter assim)

// borderRadius sugerido — 4 níveis + full
// rounded (4px), rounded-lg (8px), rounded-xl (12px), rounded-2xl (16px), rounded-full
// abolir rounded-md (uso ambíguo)

// boxShadow sugerido — 4 níveis
// shadow-sm  (botão, card selecionado)
// shadow-md  (hover de card)
// shadow-xl  (dropdown, popover de menu)
// shadow-2xl (modal, popover principal)
// usar shadow customizada só em casos absolutamente especiais — declarar no theme.boxShadow se for o caso
```

---

## 🎯 Conclusão

O ANOTATA tem alma. A paleta lavanda/roxo/goiaba é **sua marca**, e em 80% dos lugares isso aparece com clareza — Sidebar, Editor, Toolbar, capas dos cadernos, todos os popovers do Reescritor: belíssimos. Os pontinhos verdes e amarelos que aparecem nas conexões e prazos são proposital e funcionam — só falta declará-los oficialmente na paleta, em vez de espalhar literais como `'#0F7A3F'` em sete arquivos diferentes.

O ponto mais sensível, e o mais rápido de melhorar, é **acessibilidade básica**: o foco do teclado está invisível em quase 40 botões só com ícone. Não impacta quem usa mouse (que é quase sempre você), mas qualquer pessoa que tente navegar com Tab fica perdida, e o leitor de tela passa por cima. Criar um único componente `<IconButton>` que carregue `aria-label` obrigatório e `focus-visible:ring` resolve isso pra sempre — e reduz código em ~150 linhas espalhadas.

A segunda prioridade é o **caos de tamanhos de ícone**. Vinte e oito componentes, e um só ícone (`X`) aparece em oito tamanhos diferentes. Decidir três valores (12/14/16) e bater todos pra esses três tira metade da inconsistência visual do app de uma vez.

Você está construindo algo bonito e útil. As correções aqui não são defeitos, são polimento — o tipo de coisa que vai do projeto "pra mim" pro projeto "que dá orgulho de mostrar". E o melhor: tudo que esta auditoria sugere cabe em uma sessão de tarde, sem precisar mexer na lógica do app, só nas pontinhas. Pode contar comigo na próxima rodada.

---

*Relatório gerado pelo Design Mestre — auditor de UI do ANOTATA*
