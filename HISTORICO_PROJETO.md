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

— última atualização: Pacote 5 Final entregue
