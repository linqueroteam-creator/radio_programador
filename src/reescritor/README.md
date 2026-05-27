# Reescritor — Engine de reescrita PT-BR

Engine determinística que reescreve texto em português brasileiro
seguindo regras linguísticas curadas. **Sem IA, sem rede, 100% local.**

## Status

**Fase 3 — Polimento + Expansão (v1.2.0-fase3)**

- Léxicos curados em `lexicons/` (~1100 entradas)
- 8 transformers de regra em `rules/`
- 5 modos compostos em `modes/`
- API pública em `index.js`
- 20 testes passando em `__tests__/`

## Estrutura

```
src/reescritor/
├── index.js                  API pública
├── tokenizer.js              Tokenização PT-BR + utilitários de substituição
├── posLite.js                Identificação morfológica leve
│                              + gerundToInfinitive / gerundToFuture / gerundToParticiple
├── modes/                    Os 5 modos do reescritor
│   ├── geral.js
│   ├── formal.js
│   ├── conciso.js
│   ├── fluente.js
│   └── simples.js
├── rules/                    Transformers reusáveis
│   ├── synonyms.js           Substituição lexical
│   ├── connectors.js         Promove/rebaixa conectores por registro
│   ├── gerundism.js          Anti-gerundismo (3 estratégias)
│   ├── redundancy.js         Remoção de pleonasmos
│   ├── voice.js              Voz passiva → voz ativa
│   ├── clauseSplit.js        Quebra de cláusulas longas
│   ├── cacofonia.js          [F3] Anti-cacofonia
│   └── nominalizacao.js      [F3] Verbalize / nominalize bidirecional
├── lexicons/                 Dicionários curados (JSON)
│   ├── sinonimos.json        213 entradas
│   ├── conectores.json       9 grupos × 4 registros
│   ├── gerundismos.json      6 padrões
│   ├── coloquialismos.json   111 entradas
│   ├── pleonasmos.json       189 entradas
│   ├── simplificacoes.json   217 entradas
│   ├── participios.json      212 entradas
│   ├── cacofonia.json        [F3] 50 entradas
│   └── nominalizacao.json    [F3] 84 entradas
└── __tests__/
    └── phase3.test.js        20 testes (vitest)
```

## Uso

```js
import { rephrase, MODES } from './reescritor';

const r = rephrase('Vou estar enviando o relatório amanhã.', 'geral');
console.log(r.result);   // "Vou enviar o relatório amanhã."
console.log(r.changes);  // [{ from: 'vou estar enviando', to: 'vou enviar', rule: 'gerundism:vou-estar', ... }]
console.log(r.stats);    // { wordsBefore, wordsAfter, charsBefore, charsAfter, changesCount, mode, engineVersion }
```

## Modos

| Modo | Filosofia | Transformers (em ordem) |
|---|---|---|
| `geral` | Versão alternativa do mesmo texto, sem mudar o tom | gerundismo · pleonasmos · cacofonia · sinônimos(neutro) |
| `formal` | Como se você estivesse escrevendo um e-mail profissional | coloquialismos · gerundismo · pleonasmos · cacofonia · nominalize · conectores(formal) · sinônimos(formal) |
| `conciso` | Diga a mesma coisa com menos palavras (meta: −15 a −30%) | locuções curtas · verbalize · pleonasmos · gerundismo · cacofonia |
| `fluente` | Texto mais legível e direto | voz ativa · quebra de cláusulas · verbalize · gerundismo · cacofonia · pleonasmos · conectores(padrão) |
| `simples` | Que qualquer pessoa entenda na primeira leitura | simplificações · verbalize · gerundismo · pleonasmos · cacofonia · conectores(informal) |

## Transformers — quick reference

### Anti-gerundismo (3 estratégias)

| Padrão | Exemplo de entrada | Exemplo de saída | Estratégia |
|---|---|---|---|
| `vou-estar` | "vou estar enviando" | "vou enviar" | infinitivo |
| `ir-estar-base` | "irei estar verificando" | "irei verificar" | infinitivo |
| `preciso-estar` | "preciso estar enviando" | "preciso enviar" | infinitivo |
| `deveria-estar` | "deveria estar terminando" | "deveria terminar" | infinitivo |
| `estarei` | "estarei verificando" | "verificarei" | **futuro** |
| `tenho-estado` | "tenho estado revisando" | "tenho revisado" | **particípio** |

### Anti-cacofonia (3 categorias)

| Categoria | Exemplo de entrada | Exemplo de saída |
|---|---|---|
| `pronome-objeto` | "vi ela" | "vi-a" |
| `som-feio` | "boca dela" | "a boca dela" |
| `som-feio` | "alma minha" | "minha alma" |
| `redundancia-sonora` | "já já" | "logo" |

### Nominalização (bidirecional)

| Direção | Exemplo de entrada | Exemplo de saída | Usado em |
|---|---|---|---|
| `verbalize` | "fez a análise" | "analisou" | conciso, fluente, simples |
| `verbalize` | "tomou a decisão" | "decidiu" | conciso, fluente, simples |
| `nominalize` | "decidiu" | "tomou a decisão" | formal |
| `nominalize` | "iniciou" | "deu início a" | formal |

### Voz passiva → ativa

| Entrada | Saída | Observação |
|---|---|---|
| "O bolo foi comido pela criança" | "A criança comeu o bolo" | substantivo comum: artigo preservado |
| "O relatório foi enviado pelo João" | "João enviou o relatório" | nome próprio: artigo descartado |
| "A casa foi pintada pelo professor" | "O professor pintou a casa" | substantivo comum: artigo preservado |

## Roadmap

- ✅ **Fase 1:** Fundação com léxicos iniciais e transformers básicos
- ✅ **Fase 2:** UI dedicada (RephrasePanel) + voz passiva ↔ ativa + quebra de cláusulas
- ✅ **Fase 3 (atual):** Bug fixes + expansão dos léxicos para ~1100 entradas + cacofonia + nominalização
- 📋 **Fase 4 (futura):** Documentação técnica completa (MODOS, LEXICONS, EXEMPLOS, ROADMAP)
- 📋 **Fase 5 (futura):** Modo personalizado (usuário compõe seus próprios pipelines)

## Princípios

1. **Determinístico** — mesmo texto + mesmo modo = mesmo resultado, sempre.
2. **Sem rede** — não chama API nenhuma; localStorage só pra cache se necessário.
3. **Conservador** — prefere não mexer a mexer mal. Cada regra é estreita e segura.
4. **Honesto** — não promete o que não entrega. UI deve dizer "Reescreve seguindo regras", não "paráfrase com IA".
5. **Resiliente** — se uma regra falhar, devolve o texto original. Nunca quebra o app.

## Como rodar os testes

```bash
npx vitest run src/reescritor/__tests__/phase3.test.js
```
