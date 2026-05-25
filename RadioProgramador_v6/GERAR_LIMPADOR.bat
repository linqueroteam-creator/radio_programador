@echo off
chcp 65001 >nul 2>&1
title Radio Programador — Gerador do Limpador de Rastros
color 0C

echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║   RADIO PROGRAMADOR — LIMPADOR DE RASTROS             ║
echo  ║   Gerador de Executavel Unico (.exe)                  ║
echo  ╚════════════════════════════════════════════════════════╝
echo.
echo   Este script gera o arquivo LimparRastros.exe
echo   que remove todos os rastros de instalacoes anteriores.
echo.
echo   Aguarde... isso leva de 1 a 3 minutos.
echo.
echo  ────────────────────────────────────────────────────────
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 1: Verificar Python
:: ═══════════════════════════════════════════════════════════
echo   [1/3] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ╔══════════════════════════════════════════════════╗
    echo   ║  ERRO: Python nao encontrado!                   ║
    echo   ║                                                  ║
    echo   ║  Instale em: python.org/downloads                ║
    echo   ║  Marque "Add Python to PATH" na instalacao!      ║
    echo   ╚══════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo          %%i encontrado!
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 2: Instalar PyInstaller
:: ═══════════════════════════════════════════════════════════
echo   [2/3] Preparando o empacotador...
pip install pyinstaller --upgrade --quiet 2>nul
if errorlevel 1 (
    python -m pip install pyinstaller --upgrade --quiet 2>nul
)
echo          Empacotador pronto!
echo.

:: ═══════════════════════════════════════════════════════════
:: PASSO 3: Gerar o .exe
:: ═══════════════════════════════════════════════════════════
echo   [3/3] Gerando LimparRastros.exe...
echo          (Aguarde 1-3 minutos)
echo.

pyinstaller --onefile --windowed --clean --noconfirm ^
    --name "LimparRastros" ^
    --uac-admin ^
    --exclude-module matplotlib ^
    --exclude-module numpy ^
    --exclude-module pandas ^
    --exclude-module PIL ^
    --exclude-module scipy ^
    --hidden-import tkinter ^
    --hidden-import tkinter.messagebox ^
    --hidden-import winreg ^
    --hidden-import shutil ^
    --hidden-import ctypes ^
    limpar_rastros.py

if errorlevel 1 (
    echo.
    echo   ╔══════════════════════════════════════════════════╗
    echo   ║  ERRO ao gerar o executavel!                    ║
    echo   ║                                                  ║
    echo   ║  Possivel causa:                                 ║
    echo   ║  - Antivirus bloqueando (desative temporario)    ║
    echo   ║  - Falta de espaco em disco                      ║
    echo   ╚══════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

:: ═══════════════════════════════════════════════════════════
:: Organizar
:: ═══════════════════════════════════════════════════════════
if not exist "PRONTO" mkdir "PRONTO"
if exist "dist\LimparRastros.exe" (
    move /Y "dist\LimparRastros.exe" "PRONTO\LimparRastros.exe" >nul
)

:: Limpar lixo de build
if exist "build" rmdir /s /q "build" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1
if exist "LimparRastros.spec" del /q "LimparRastros.spec" >nul 2>&1

echo.
echo  ╔════════════════════════════════════════════════════════╗
echo  ║                                                        ║
echo  ║   PRONTO! Limpador gerado com sucesso!                ║
echo  ║                                                        ║
echo  ╠════════════════════════════════════════════════════════╣
echo  ║                                                        ║
echo  ║   Seu arquivo esta em:                                 ║
echo  ║                                                        ║
echo  ║      PRONTO\LimparRastros.exe                         ║
echo  ║                                                        ║
echo  ║   Dois cliques nele e ele limpa tudo!                  ║
echo  ║   O Windows vai pedir permissao automaticamente.       ║
echo  ║                                                        ║
echo  ╚════════════════════════════════════════════════════════╝
echo.

start "" "PRONTO"

pause
