# ANOTATA - Como Usar

## O que é?
ANOTATA é seu app pessoal de anotações, igual ao Evernote, rodando no seu computador.

## Como instalar e usar:

### Opção 1: Usar no navegador (mais fácil)
1. Baixe o ZIP e extraia a pasta
2. Abra a pasta `dist` que está dentro
3. Abra o arquivo `index.html` no seu navegador (Chrome, Edge, etc)
4. Pronto! Suas notas ficam salvas no navegador automaticamente.

### Opção 2: Gerar executável para Windows (avançado)
1. Instale o Node.js (nodejs.org)
2. Abra o terminal na pasta do projeto e rode: `npm install`
3. Depois rode: `npm run electron:build`
4. O executável ANOTATA.exe estará na pasta `dist-electron`

## Funcionalidades:
- ✏️ Editor rico (negrito, itálico, listas, checklists, imagens, cores)
- 📓 Cadernos para organizar
- 🏷️ Tags para categorizar
- ⭐ Favoritos
- 🗑️ Lixeira com restauração
- 🔍 Busca por texto e tags
- 🤖 Porta aberta para IA (conecte sua IA no futuro)
- 💾 Salva tudo automaticamente

## Sobre a IA:
A porta está aberta no arquivo `electron/main.js`.
Quando quiser conectar sua IA, edite a função `ai-request`.
Ações preparadas: resumir, expandir, traduzir, sugerir.
