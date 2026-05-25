@echo off
chcp 65001 >nul 2>&1
title Radio Programador v6.0 — Gerador de Executavel
color 0A

echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║   RADIO PROGRAMADOR v6.0                              ║
echo  ║   Gerador de Executavel Unico (.exe)                  ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
echo   Este script gera UM UNICO ARQUIVO .exe do programa.
echo   Depois de pronto, voce so precisa desse arquivo!
echo.
echo   Aguarde... isso leva de 2 a 5 minutos.
echo.
echo  ────────────────────────────────────────────────────────
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 1: Verificar se o Python esta instalado
:: ═══════════════════════════════════════════════════════════
echo   [1/4] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ╔══════════════════════════════════════════════════╗
    echo   ║  ERRO: Python nao encontrado!                   ║
    echo   ║                                                  ║
    echo   ║  Instale em: python.org/downloads                ║
    echo   ║  IMPORTANTE: Marque a caixa                      ║
    echo   ║  "Add Python to PATH" na instalacao!             ║
    echo   ╚══════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo          %%i encontrado!
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 2: Instalar PyInstaller (empacotador)
:: ═══════════════════════════════════════════════════════════
echo   [2/4] Preparando o empacotador...
pip install pyinstaller --upgrade --quiet 2>nul
if errorlevel 1 (
    echo          Tentando metodo alternativo...
    python -m pip install pyinstaller --upgrade --quiet 2>nul
)
echo          Empacotador pronto!
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 3: Instalar dependencias do programa
:: ═══════════════════════════════════════════════════════════
echo   [3/4] Instalando bibliotecas necessarias...
pip install scapy pywifi comtypes speedtest-cli --quiet 2>nul
echo          Bibliotecas instaladas!
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 4: Gerar o .exe unico
:: ═══════════════════════════════════════════════════════════
echo   [4/4] Gerando o executavel...
echo          (Isso pode levar 2-5 minutos, aguarde!)
echo.

pyinstaller --onefile --windowed --clean --noconfirm ^
    --name "RadioProgramador" ^
    --version-file "versao.rc" ^
    --uac-admin ^
    --exclude-module matplotlib ^
    --exclude-module numpy ^
    --exclude-module pandas ^
    --exclude-module PIL ^
    --exclude-module scipy ^
    --exclude-module notebook ^
    --exclude-module jupyter ^
    --hidden-import tkinter ^
    --hidden-import tkinter.ttk ^
    --hidden-import tkinter.messagebox ^
    --hidden-import tkinter.scrolledtext ^
    --hidden-import tkinter.filedialog ^
    --hidden-import tkinter.simpledialog ^
    --hidden-import concurrent.futures ^
    radio_programador.py

if errorlevel 1 (
    echo.
    echo   ╔══════════════════════════════════════════════════╗
    echo   ║  ERRO ao gerar o executavel!                    ║
    echo   ║                                                  ║
    echo   ║  Possivel causa:                                 ║
    echo   ║  - Antivirus bloqueando (desative temporario)    ║
    echo   ║  - Falta de espaco em disco                      ║
    echo   ║  - Arquivo em uso por outro programa             ║
    echo   ╚══════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

:: ═══════════════════════════════════════════════════════════
:: PASSO 5: Organizar — mover o .exe para pasta PRONTO
:: ═══════════════════════════════════════════════════════════
echo.
if not exist "PRONTO" mkdir "PRONTO"
if exist "dist\RadioProgramador.exe" (
    move /Y "dist\RadioProgramador.exe" "PRONTO\RadioProgramador.exe" >nul
)

:: Limpar arquivos temporarios de build
if exist "build" rmdir /s /q "build" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1
if exist "RadioProgramador.spec" del /q "RadioProgramador.spec" >nul 2>&1

echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║                                                        ║
echo  ║   PRONTO! Executavel gerado com sucesso!              ║
echo  ║                                                        ║
echo  ╠════════════════════════════════════════════════════════╣
echo  ║                                                        ║
echo  ║   Seu arquivo esta em:                                 ║
echo  ║                                                        ║
echo  ║      PRONTO\RadioProgramador.exe                      ║
echo  ║                                                        ║
echo  ║   Copie esse arquivo para onde quiser.                 ║
echo  ║   E so dar dois cliques para abrir o programa!        ║
echo  ║                                                        ║
echo  ║   O Windows vai pedir permissao de Administrador      ║
echo  ║   automaticamente (tela escura com "Sim/Nao").        ║
echo  ║                                                        ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
echo   Dica: Voce pode deletar toda esta pasta agora.
echo         So precisa do RadioProgramador.exe!
echo.

:: Abrir a pasta PRONTO no Explorador de Arquivos
start "" "PRONTO"

pause
