# Reescritor — Especificação Técnica

> **Documento oficial.** Versão 1.0.0-fase1 (Fundação).

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
              ┌───────────────────────────────────┐
              │           rules/*.js              │
              │  synonyms · connectors · gerund   │
              │           redundancy              │
              └─────────────────┬─────────────────┘
                                │ consulta
                                ▼
              ┌───────────────────────────────────┐
              │         lexicons/*.json           │
              │   (dicionários curados PT-BR)     │
              └───────────────────────────────────┘

         tokenizer.js  ←  utilitário compartilhado de substituição
         posLite.js    ←  classificação morfológica leve por sufixos
```

## 4. Camadas

### 4.1. Léxicos (`lexicons/*.json`)

Dados puros. Não contêm lógica. São consultados pelos transformers.

| Arquivo | Conteúdo | v1 (Fase 1) |
|---|---|---:|
| `sinonimos.json` | Pares palavra → variantes, anotados por registro (informal/neutro/formal/simples) | 60 entradas |
| `conectores.json` | 9 grupos lógicos (adversativo, conclusivo, …) com 4 níveis de registro cada | 9 grupos |
| `gerundismos.json` | Padrões regex de gerundismo + exceções | 6 padrões |
| `coloquialismos.json` | Pares forma coloquial → forma padrão | 56 entradas |
| `pleonasmos.json` | Pares forma redundante → forma enxuta | 96 entradas |
| `simplificacoes.json` | Pares palavra erudita → palavra comum (inspirado no SIMPLEX-PB 2.0) | 70 entradas |

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
- `looksLikeParticiple(word)` → heurística para particípios passados
- `complexityScore(word)` → mede dificuldade de uma palavra (silabas + sufixos eruditos)

### 4.4. Transformers (`rules/*.js`)

Cada arquivo exporta uma função pura `(text) → {result, changes}`.

| Arquivo | Função | Comportamento |
|---|---|---|
| `synonyms.js` | `applySynonyms(text, register)` | Substitui até 5 palavras por sinônimos do registro alvo. Conservador. |
| `connectors.js` | `shiftConnectors(text, target)` | Promove/rebaixa conectores em direção ao registro alvo, passando por níveis intermediários. |
| `gerundism.js` | `fixGerundism(text)` | Detecta padrões "vou estar X-ndo", converte para "vou X-ar". |
| `redundancy.js` | `removeRedundancies(text)` | Lookup direto em `pleonasmos.json` com word boundary. |

Cada `change` tem `{from, to, rule, start, end}` para auditoria e UI futura.

### 4.5. Modos (`modes/*.js`)

Cada modo é uma sequência ordenada de transformers + parâmetros.

#### Modo Geral

```
1. fixGerundism
2. removeRedundancies
3. applySynonyms('neutro')
```

#### Modo Formal

```
1. applySubstitutions(coloquialismos)
2. fixGerundism
3. removeRedundancies
4. shiftConnectors('formal')
5. applySynonyms('formal')
```

#### Modo Conciso

```
1. applySubstitutions(SHORT_FORMS) — locuções longas → curtas
2. removeRedundancies
3. fixGerundism
4. limpeza de espaços duplicados
```

#### Modo Fluente (Fase 1: subset)

```
1. fixGerundism
2. removeRedundancies
3. shiftConnectors('padrao')
```

> Fase 2 adiciona: voz passiva → ativa, quebra de cláusulas longas, anti-cacofonia.

#### Modo Simples

```
1. applySubstitutions(simplificacoes)
2. fixGerundism
3. removeRedundancies
4. shiftConnectors('informal')
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

## 7. Critérios de Aceite (Fase 1)

- [x] `rephrase("vou estar enviando", "geral")` → `"vou enviar"`
- [x] `rephrase("subir pra cima", "geral")` → `"subir"`
- [x] `rephrase("tô feliz", "formal")` → `"estou feliz"`
- [x] `rephrase("efetuar a tarefa", "simples")` → `"fazer a tarefa"`
- [x] `rephrase("a fim de que possa", "conciso")` → `"para que possa"`
- [x] Engine carrega em ambiente Node sem erros de import
- [x] Engine carrega no bundle do app sem aumentar significativamente o tamanho
- [x] Smoke test do app não detecta crash de hooks após inclusão da engine

## 8. Roadmap

| Fase | Foco |
|---|---|
| **1 (atual)** | Fundação: léxicos iniciais + 4 transformers + 5 modos básicos |
| **2** | UI (`RephrasePanel`) + voz passiva ↔ ativa + quebra de cláusulas + Tab para confirmar |
| **3** | Expansão dos léxicos para 1500+ entradas + anti-cacofonia + nominalização ↔ verbo |
| **4** | Documentação completa: `MODOS.md`, `LEXICONS.md`, `EXEMPLOS.md`, `ROADMAP.md` |

## 9. Como expandir os léxicos

Cada arquivo em `lexicons/` é um JSON simples com array de entradas. Para adicionar:

1. Edite o arquivo correspondente
2. Mantenha `_meta.count` atualizado
3. Documente a fonte da nova entrada no `_meta.source`
4. Rode o smoke test
5. Commit isolado por tipo de léxico

**Não use IA para gerar entradas.** Toda entrada deve ser revisada por humano com referência a um manual de redação ou gramática reconhecida (Cegalla, Bechara, Cunha & Cintra, Pasquale, Sacconi).
