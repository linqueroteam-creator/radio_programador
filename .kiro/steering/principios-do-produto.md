# Princípios do Produto — NotePulse

> Estas são regras INVIOLÁVEIS do produto. Aplicáveis a qualquer feature, refator ou decisão técnica.

---

## 1. Tela limpa é prioridade absoluta

O NotePulse é extensão cognitiva da mente humana. A tela tem que ser **espaço de pensamento, não de configuração**.

- Editor é texto puro. Sem campos de meta-dados visíveis (área da vida, caderno, tags) — esses são preenchidos em background pelo Agente.
- Modais, banners e popups são **último recurso**. Só quando a ação é destrutiva e irreversível (apagar projeto, por exemplo).
- Toolbars são **mínimas**. Cada botão deve justificar sua existência.

## 2. Automatização agressiva

> **Princípio de ouro:** o sistema deve fazer pelo usuário tudo que conseguir inferir. Botão manual é último recurso.

Para cada feature nova, perguntar:
- Posso inferir esse valor pelo contexto?
- Posso ter um padrão sensato em vez de pedir escolha?
- Posso fazer em background sem o usuário pedir?

Se a resposta for sim a qualquer uma → automatize.

### O que deve ser automatizado (Agente Inteligente Local):

| Função | Como decide |
|---|---|
| Inferir área da vida da nota | LifeAreaSuggester (palavras-chave) |
| Vincular nota órfã ao caderno mais provável | Palavras compartilhadas + área inferida |
| Detectar conexões entre notas | Termos compartilhados, similaridade |
| Sugerir título da nota | Primeiro sintagma significativo |
| Agrupar cadernos em projetos | Padrão de uso + tema |
| Detectar duplicatas / notas similares | Cosine similarity de bag-of-words |
| Sugerir tags / palavras-chave | TF-IDF local |

### Regras do Agente:
- Roda **silencioso em background** (Web Worker preferencial)
- Disparado em: criação/edição de nota, idle do app
- Decisões **reversíveis** — usuário pode mover, desfazer
- **Nunca pede permissão.** Apenas faz.
- Sem IA externa — só lógica local (regra fundacional do projeto: sem IA externa exceto LanguageTool)

## 3. Decisões reversíveis, não confirmações

Em vez de:
> "Tem certeza que quer fazer X?" → [OK] [Cancelar]

Faça:
> X feito. (Pode desfazer com Ctrl+Z ou ação visual)

Confirmações só para ações destruidoras de longo prazo (apagar projeto inteiro, limpar dados).

## 4. Nada de jargão técnico em inglês visível ao usuário

- "Notebook" → Caderno
- "Project" → Projeto
- "Tag" → Etiqueta
- "Sync" → Sincronizar
- Estrutura interna pode usar inglês, mas UI sempre em português com analogia visual.

## 5. Mantém metáforas do produto vivas

Núcleo, Órbita, Pulso, Sinapse, Receptor, Retomada — não são decoração, são vocabulário do produto.

- Mapa → ecossistema cognitivo, não gráfico técnico
- Conexões → sinapses, não linhas
- Notas → pulsos, não cards
- Centro → núcleo / "MEU ESPAÇO", não dashboard

## 6. Performance é função neurocognitiva

Lentidão prejudica continuidade de pensamento. Qualquer feature deve ser pensada com:
- React.memo em componentes que renderizam listas
- Hover deferido com useDeferredValue
- Animações pausam durante interação pesada (drag, scroll rápido)
- Pan/zoom via DOM direto quando possível
- Lazy load do que não está visível (LOD — Level of Detail)

## 7. Modelo visual aprovado da nota é INTOCÁVEL sem pedido explícito

A nota visual (página branca pura + tag colorida discreta dentro + borda branca delicada + dobra de canto + estrelinha de favorito + 5 linhas simuladas) está aprovada pelo usuário em 28/05/2026 (PR #19 + #18 + #17). **NÃO redesenhar sem pedido explícito.**

Esse modelo é a base do "pulso" — qualquer mudança visual nas notas precisa de aprovação direta.

## 8. Pasta `estrutura_neurocognitiva_mestre/` é bússola conceitual obrigatória

Antes de qualquer decisão visual, de UX, de comportamento, de animação ou de identidade, **CONSULTAR** a pasta `estrutura_neurocognitiva_mestre/`.

Esta pasta contém 30+ arquivos com a base teórica e prática do produto, organizados em camadas:
- **Camada 1 — Fundamentos perceptivos** (NeuroDesign, NeuroVisual, NeuroUX, NeuroCognição, NeuroArquitetura, etc.)
- **Camada 2 — Áreas avançadas** (NeuroProdutividade, NeuroRetomada, NeuroOrquestração, NeuroDecisão, etc.)
- **Decisões fundacionais** (Regra de Cor, Áreas da Vida)
- **Roadmap** (FEEDBACK-USUARIO-R3)

### Processo obrigatório antes de implementar:

1. **Identificar** quais camadas a feature toca (ex: hover de uma nota → NeuroInteração + NeuroEnergia + NeuroFeedback)
2. **Ler** os arquivos relevantes (começar pelo `README.md` da pasta para o índice)
3. **Aplicar** as decisões respeitando o que cada camada governa
4. **Evitar** o que cada arquivo lista como "o que evitar"

### Quando NÃO se aplica:

- PRs puramente técnicos sem impacto visual/UX (ex: refator de modelo de dados, otimização de performance interna, migração de schema)
- Hotfixes de bugs que não envolvem decisão de design

### Referência rápida das camadas mais usadas:

| Tipo de decisão | Camadas a consultar |
|---|---|
| Cor de qualquer elemento | `regra-de-cor.md`, `02-neurovisual.md`, `10-neuroestetica.md` |
| Animação de elemento | `09-neurointeracao.md`, `13-neuroenergia.md`, `11-neurotemporal.md` |
| Hover/feedback | `09-neurointeracao.md`, `06-neurociencia-atencao.md` |
| Posicionamento espacial | `16-neuropercepcao-espacial.md`, `05-neuroarquitetura.md` |
| Comportamento do agente | `19-neurocomportamento.md`, `27-neuroorquestracao.md`, `28-neurodecisao.md` |
| Retomada/continuidade | `26-neuroretomada.md`, `14-neurofluxo.md`, `12-neuromemoria.md` |
| Áreas da vida | `areas-da-vida.md` |

---

## Quando essa regra vira "exceção"

Só quando o usuário pede explicitamente: "deixa um botão pra isso, não automatiza". Aí documenta o porquê.

---

**Última atualização:** 28/05/2026 — adição da Regra 8 (consultar pasta `estrutura_neurocognitiva_mestre/` antes de decisões visuais/UX). Versão inicial gerada após diálogo com o usuário sobre hierarquia + agente inteligente + manter modelo visual da nota.
