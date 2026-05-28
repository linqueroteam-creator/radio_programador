# Checkpoint — Mapa Ecossistema Pessoal v1

> Registro do que viveu no projeto ANOTATA em **28 de maio de 2026**.
> Não é só log de commits. É memória do que foi atravessado.

---

## O que aconteceu hoje, em uma frase

O mapa visual deixou de mostrar **uma nota isolada no centro** e passou a mostrar **você no centro do seu próprio conhecimento**.

---

## A transformação, em duas imagens

**Antes:**
Você abria o mapa e via uma nota grande no meio, com setas saindo dela. O mapa era sobre *aquela nota específica*. Se você fechasse e abrisse outra nota, o mapa virava outro mapa. Não havia continuidade. Não havia você.

**Depois:**
Você abre o mapa e vê **MEU ESPAÇO** no centro — um círculo roxo com ícone de pessoa. Ao redor, em órbita próxima, os seus cadernos. Mais para fora, suas anotações, ligadas a cada caderno-mãe. E entre as anotações, fios curvos representando as conexões — manuais e sugeridas. Você não é mais convidado de uma nota. Você é o ponto de origem de tudo.

---

## A alma por trás dessa mudança

Esse projeto carrega herança do NotePulse — onde nasceram as metáforas vivas: **Núcleo, Órbita, Cérebro, Pulso, Sinapse, Receptor, Retomada.**

O mapa antigo trabalhava só com a metáfora de **conexão entre notas**. Funcionava, mas era um mapa sem dono. Faltava o **núcleo**.

A mudança de hoje trouxe o núcleo de volta. O centro não é mais um conteúdo — é um sujeito. Você. O ponto fixo que não muda enquanto tudo ao redor cresce.

Pra quem tem TDAH, isso não é detalhe estético. É arquitetura cognitiva. Uma mente que se espalha em mil direções precisa de um **centro de gravidade visível**. O mapa agora tem isso.

---

## O que está vivo agora no site

Quando você abre o mapa, encontra:

- **Nível 1 — Centro:** "MEU ESPAÇO" — gradiente roxo, ícone de pessoa, halo suave em volta. Sempre fixo, sempre presente.
- **Nível 2 — Primeiro anel:** seus cadernos, como cards quadrados arredondados com a cor de cada um e a contagem de notas.
- **Nível 3 — Segundo anel:** suas anotações, círculos brancos com o ícone do tipo (ideia, tarefa, decisão...) agrupados perto do caderno-pai.
- **Nível 4 — Conexões:** arcos curvos entre anotações. Sólido = manual. Tracejado = sugerido. Verde = forte. Âmbar = média. Roxo = fraca.
- **Estado vazio elegante:** se ainda não houver dados, aparece "Seu mapa ainda está começando." — sem julgar, só convidando a crescer.

---

## O lado técnico (pra retomada futura)

| Item | Valor |
|------|-------|
| Versão | Mapa Ecossistema Pessoal v1 |
| Data | 28 de maio de 2026 |
| Pull Request | #7 |
| Commit na main | `b22f77a` (merge do PR #7) |
| Commit na gh-pages | `7e89768` (deploy) |
| Bundle publicado | `assets/index-DcPv_cdj.js` + `assets/index-CCByfN9Y.css` |
| Arquivo único alterado | `src/components/ConnectionMap.jsx` (410 inserções, 288 remoções) |
| Build | OK em 3.53s |
| Testes | 44 vitest passando |
| Site | https://linqueroteam-creator.github.io/radio_programador/ |
| Estado validado pelo usuário | Sim, em 28/05/2026 — "MEU ESPAÇO" visível, hierarquia correta |

**Decisões técnicas tomadas:**
- 100% SVG nativo, zero dependência nova
- Layout radial: centro fixo + 2 anéis concêntricos com raios 200 e 400 (em viewBox 1000×1000)
- Notas espalhadas em arco de até ±60° ao redor do ângulo do caderno-pai (preserva pertencimento visual)
- Linhas estruturais (centro→caderno→nota) usam stroke sólido suave; conexões inter-notas usam arcos curvos com desvio do centro
- Hooks todos no topo, antes de qualquer return — Rules of Hooks respeitadas (lição do bug histórico de tela branca)

---

## Como voltar pra cá, se algo quebrar no futuro

**Cenário leve — bug visual sem tela branca:**
Refinar com PR novo, sem reverter. Rota normal.

**Cenário sério — quebrou o app:**
1. `git revert b22f77a` na main → cria commit que desfaz o PR #7
2. Empurra como PR rápido, merge
3. Deploy fast-forward na gh-pages com o build do estado anterior
4. Site volta ao estado do PR #6 em poucos minutos

**Cenário pânico — preciso voltar agora:**
1. `git revert 7e89768` direto na gh-pages
2. Site volta em ~30 segundos
3. Investiga depois, com calma

Em todos os casos: **zero force-push, zero perda de histórico**.

---

## O que ficou sem fazer (escolha consciente)

- O mapa ainda pode ganhar refinamento visual (você mesmo disse isso ao validar)
- Capas de caderno com ícone/cor escolhidos manualmente
- Modo escuro
- Linha do tempo dedicada
- Ditar nota por voz

Nenhum desses é dívida. São próximos capítulos possíveis.

---

## Assinatura humana

Hoje o ANOTATA deixou de ser um app de notas com mapa.
Virou um espaço com você no centro.

Essa diferença não cabe num diff de código. Por isso esse documento existe.

— registrado em 28 de maio de 2026, depois do deploy validado.
