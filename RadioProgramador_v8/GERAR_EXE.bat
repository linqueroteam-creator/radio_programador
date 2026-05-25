@echo off
chcp 65001 >nul 2>&1
title Radio Programador v8.0 — Gerador de Executavel
color 0A

echo.
echo  ======================================================
echo   RADIO PROGRAMADOR v8.0 PREMIUM
echo   Gerador de Executavel Unico (.exe)
echo  ======================================================
echo.
echo   Este script gera UM UNICO ARQUIVO .exe do programa.
echo   Aguarde... isso leva de 3 a 7 minutos.
echo.

:: [1/5] Verificar Python
echo   [1/5] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo   ERRO: Python nao encontrado!
    echo   Instale em: python.org/downloads
    echo   Marque "Add Python to PATH" na instalacao!
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo          %%i
echo.

:: [2/5] Instalar PyInstaller
echo   [2/5] Instalando empacotador (PyInstaller)...
pip install pyinstaller --upgrade --quiet 2>nul
echo          OK!
echo.

:: [3/5] Instalar dependencias do programa
echo   [3/5] Instalando dependencias do programa...
pip install pywebview[cef] scapy pywifi comtypes --upgrade --quiet 2>nul
echo          OK!
echo.

:: [4/5] Descobrir pasta do pywebview (para incluir no .exe)
echo   [4/5] Localizando bibliotecas...
for /f "tokens=*" %%i in ('python -c "import webview; import os; print(os.path.dirname(webview.__file__))" 2^>nul') do set WEBVIEW_PATH=%%i
echo          Pywebview: %WEBVIEW_PATH%
echo.

:: [5/5] Gerar o .exe
echo   [5/5] Gerando executavel (3-7 minutos)...
echo.

pyinstaller --onefile --windowed --clean --noconfirm ^
    --name "RadioProgramador" ^
    --uac-admin ^
    --add-data "frontend;frontend" ^
    --hidden-import webview ^
    --hidden-import clr ^
    --hidden-import System ^
    --hidden-import System.Windows.Forms ^
    --hidden-import System.Threading ^
    --hidden-import concurrent.futures ^
    --hidden-import scapy.all ^
    --hidden-import pywifi ^
    --hidden-import comtypes ^
    --collect-all webview ^
    --exclude-module matplotlib ^
    --exclude-module numpy ^
    --exclude-module pandas ^
    --exclude-module scipy ^
    --exclude-module notebook ^
    --exclude-module jupyter ^
    --exclude-module PIL ^
    app.py

if errorlevel 1 (
    echo.
    echo   ERRO ao gerar o executavel!
    echo   - Desative o antivirus temporariamente
    echo   - Verifique espaco em disco
    echo   - Tente: pip install pywebview[cef]
    echo.
    pause
    exit /b 1
)

:: Organizar
if not exist "PRONTO" mkdir "PRONTO"
if exist "dist\RadioProgramador.exe" (
    move /Y "dist\RadioProgramador.exe" "PRONTO\RadioProgramador.exe" >nul
)
if exist "build" rmdir /s /q "build" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1
if exist "RadioProgramador.spec" del /q "RadioProgramador.spec" >nul 2>&1

echo.
echo  ======================================================
echo   PRONTO! Arquivo gerado com sucesso!
echo.
echo   Seu executavel esta em:
echo      PRONTO\RadioProgramador.exe
echo.
echo   Copie esse arquivo para onde quiser.
echo   Dois cliques e o programa abre!
echo.
echo   O Windows vai pedir permissao de Administrador
echo   automaticamente (tela escura com "Sim/Nao").
echo  ======================================================
echo.

start "" "PRONTO"
pause
