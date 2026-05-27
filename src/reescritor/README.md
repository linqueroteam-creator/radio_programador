# Reescritor — Engine de reescrita PT-BR

Engine determinística que reescreve texto em português brasileiro
seguindo regras linguísticas curadas. **Sem IA, sem rede, 100% local.**

## Status

**Fase 1 — Fundação (v1.0.0-fase1)**

- Léxicos curados em `lexicons/`
- 4 transformers de regra em `rules/`
- 5 modos compostos em `modes/`
- API pública em `index.js`

## Estrutura

```
src/reescritor/
├── index.js              API pública
├── tokenizer.js          Tokenização PT-BR + utilitários de substituição
├── posLite.js            Identificação morfológica leve por sufixos
├── modes/                Os 5 modos do reescritor
│   ├── geral.js
│   ├── formal.js
│   ├── conciso.js
│   ├── fluente.js
│   └── simples.js
├── rules/                Transformers reusáveis
│   ├── synonyms.js       Substituição lexical
│   ├── connectors.js     Promove/rebaixa conectores por registro
│   ├── gerundism.js      Anti-gerundismo
│   └── redundancy.js     Remoção de pleonasmos
└── lexicons/             Dicionários curados (JSON)
    ├── sinonimos.json
    ├── conectores.json
    ├── gerundismos.json
    ├── coloquialismos.json
    ├── pleonasmos.json
    └── simplificacoes.json
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

| Modo | Filosofia |
|---|---|
| `geral` | Versão alternativa do mesmo texto, sem mudar o tom |
| `formal` | Como se você estivesse escrevendo um e-mail profissional |
| `conciso` | Diga a mesma coisa com menos palavras (meta: −15 a −30%) |
| `fluente` | Texto mais legível e direto |
| `simples` | Que qualquer pessoa entenda na primeira leitura |

## Roadmap

- **Fase 1 (atual):** Fundação com léxicos iniciais e transformers básicos
- **Fase 2:** UI dedicada (RephrasePanel) + voz passiva ↔ ativa + quebra de cláusulas
- **Fase 3:** Expansão dos léxicos para ~1500 entradas + edge cases + anti-cacofonia
- **Fase 4:** Documentação técnica completa em `docs/reescritor/`

## Princípios

1. **Determinístico** — mesmo texto + mesmo modo = mesmo resultado, sempre.
2. **Sem rede** — não chama API nenhuma; localStorage só pra cache se necessário.
3. **Conservador** — prefere não mexer a mexer mal. Cada regra é estreita e segura.
4. **Honesto** — não promete o que não entrega. UI deve dizer "Reescreve seguindo regras", não "paráfrase com IA".
5. **Resiliente** — se uma regra falhar, devolve o texto original. Nunca quebra o app.
