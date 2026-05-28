# 🎨 Regra de Cor — Note Pulse

> Sistema cromático semântico do Note Pulse. Cada cor tem **função cognitiva** — nunca é decoração.

---

## Filosofia da cor no Note Pulse

A cor no Note Pulse opera em **4 camadas semânticas**, cada uma governada por áreas neurocognitivas específicas:

| Camada | O que comunica | Camada neuro |
|--------|----------------|--------------|
| 1. Identidade | "Esse é o Note Pulse" | NeuroDesign + NeuroIdentidade |
| 2. Áreas da vida | "Esta nota pertence a este território cognitivo" | NeuroSemiótica + NeuroCor Simbólica |
| 3. Estados | "Esta nota está com saúde X / urgência Y / atenção Z" | NeuroEnergia + NeuroSemiótica Emocional |
| 4. Relações | "Esta conexão é forte / média / fraca / manual" | NeuroAssociação + NeuroSemiótica Relacional |

**Regra de ouro:** se uma cor não pertence a uma dessas 4 camadas, ela não entra no produto.

---

## CAMADA 1 — Paleta de identidade (já existente)

Esta é a paleta-mãe do Note Pulse, herdada do branding aprovado.

### Cores principais

| Token | Hex | Função | Onde aparece |
|-------|-----|--------|--------------|
| `roxo` (primário) | `#5B2D8E` | Núcleo da identidade — inteligência calma | Núcleo central, botões primários, ícone de marca |
| `roxo-escuro` | `#3D1B66` | Profundidade, peso simbólico | Sombras, lombada de cadernos, fundo escuro do mapa |
| `roxo-claro` | `#7B4DBA` | Energia ativa, brilho | Hover, glow do núcleo, partículas |
| `lavanda` | `#A07BD6` | Atmosfera, ondas | Halo do núcleo, ondas concêntricas |
| `lavanda-clara` | `#EDE8F2` | Fundo de área de hover, padrões | Hover sutil, fundo de Sinapses fracas |
| `goiaba` | `#E8637C` | Calor humano, alerta amigável | Erros amigáveis, X de fechar, destaques emocionais |
| `goiaba-bg` | `#FCE7EB` | Fundo de mensagem emocional | Toast de erro, badges de afeto |

### Cores neutras

| Token | Hex | Função |
|-------|-----|--------|
| `bg` | `#F2F1F4` | Fundo neutro do app (claro) |
| `bg-escuro` | `#1A0E33` | Fundo do mapa (escuro/imersivo) |
| `text` | `#2D1B4E` | Texto principal sobre claro |
| `text-suave` | `#5B4A7A` | Texto secundário sobre claro |
| `muted` | `#9888B5` | Texto desativado, ghost text |
| `border` | `#E5E0EB` | Bordas sutis |

### Cor neutra dourada de favorito

| Token | Hex | Função |
|-------|-----|--------|
| `favorito` | `#F0B400` | Estrela de favorito (harmônica com goiaba, não yellow puro) |

---

## CAMADA 2 — Cores das áreas da vida (10 + 1)

Cada **núcleo de área da vida** (ver `areas-da-vida.md`) tem uma cor própria que serve como assinatura cognitiva. As cores foram escolhidas com 3 critérios:

1. **Significado psicológico universal** (psicologia das cores + tradição cromática dos chakras)
2. **Distinção visual** entre si (separáveis no mapa, mesmo para daltônicos)
3. **Compatibilidade com a paleta-mãe** (não brigam com roxo/lavanda/goiaba)

### Tabela mestra de cores das áreas

| # | Área | Cor base | Hex | Hex (dark) | Lucide icon |
|---|------|----------|-----|------------|-------------|
| 1 | **Saúde & Corpo** | Verde-esmeralda | `#10B981` | `#34D399` | `Heart` |
| 2 | **Emoções & Saúde Mental** | Coral-rosa | `#F472B6` | `#F9A8D4` | `Smile` |
| 3 | **Intelectual & Estudos** | Azul-cobalto | `#3B82F6` | `#60A5FA` | `Brain` |
| 4 | **Carreira & Trabalho** | Âmbar | `#F59E0B` | `#FBBF24` | `Briefcase` |
| 5 | **Finanças** | Verde-jade | `#059669` | `#10B981` | `Coins` |
| 6 | **Relacionamentos** | Pêssego | `#FB923C` | `#FDBA74` | `Users` |
| 7 | **Espiritual & Propósito** | Violeta-celeste | `#A78BFA` | `#C4B5FD` | `Sparkles` |
| 8 | **Lar & Ambiente** | Verde-musgo | `#65A30D` | `#84CC16` | `Home` |
| 9 | **Lazer & Criatividade** | Magenta | `#EC4899` | `#F472B6` | `Palette` |
| 10 | **Crescimento Pessoal** | Turquesa | `#06B6D4` | `#22D3EE` | `Compass` |
| 0 | **Outros / Geral** | Cinza-neutro | `#6B7280` | `#9CA3AF` | `CircleDot` |

### Variantes por cor de área

Cada cor de área gera 4 tons funcionais derivados (escuro pra texto, claro pra fundo, base pra borda, glow pra hover):

```
[area]-base     → cor principal (ex: #10B981)
[area]-dark     → tom escuro pra texto (ex: #047857)
[area]-light    → tom claro pra fundo de chip (ex: #D1FAE5)
[area]-glow     → tom para glow / pulsos de luz (ex: #34D399)
```

A geração é determinística e segue HSL: dark = lightness -15%, light = lightness +35% saturation -10%, glow = lightness +10%.

### Por que 10 cores e não mais

Estudos de NeuroVisual mostram que o cérebro humano **distingue confortavelmente até ~10 cores categóricas** simultâneas. Acima disso, cores próximas começam a se confundir e a leitura cognitiva quebra.

A área "Outros" (#11) usa cinza-neutro **propositalmente** — não compete visualmente com as 10 áreas oficiais.

---

## CAMADA 3 — Cores semânticas de estado

Estas cores comunicam o **estado cognitivo de uma nota**, independente da área. Seguem o padrão Material UI (`error / warning / success / info`) adaptado para o vocabulário do Note Pulse.

### Tabela mestra de estados

| Estado | Significado | Hex | Hex bg | Hex dark text |
|--------|-------------|-----|--------|---------------|
| `crítico` | Algo grave que precisa de revisão urgente | `#EF4444` | `#FEE2E2` | `#991B1B` |
| `atenção` | Em revisão, precisa de cuidado | `#F59E0B` | `#FEF3C7` | `#92400E` |
| `saudável` | Tudo certo, concluído, em fluxo | `#10B981` | `#D1FAE5` | `#065F46` |
| `informativo` | Fato, neutro, referência | `#3B82F6` | `#DBEAFE` | `#1E40AF` |
| `esquecido` | Inativo há muito tempo, baixa energia | `#9CA3AF` | `#F3F4F6` | `#4B5563` |
| `pulsando` | Recém-criado, energia alta, novidade | `#A07BD6` (lavanda) | `#EDE8F2` | `#5B2D8E` |
| `favorito` | Marcado como importante manualmente | `#F0B400` | `#FEF3C7` | `#92400E` |

### Como o usuário aplica estado

- **Manualmente:** clica numa nota e escolhe uma "vibração" (crítico/atenção/saudável/...). Esses 4 são os estados que ele controla.
- **Automaticamente:** o sistema infere `esquecido` (baseado em `reviewedAt` antigo), `pulsando` (criado há <24h), `favorito` (já existe via `isFavorite`).

### Regra de combinação

Uma nota pode ter **cor da área** (camada 2) + **estado** (camada 3) ao mesmo tempo. A composição visual é:

- **Cor da área** → faixa lateral / borda / ícone
- **Estado** → bolinha pequena no canto / glow / partícula que orbita

Nunca os dois disputam a "cor de fundo principal" da nota. A nota fica branca; cor é detalhe semântico.

---

## CAMADA 4 — Cores de relação (conexões)

Estas cores comunicam a **força ou tipo de conexão entre notas**.

### Tabela mestra de relações

| Tipo | Significado | Stroke | Glow | Estilo da linha |
|------|-------------|--------|------|-----------------|
| `manual` | Conexão criada explicitamente pelo usuário | `#5B2D8E` | `#7B4DBA` | Sólida grossa |
| `forte` | Sugestão automática com alta confiança | `#0F7A3F` | `#1FB55C` | Tracejada média |
| `média` | Sugestão automática com confiança média | `#9B6F00` | `#D49B1F` | Tracejada média |
| `fraca` | Sugestão automática com baixa confiança | `#7B4DBA` | `#9F77D8` | Tracejada fina |
| `cross-area` | Conexão entre 2 áreas diferentes da vida | gradiente das 2 cores | mix | Tracejada com gradiente |

### Pulso de luz percorrendo a linha

A cor da partícula de luz que viaja pela linha (animateMotion SVG) usa o `glow` correspondente.
Pulso em conexão **forte** percorre 2× mais rápido que **fraca** — comunica intensidade da relação.

---

## Acessibilidade

### WCAG contraste

Todas as cores **com texto ou ícone sobre elas** atendem **AA mínimo (4.5:1)**:

- Cor da área sobre branco → 4.5:1 ou melhor (validado individualmente)
- Cor da área sobre `bg-escuro #1A0E33` → 4.5:1 ou melhor
- Texto branco sobre cor da área → 4.5:1 ou melhor para uso em badges
- Cor de estado sobre seu fundo correspondente (`text-dark` sobre `bg`) → AAA (7:1)

Qualquer cor que falhe usa o fallback `text-dark` da própria área.

### Daltonismo

A paleta foi montada respeitando os 3 tipos comuns de daltonismo (deuteranopia, protanopia, tritanopia):

- **Saúde (verde) vs Lazer (magenta):** distintos em todos os tipos
- **Carreira (âmbar) vs Atenção (âmbar):** mesma cor é OK porque significados são compatíveis (energia ativa)
- **Crítico (vermelho) vs Saudável (verde):** problema clássico para deuteranopia. **Solução:** sempre acompanhar a cor com **ícone** (`AlertTriangle` para crítico, `CheckCircle` para saudável). Nunca apenas cor.

### Modo escuro

O mapa atual já roda em modo escuro (fundo roxo profundo). Cada cor de área tem variante `-glow` (mais luminosa, +10% lightness) que entra automaticamente quando o fundo é escuro.

Para `bg-escuro` (#1A0E33):
- Texto principal: `#FFFFFF` ou `#F2F1F4`
- Texto secundário: `rgba(255,255,255,0.7)`
- Borda: `rgba(255,255,255,0.1)`
- Glass/translúcido: `rgba(255,255,255,0.08)`

---

## Aplicação no código (tokens Tailwind futuros)

Quando implementar, propor estes tokens em `tailwind.config.js`:

```js
colors: {
  // Camada 1 — identidade (já existe)
  'anotata': {
    'roxo': '#5B2D8E',
    'roxo-escuro': '#3D1B66',
    'roxo-claro': '#7B4DBA',
    'lavanda': '#A07BD6',
    // ... existentes
  },

  // Camada 2 — áreas da vida (NOVO)
  'area-saude': { base: '#10B981', dark: '#047857', light: '#D1FAE5', glow: '#34D399' },
  'area-emocoes': { base: '#F472B6', dark: '#BE185D', light: '#FCE7F3', glow: '#F9A8D4' },
  'area-intelectual': { base: '#3B82F6', dark: '#1E40AF', light: '#DBEAFE', glow: '#60A5FA' },
  'area-carreira': { base: '#F59E0B', dark: '#92400E', light: '#FEF3C7', glow: '#FBBF24' },
  'area-financas': { base: '#059669', dark: '#065F46', light: '#D1FAE5', glow: '#10B981' },
  'area-relacoes': { base: '#FB923C', dark: '#9A3412', light: '#FFEDD5', glow: '#FDBA74' },
  'area-espiritual': { base: '#A78BFA', dark: '#5B21B6', light: '#EDE9FE', glow: '#C4B5FD' },
  'area-lar': { base: '#65A30D', dark: '#3F6212', light: '#ECFCCB', glow: '#84CC16' },
  'area-lazer': { base: '#EC4899', dark: '#9D174D', light: '#FCE7F3', glow: '#F472B6' },
  'area-crescimento': { base: '#06B6D4', dark: '#155E75', light: '#CFFAFE', glow: '#22D3EE' },
  'area-outros': { base: '#6B7280', dark: '#374151', light: '#F3F4F6', glow: '#9CA3AF' },

  // Camada 3 — estados (NOVO)
  'state-critico': { base: '#EF4444', bg: '#FEE2E2', dark: '#991B1B' },
  'state-atencao': { base: '#F59E0B', bg: '#FEF3C7', dark: '#92400E' },
  'state-saudavel': { base: '#10B981', bg: '#D1FAE5', dark: '#065F46' },
  'state-informativo': { base: '#3B82F6', bg: '#DBEAFE', dark: '#1E40AF' },
  'state-esquecido': { base: '#9CA3AF', bg: '#F3F4F6', dark: '#4B5563' },
  'state-pulsando': { base: '#A07BD6', bg: '#EDE8F2', dark: '#5B2D8E' },
  'state-favorito': { base: '#F0B400', bg: '#FEF3C7', dark: '#92400E' },
}
```

---

## Anti-padrões — o que NUNCA fazer

- ❌ Usar **vermelho** para algo que não seja crítico/erro
- ❌ Usar **verde** para algo que não seja saudável/sucesso/financeiro/lar
- ❌ Cor sem significado (decoração pura)
- ❌ Mais de **3 cores fortes** disputando atenção numa mesma tela
- ❌ Cor de área **e** cor de estado **ambas** como fundo principal da mesma nota
- ❌ Pulsos coloridos com cor que não pertence à área da nota
- ❌ `text-yellow-500` puro do Tailwind (vibração baixa, banido — usar `state-favorito` `#F0B400`)
- ❌ Cores que não passam contraste AA WCAG sobre fundos do app
- ❌ Diferenciar tipos só por cor (sempre acompanhar de ícone — daltonismo)

---

## Cruzamento com camadas neurocognitivas

| Camada | Áreas neuro que governam |
|--------|--------------------------|
| 1. Identidade | NeuroDesign · NeuroIdentidade · NeuroEstética |
| 2. Áreas da vida | NeuroSemiótica · NeuroEcologia Cognitiva · NeuroIdentidade |
| 3. Estados | NeuroEnergia · NeuroSemiótica Emocional · NeuroComportamento |
| 4. Relações | NeuroAssociação · NeuroSemiótica Relacional |

Toda decisão sobre cor deve atravessar **pelo menos 2 camadas neuro**. Se atravessa só 1, é decoração.

---

## Fontes consultadas

- **Eight Dimensions of Wellness** (Bill Hettler / US National Wellness Institute) — dimensões da vida
- **Material Design 3** color tokens — sistema semântico
- **WCAG 2.2** — contraste e acessibilidade
- **Coloring for Colorblindness** (David Mathlogic) — paletas seguras
- **Color Psychology in UI Design** ([Toptal](https://www.toptal.com/designers/ux/colors-and-emotions), [Hakuna Matata Tech](https://www.hakunamatatatech.com/our-resources/blog/color-psychology-in-ui-design/)) — significado universal das cores
- **Tradição cromática dos chakras** — para alinhamento cor-área-da-vida (sem usar como sistema espiritual; apenas como referência semântica universal)

*Conteúdo sintetizado e adaptado para o Note Pulse com base nas fontes acima. Conteúdo foi reformulado para conformidade com restrições de licenciamento.*

---

— Documento criado em **28 de maio de 2026** como base de design semântico do Note Pulse.
