# Reescritor — Especificação Técnica

> **Documento oficial.** Versão 1.2.0-fase3 (Polimento + Expansão).

## 1. Visão Geral

O Reescritor é uma engine local de reescrita textual para português brasileiro.
Não usa IA, não consulta APIs externas, não armazena dados em servidor.
Toda a lógica é determinística e auditável.

## 2. Princípios de Design

| Princípio | Decisão técnica |
|---|---|
| **Determinismo** | Toda transformação é regra explícita ou lookup em dicionário. Mesmo input → mesmo output. |
| **Resiliência** | Cada regra envolve `try/catch`. Falha de uma regra não derruba a engine. |
| **Conservadorismo** | A engine prefere preservar o texto original a aplicar uma transformação duvidosa. |
| **Modularidade** | Cada regra é um módulo isolado, testável independente. Modos são composições de regras. |
| **Honestidade** | UI etiqueta o produto como "Reescreve seguindo regras linguísticas", nunca como "paráfrase com IA". |
| **Privacidade** | Nada sai do navegador. Sem telemetria, sem analytics, sem network. |

## 3. Arquitetura

```
                        rephrase(text, mode)
                                │
                                ▼
                ┌───────────────────────────────┐
                │   modes/<modo>.js (handler)   │
                └───────────────┬───────────────┘
                                │ compõe
                                ▼
              ┌───────────────────────────────────────────┐
              │                rules/*.js                 │
              │   synonyms · connectors · gerundism       │
              │   redundancy · voice · clauseSplit        │
              │   cacofonia · nominalizacao               │
              └───────────────────┬───────────────────────┘
                                  │ consulta
                                  ▼
              ┌───────────────────────────────────────────┐
              │              lexicons/*.json              │
              │      (dicionários curados PT-BR)          │
              └───────────────────────────────────────────┘

         tokenizer.js  ←  utilitário compartilhado de substituição
         posLite.js    ←  classificação morfológica leve por sufixos
                          + gerundToInfinitive / gerundToFuture / gerundToParticiple
```

## 4. Camadas

### 4.1. Léxicos (`lexicons/*.json`)

Dados puros. Não contêm lógica. São consultados pelos transformers.

| Arquivo | Conteúdo | v1 (Fase 1) | v2 (Fase 3) |
|---|---|---:|---:|
| `sinonimos.json` | Pares palavra → variantes, anotados por registro (informal/neutro/formal/simples) | 60 | **213** |
| `simplificacoes.json` | Pares palavra erudita → palavra comum (inspirado no SIMPLEX-PB 2.0) | 70 | **217** |
| `pleonasmos.json` | Pares forma redundante → forma enxuta | 96 | **189** |
| `coloquialismos.json` | Pares forma coloquial → forma padrão | 56 | **111** |
| `participios.json` | Particípios → 3ª pessoa do pretérito (para voz ativa) | 110 | **212** |
| `conectores.json` | 9 grupos lógicos (adversativo, conclusivo, …) com 4 níveis de registro cada | 9 grupos | 9 grupos |
| `gerundismos.json` | Padrões regex de gerundismo + exceções | 6 | 6 |
| `cacofonia.json` | **NOVO em F3.** Pares forma cacofônica → forma corrigida | — | **50** |
| `nominalizacao.json` | **NOVO em F3.** Pares verbo nominalizado ↔ verbo direto | — | **84** |
| **TOTAL ENTRADAS** | | **397** | **~1100** |

**Cada JSON tem campo `_meta`** documentando origem, versão, tamanho e fonte das entradas.

### 4.2. Tokenizador (`tokenizer.js`)

Funções:

- `tokenize(text)` → tokens com `{type, text, lower, start, end}`
- `detokenize(tokens)` → reconstrói o texto original
- `applySubstitutions(text, entries)` → motor de substituição com word boundary, preservação de capitalização e detecção de mudanças
- `preserveCapitalization(orig, repl)` → "Casa" → "Vivenda", "CASA" → "VIVENDA", "casa" → "vivenda"
- `wordCount(text)`, `words(text)`

Decisões PT-BR:

- Hífen interno é parte da palavra (`guarda-chuva`, `bem-vindo`)
- Apóstrofo é parte da palavra (`d'água`)
- Acentuação completa: `àáâãäéêëíïóôõöúüçÀÁÂÃÄÉÊËÍÏÓÔÕÖÚÜÇñÑ`

### 4.3. POS-Lite (`posLite.js`)

Identificação morfológica leve baseada em sufixos. Não é POS tagger profissional; é heurística suficiente para guiar transformações simples.

Funções:

- `classify(word)` → categoria morfológica
- `gerundToInfinitive(gerund)` → "enviando" → "enviar" (com lista de irregulares: pondo→pôr, sendo→ser, indo→ir, …)
- `gerundToFuture(gerund, person)` — **NOVO em F3.** "verificando" + 1ª pessoa singular → "verificarei". Suporta pessoas '1s', '3s', '1p', '3p' e verbos irregulares (fazer→farei, dizer→direi, trazer→trarei, pôr→porei, etc.)
- `gerundToParticiple(gerund)` — **NOVO em F3.** "revisando" → "revisado"; com irregulares (fazendo→feito, dizendo→dito, abrindo→aberto, etc.)
- `looksLikeParticiple(word)` → heurística para particípios passados
- `complexityScore(word)` → mede dificuldade de uma palavra (sílabas + sufixos eruditos)

### 4.4. Transformers (`rules/*.js`)

Cada arquivo exporta uma função pura `(text) → {result, changes}`.

| Arquivo | Função | Comportamento |
|---|---|---|
| `synonyms.js` | `applySynonyms(text, register)` | Substitui até 5 palavras por sinônimos do registro alvo. Conservador. |
| `connectors.js` | `shiftConnectors(text, target)` | Promove/rebaixa conectores em direção ao registro alvo, passando por níveis intermediários. |
| `gerundism.js` | `fixGerundism(text)` | Detecta padrões de gerundismo. **Em F3:** três estratégias por `id` do padrão — infinitivo (`vou estar X-ndo` → `vou X-ar`), futuro (`estarei X-ndo` → `X-rei`), particípio (`tenho estado X-ndo` → `tenho X-do`). |
| `redundancy.js` | `removeRedundancies(text)` | Lookup direto em `pleonasmos.json` com word boundary. |
| `voice.js` | `activeVoice(text)` | Voz passiva → ativa. **Em F3:** `buildAgent()` reconstrói o artigo correto: `pela criança` → `A criança` (substantivo comum), `pelo João` → `João` (nome próprio, drop article). |
| `clauseSplit.js` | `splitLongClauses(text)` | Quebra orações com mais de 25 palavras em pontos seguros (conectores adversativos/conclusivos). |
| `cacofonia.js` | `fixCacofonia(text)` | **NOVO em F3.** Lookup em `cacofonia.json` para corrigir cacofonias e maus encontros sonoros. Categorias: `pronome-objeto` (`vi ela` → `vi-a`), `som-feio` (`boca dela` → `a boca dela`, `alma minha` → `minha alma`), `redundancia-sonora` (`já já` → `logo`, `que que` → `que`). |
| `nominalizacao.js` | `verbalize(text)` / `nominalize(text)` | **NOVO em F3.** Bidirecional. `verbalize` encurta (`fez a análise` → `analisou`); `nominalize` formaliza (`decidiu` → `tomou a decisão`). |

Cada `change` tem `{from, to, rule, start, end}` para auditoria e UI futura.

### 4.5. Modos (`modes/*.js`)

Cada modo é uma sequência ordenada de transformers + parâmetros.

#### Modo Geral

```
1. fixGerundism
2. removeRedundancies
3. fixCacofonia          ← novo F3
4. applySynonyms('neutro')
```

#### Modo Formal

```
1. applySubstitutions(coloquialismos)
2. fixGerundism
3. removeRedundancies
4. fixCacofonia          ← novo F3
5. nominalize            ← novo F3 (eleva o registro)
6. shiftConnectors('formal')
7. applySynonyms('formal')
```

#### Modo Conciso

```
1. applySubstitutions(SHORT_FORMS)
2. verbalize             ← novo F3 (denominaliza, encurta)
3. removeRedundancies
4. fixGerundism
5. fixCacofonia          ← novo F3
6. limpeza de espaços duplicados
```

#### Modo Fluente

```
1. activeVoice
2. splitLongClauses
3. verbalize             ← novo F3
4. fixGerundism
5. fixCacofonia          ← novo F3
6. removeRedundancies
7. shiftConnectors('padrao')
```

#### Modo Simples

```
1. applySubstitutions(simplificacoes)
2. verbalize             ← novo F3
3. fixGerundism
4. removeRedundancies
5. fixCacofonia          ← novo F3
6. shiftConnectors('informal')
```

## 5. API Pública

```js
import { rephrase, MODES, ENGINE_VERSION, diffSummary } from './reescritor';

rephrase(text, mode='geral') → { result, changes, stats }
diffSummary(before, after) → { wordsAdded, wordsRemoved, charsAdded, charsRemoved, ... }
```

`stats` inclui: `wordsBefore`, `wordsAfter`, `charsBefore`, `charsAfter`, `changesCount`, `mode`, `engineVersion`.

## 6. Garantias

1. **Nunca quebra o app.** A função `rephrase` é envolvida em `try/catch` no nível mais alto. Em caso de erro, devolve o texto original com `stats.error`.
2. **Não modifica HTML.** A engine recebe e devolve texto puro. A integração com o editor (Tiptap) acontece em camada superior.
3. **Não armazena nada.** Léxicos são importados como JSON estático no bundle. Sem `localStorage` no escopo da engine.
4. **Não chama rede.** Zero `fetch`, zero `XMLHttpRequest`, zero `WebSocket`.

## 7. Critérios de Aceite

### Fase 1 (Fundação)

- [x] `rephrase("vou estar enviando", "geral")` → `"vou enviar"`
- [x] `rephrase("subir pra cima", "geral")` → `"subir"`
- [x] `rephrase("tô feliz", "formal")` → `"estou feliz"`
- [x] `rephrase("efetuar a tarefa", "simples")` → `"fazer a tarefa"`
- [x] `rephrase("a fim de que possa", "conciso")` → `"para que possa"`

### Fase 2 (UI + voz ativa + quebra)

- [x] Modal `RephrasePanel` integrado à toolbar do editor (botão 🔄)
- [x] 5 chips de modo lado a lado, preview em tempo real
- [x] `activeVoice("O bolo foi comido pela criança")` produz frase ativa válida
- [x] `splitLongClauses` quebra frases com >25 palavras em pontos de conector

### Fase 3 (Polimento + Expansão)

- [x] Bug 1 corrigido: `rephrase("estarei verificando o pedido", "geral")` → `"verificarei o pedido"` (não mais `"estarei verificar"`)
- [x] Bug 2 corrigido: `rephrase("O bolo foi comido pela criança", "fluente")` → `"A criança comeu o bolo"` (artigo preservado em substantivo comum)
- [x] Léxicos expandidos: total ~1100 entradas (de ~400 na F1)
- [x] Transformer `cacofonia.js`: corrige `vi ela`, `boca dela`, `alma minha`, `já já`, etc.
- [x] Transformer `nominalizacao.js`: bidirecional `fez a análise` ↔ `analisou`
- [x] 20 testes em `__tests__/phase3.test.js` passando
- [x] Build `npm run build` sem erros, sem aumento desproporcional do bundle

## 8. Roadmap

| Fase | Foco | Status |
|---|---|---|
| **1** | Fundação: léxicos iniciais + 4 transformers + 5 modos básicos | ✅ |
| **2** | UI (`RephrasePanel`) + voz passiva ↔ ativa + quebra de cláusulas + Tab para confirmar | ✅ |
| **3 (atual)** | Bug fixes + expansão dos léxicos para ~1100 entradas + anti-cacofonia + nominalização ↔ verbo | ✅ |
| **4 (futura)** | Documentação completa: `MODOS.md`, `LEXICONS.md`, `EXEMPLOS.md`, `ROADMAP.md` |  |
| **5 (futura)** | Modo personalizado: o usuário compõe sua própria sequência de transformers |  |

## 9. Como expandir os léxicos

Cada arquivo em `lexicons/` é um JSON simples. Para adicionar entradas:

1. Edite o arquivo correspondente
2. Mantenha `_meta.count` atualizado
3. Documente a fonte da nova entrada no `_meta.source`
4. Rode `npm test` para garantir que nada quebrou
5. Commit isolado por tipo de léxico

**Não use IA para gerar entradas.** Toda entrada deve ser revisada por humano com referência a um manual de redação ou gramática reconhecida (Cegalla, Bechara, Cunha & Cintra, Pasquale, Sacconi, Cipro Neto).

## 10. Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| `1.0.0-fase1` | maio/2026 | Fundação: 6 léxicos, 4 transformers, 5 modos. ~400 entradas. |
| `1.1.0-fase2` | maio/2026 | UI integrada (`RephrasePanel`). Voz passiva→ativa. Quebra de cláusulas. |
| `1.2.0-fase3` | maio/2026 | Bug fixes (gerundismo no futuro, voz passiva preserva artigo). Léxicos expandidos (~1100 entradas). Cacofonia + nominalização. |
