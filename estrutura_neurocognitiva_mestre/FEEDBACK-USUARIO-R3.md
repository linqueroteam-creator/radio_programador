# 📋 Feedback Usuário — Pós Mapa Ecossistema R3

> Registro fiel dos pontos levantados pelo usuário após validação visual do **Mapa Ecossistema R3** (premium UI/UX, PR #10).
> Estes são os próximos passos a tratar — ordenados por prioridade e dimensão neurocognitiva.

Data: **28 de maio de 2026**, após deploy do R3.

---

## Avaliação geral

> "Melhorou muito, mas muito mesmo."

R3 aprovado como direção, mas com refinamentos necessários antes de avançar.

---

## 🟣 Ponto 1 — Regras de cor (NeuroCor Simbólica + NeuroSemiótica)

**Conceito futuro:** cada cor das anotações terá um significado cognitivo.

Exemplo bruto:
- **Vermelho** = algo grave que precisa de revisão urgente
- **Amarelo** = atenção / em revisão
- **Verde** = algo bacana / saudável / concluído
- (paleta completa a definir)

A cor pode ser transmitida em:
- Cor de fundo da nota
- Detalhes do design
- Bolinhas/partículas que orbitam ou fluem
- Cor da conexão emanada

**Ação pendente:**
- Pesquisar **NeuroVisual** + **NeuroCor Simbólica** + **NeuroSemiótica Cromática** para definir paleta semântica final
- Criar documento próprio: `regra-de-cor.md` na pasta `estrutura_neurocognitiva_mestre/`
- Não implementar até a regra estar fechada

> "Não precisa se limitar a uma cor."

---

## 🟣 Ponto 2 — Notas (Pulsos) ainda muito quadradas

**Estado R3:** retângulo com cantos pouco arredondados + faixa de cor no topo + linhas de texto + dobra de canto.

**Pedido:**
- **Arredondar mais as pontas** seguindo o branding
- **Trocar o ícone de "lápis" por ícone de FOLHA** (faz mais sentido com o conceito de caderno)
- Manter o estilo de "papel" mas com identidade do branding lavanda/roxo/goiaba

**Ação pendente:**
- Ajustar `border-radius` da nota (papel)
- Trocar ícone `Pencil` → `FileText` ou ícone customizado de folha
- Revisar harmonia visual nota ↔ caderno (cadernos da Home têm bordas suaves)

---

## 🟣 Ponto 3 — Escalabilidade infinita (CRÍTICO)

**Preocupação principal:** "Como vai ser quando tiver 10, 50, 100, 500 anotações?"

**Diagnóstico do usuário:**
- Hoje 2 cadernos = bonito
- 5 a 8 cadernos = ainda funciona
- 50 a 100 cadernos = não dá mais para subdividir só por título
- **Solução proposta:** entrar com **NÚCLEOS** = áreas da vida

**Conceito de Núcleos (áreas da vida):**
- Em vez de listar cadernos no 1º anel, listar **8 a 13 áreas da vida**
- Cada núcleo = um círculo com ícone representando uma área
- Cores diferentes por área (regra de cor — ver Ponto 1)
- Conforme o usuário cria notas, elas se posicionam **automaticamente** no campo magnético da área correspondente
- Forma uma **árvore neural infinita**

**Áreas da vida (a pesquisar profundamente):**
- Saúde
- Finanças
- Relacionamentos
- Carreira / Profissional
- Espiritualidade
- Lazer / Hobbies
- Família
- Educação / Conhecimento
- Casa / Ambiente
- Crescimento pessoal
- (a confirmar via pesquisa neurocognitiva — usuário lembra que são 8 a 13)

**Ação pendente:**
- Pesquisa profunda das 8–13 áreas da vida (apoiada em NeuroIdentidade + NeuroEcologia Cognitiva + NeuroOrquestração)
- Definir paleta de cor por área (ver Ponto 1 + Regra de cor)
- Criar componente `Nucleo` que substitui ou coexiste com `Caderno` no 1º anel
- Lógica de posicionamento automático de notas dentro do núcleo correspondente

---

## 🟣 Ponto 4 — Performance de renderização

**Preocupação:** quando tiver 500+ notas, animações não podem afetar navegação.

**Diretrizes:**
- Pulsos de luz nas linhas precisam ter limite (apenas em hover ou em N notas mais ativas)
- Curvas Bezier com oscilação contínua só em elementos visíveis no viewport
- Lazy rendering para notas fora do viewport (zoom out + pan)
- Cadernos com mais notas concentram visual; cadernos esquecidos são "fantasmas leves"

**Ação pendente:**
- Implementar virtualização SVG para notas fora do viewport
- Limitar animações ativas baseado em densidade
- Profile + benchmark com 100 e 500 notas mockadas

---

## 🟣 Ponto 5 — Caderno abre como um leque

**Conceito:** ao clicar num caderno (ou núcleo), as notas/pulsos **se abrem como um leque** (animação radial expansiva).

**Subdivisão necessária:**
- Caderno com 100 páginas? Subdividir em conjuntos lógicos
- Lógica de fechamento total (recolher leque)
- Conceito "**ui barba o cheese**" — a interpretar (provavelmente animação tipográfica/sequencial)

**Ação pendente:**
- Definir gesto/clique de abertura
- Animação de fan-out (leque) usando GSAP-like timing puro CSS
- Lógica de subdivisão de leque quando >20 páginas
- Botão de "fechar caderno" que recolhe tudo

---

## 🟣 Ponto 6 — Avatar (foto de perfil) com bugs

**Problemas relatados:**
- Não centraliza a foto corretamente
- Sem ajustes finos (zoom, posição dentro do círculo)
- Bugs no upload

**Ação pendente:**
- Adicionar editor de avatar com pan/zoom dentro do crop circular
- Salvar offset + escala junto da foto base64
- Testar com fotos retangulares (paisagem e retrato)

---

## 🟣 Ponto 7 — Fundo: profundidade tipo "universo"

**Pedido:**
- Mais profundidade no fundo
- Efeito de "viajar no universo" — partículas/pontos sutis criando paralaxe
- **Não usar cor preta** — manter na família roxo/lavanda escuro
- Delicado e sutil

**Ação pendente:**
- Camadas de partículas com paralaxe (3 camadas em velocidades diferentes durante pan)
- Estrelas/poeira cósmica em tom roxo claro/lavanda muito sutil
- Não competir com o conteúdo do mapa

**Áreas neurocognitivas:** NeuroPresença + NeuroAtmosfera + NeuroEspaço Vivo + NeuroDimensionalidade

---

## 🟣 Ponto 8 — Mapa como portal principal

**Visão:** essa página vai ser o **site inteiro do Note Pulse**.

**Pedido:**
- Quero conseguir navegar e fazer tudo dentro dela
- Botões discretos para entrar em modos (editor, lista, etc.)
- A tela do mapa = a tela principal de uso do app

**Ação pendente:**
- Adicionar barra de comando flutuante (Ctrl+K dentro do mapa)
- Editor abre num overlay sobre o mapa (não substitui)
- Lista lateral retrátil
- Mapa permanece **sempre como contexto de fundo**

---

## 🟣 Ponto 9 — "Volta com a casa das nossas energias"

**Compromisso do usuário:** essa tela é a representação do projeto inteiro do Note Pulse.

**Ação pendente:**
- Trabalhar a tela do mapa como **homepage cognitiva** do produto
- Estabilizar UI/UX dessa tela como base antes de avançar para outras telas
- Tudo no Note Pulse deriva da linguagem visual desta tela

---

## Ordem sugerida de implementação

| # | Ação | Risco | Impacto |
|---|------|-------|---------|
| 1 | Pasta `estrutura_neurocognitiva_mestre/` (ESTA TURNA) | Zero | Fundacional |
| 2 | Documento `regra-de-cor.md` baseado em pesquisa NeuroCor | Zero | Fundacional |
| 3 | Documento `areas-da-vida.md` (núcleos 8–13) | Zero | Fundacional |
| 4 | Refinar nota: arredondar pontas + ícone folha | Baixo | Visual imediato |
| 5 | Avatar com pan/zoom de crop | Baixo | UX direto |
| 6 | Fundo "universo" com paralaxe sutil | Baixo | Atmosfera |
| 7 | Núcleos (áreas da vida) coexistindo com cadernos | Médio | Estrutural |
| 8 | Caderno abre como leque | Médio | Comportamento |
| 9 | Performance / virtualização para 500+ notas | Alto | Escalabilidade |
| 10 | Mapa como portal (editor em overlay, etc.) | Alto | Refundação |

---

— Documento registrado em **28 de maio de 2026** após validação visual do Mapa Ecossistema R3.
