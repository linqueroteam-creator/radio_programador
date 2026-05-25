# RADIO PROGRAMADOR v8.0 — ESPECIFICAÇÃO DEFINITIVA (ÂNCORA)

> Este documento é a ÚNICA fonte de verdade do projeto.
> Nada será implementado fora do que está aqui.
> Nada será esquecido do que está aqui.

---

## IDENTIDADE DO PRODUTO

- **Nome:** Radio Programador
- **Versão:** 8.0 Premium
- **Plataforma:** Windows 11 (64 bits)
- **Tecnologia:** Python + Pywebview (janela nativa) + HTML/CSS/JS (interface)
- **Entrega:** Arquivo .exe ÚNICO (gerado por GERAR_EXE.bat)
- **Público:** Instaladores de internet, técnicos de rede, programadores, usuários avançados
- **Propósito:** Auditoria completa de rede Wi-Fi — visualizar, bloquear, testar segurança

---

## ARQUITETURA TÉCNICA

```
RadioProgramador_v8/
├── app.py                    # Backend Python (pywebview + lógica de rede)
├── frontend/
│   ├── index.html            # SPA principal (todas as telas)
│   ├── css/
│   │   └── style.css         # Estilos premium (baseado nos mockups aprovados)
│   └── js/
│       └── app.js            # Frontend JS (chamadas ao backend via pywebview API)
├── GERAR_EXE.bat             # Gera o .exe único
└── LEIA_PRIMEIRO.txt         # Instruções de 3 passos
```

**Como funciona:**
- `app.py` abre uma janela nativa (pywebview) que renderiza o HTML
- O HTML é IDÊNTICO aos mockups aprovados (01-05)
- O JS chama funções Python via `window.pywebview.api.funcao()`
- O Python executa as operações reais (scan, bloqueio, velocidade, senha)
- Resultado volta pro HTML e atualiza a interface em tempo real

---

## FLUXO DE TELAS (em ordem)

### TELA 01 — BOAS-VINDAS
- Visual: mockup 01 aprovado (logo RP pulsando, gradiente roxo)
- Ação: botão "Vamos começar" → vai pra Tela 02
- Só aparece na PRIMEIRA vez que abre o programa

### TELA 02 — TERMOS DE USO
- Visual: mockup 02 aprovado (modal com checkbox custom)
- Ação: só libera o programa ao marcar checkbox + clicar "Continuar"
- Salva preferência em arquivo local (não mostra de novo)

### TELA 03 — INSTALAÇÃO (WIZARD)
- Visual: mockup 03 aprovado (3 etapas, progress bar, tarefas)
- **FUNCIONAL DE VERDADE** — instala dependências reais:
  - Etapa 1: Verifica sistema (Python, admin, Windows 11)
  - Etapa 2: Instala bibliotecas (scapy, pywifi, comtypes)
  - Etapa 3: Verifica/instala Npcap (baixa última versão se não tiver)
- Mostra barra de progresso REAL e status de cada tarefa
- Se tudo já estiver instalado, pula automaticamente

### TELA 04 — DASHBOARD PRINCIPAL
- Visual: mockup 04 aprovado (cards + lista de dispositivos)
- É a tela principal do programa após instalação
- Contém TODAS as funcionalidades abaixo

---

## FUNCIONALIDADES REAIS (todas funcionando de verdade)

### F1 — RADAR DE REDES
- Escaneia e lista TODAS as redes Wi-Fi visíveis
- Mostra: SSID, sinal (%), canal, BSSID, tipo de segurança (WPA2/WPA3/WEP/Aberta)
- Usa: `netsh wlan show networks mode=bssid` + pywifi como fallback
- Atualiza ao clicar em "Buscar redes"

### F2 — DISPOSITIVOS NA REDE
- Escaneia todos os aparelhos conectados na mesma rede
- Mostra: IP, MAC, fabricante (tabela OUI), nome na rede
- Usa: ARP scan (scapy) se admin + npcap, senão ping sweep + arp -a
- Identifica o gateway (roteador) e o próprio computador automaticamente

### F3 — BLOQUEIO DE DISPOSITIVO (ARP Spoofing)
- Botão "BLOQUEAR" em cada dispositivo da lista
- Ao clicar: popup de confirmação → inicia ARP Spoofing
- Envia pacotes ARP falsos ao alvo E ao gateway continuamente
- Internet do dispositivo-alvo PARA de funcionar
- Animação de pulso vermelho (mockup 05) enquanto bloqueado
- Botão "DESBLOQUEAR" restaura ARP correto (5 pacotes de restauração)

### F4 — BLOQUEIO DE IP ESPECÍFICO
- Campo para digitar IP manualmente + botão "Bloquear IP"
- Mesmo mecanismo do F3, mas com IP inserido pelo usuário

### F5 — BLOQUEAR ROTEADOR
- Botão específico para bloquear o gateway da rede
- Resultado: TODA a rede perde internet (todos os dispositivos)
- Aviso de segurança antes de executar (popup vermelho)
- Usa ARP Spoofing direcionado ao gateway

### F6 — IDENTIFICADOR DE SENHA (Agente Especialista)
- Seleciona uma rede do radar → clica "Testar Segurança"
- Executa 5 métodos em sequência (do mais rápido ao mais lento):
  1. **Senhas salvas** — verifica se já está no perfil Windows (netsh)
  2. **PMKID Attack** — captura PMKID sem cliente (scapy), testa com wordlist
  3. **Handshake + Wordlist** — captura 4-way handshake, testa dicionário
  4. **WPS PIN** — se WPS habilitado, tenta brute-force do PIN
  5. **Pixie Dust** — se WPS vulnerável, recupera PIN em segundos
- Resultado mostra:
  - ✅ SENHA ENCONTRADA: [senha] — via [método/brecha]
  - Ou ❌ NÃO ENCONTRADA — rede segura (todas as brechas testadas)
- Para cada brecha explorada, mostra RECOMENDAÇÃO de como corrigir

### F7 — TESTE DE VELOCIDADE
- Mede download (Cloudflare), upload (httpbin), ping (8.8.8.8), sinal Wi-Fi
- Cards com cores adaptativas (verde=bom, amarelo=atenção, vermelho=ruim)
- Valores REAIS medidos no momento

### F8 — LIMPADOR DE RASTROS
- Botão no header (ícone 🧹)
- Popup que escaneia: pastas de instalação, atalhos, .cap temporários, cache
- Botão "Limpar tudo" remove o que encontrar
- Funcional de verdade (shutil.rmtree, os.remove)

### F9 — BOTÃO ELEVAR ADMIN
- Se não for admin, mostra botão "Elevar Administrador"
- Usa ctypes.windll.shell32.ShellExecuteW com "runas"
- Relança o programa com UAC automaticamente

---

## DEPENDÊNCIAS DO PROGRAMA

Todas instaladas automaticamente pelo Wizard (Tela 03):

| Pacote | Para que serve | Como instala |
|--------|---------------|--------------|
| pywebview | Janela nativa que renderiza HTML | pip install pywebview |
| scapy | Scan ARP, captura PMKID/handshake, ARP Spoofing | pip install scapy |
| pywifi | Scan de redes Wi-Fi como alternativa | pip install pywifi |
| comtypes | Dependência do pywifi no Windows | pip install comtypes |
| Npcap | Driver de captura de pacotes (Windows) | Baixa .exe do npcap.com |

---

## REGRAS DO PROJETO (NUNCA VIOLAR)

1. ❌ Nunca entregar código não testado como "pronto"
2. ❌ Nunca esquecer funcionalidades pedidas anteriormente
3. ❌ Nunca criar fragmentos soltos — tudo num programa só
4. ❌ Nunca usar visual diferente dos mockups aprovados
5. ✅ Sempre que terminar: link ZIP + 3 passos simples
6. ✅ Sempre funcional de verdade (exceto wizard que simula download se offline)
7. ✅ Sem jargão técnico em inglês nas mensagens ao usuário
8. ✅ Foco Windows 11 exclusivo
9. ✅ Um único .exe no final

---

## CHECKLIST DE VALIDAÇÃO FINAL

Antes de entregar, TODOS devem estar ✅:

- [ ] Programa abre sem erro
- [ ] Tela de boas-vindas aparece na primeira vez
- [ ] Termos funciona (checkbox → libera botão)
- [ ] Wizard detecta e instala dependências
- [ ] Dashboard carrega com visual premium
- [ ] Radar mostra redes reais (SSID, sinal, canal)
- [ ] Lista de dispositivos mostra IPs reais da rede
- [ ] Botão BLOQUEAR corta internet do dispositivo
- [ ] Botão DESBLOQUEAR restaura internet
- [ ] Bloquear IP manual funciona
- [ ] Bloquear roteador corta toda a rede
- [ ] Identificador de senha executa os 5 métodos
- [ ] Teste de velocidade mostra valores reais
- [ ] Limpador encontra e remove rastros
- [ ] Elevação de admin funciona (UAC)
- [ ] GERAR_EXE.bat produz .exe funcional
- [ ] Animação de pulso vermelho funciona nos bloqueados

---

## WORDLIST INTERNA (para teste de senha)

100 senhas mais comuns em redes brasileiras — embutida no programa:
12345678, 123456789, 1234567890, password, admin123, minhacasa, senha1234,
wifi1234, casa2024, casa2025, internet, wireless, vivo12345, claro1234,
tim123456, oi1234567, net12345, fibra1234, gvt123456, etc.

---

*Documento criado em 25/05/2026 — ÂNCORA FINCADA.*
*Qualquer mudança precisa de aprovação explícita do usuário.*
