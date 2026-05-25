@echo off
chcp 65001 >nul 2>&1
title Radio Programador v7.0 — Gerador de Executavel
color 0A

echo.
echo  ======================================================
echo   RADIO PROGRAMADOR v7.0 PREMIUM
echo   Gerador de Executavel Unico (.exe)
echo  ======================================================
echo.
echo   Este script gera UM UNICO ARQUIVO .exe do programa.
echo   Aguarde... isso leva de 3 a 6 minutos.
echo.

:: Verificar Python
echo   [1/4] Verificando Python...
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

:: Instalar dependencias
echo   [2/4] Instalando dependencias...
pip install pyinstaller customtkinter scapy pywifi comtypes --upgrade --quiet 2>nul
echo          Dependencias instaladas!
echo.

:: Descobrir pasta do customtkinter
echo   [3/4] Localizando CustomTkinter...
for /f "tokens=*" %%i in ('python -c "import customtkinter; import os; print(os.path.dirname(customtkinter.__file__))" 2^>^&1') do set CTK_PATH=%%i
echo          Encontrado: %CTK_PATH%
echo.

:: Gerar .exe
echo   [4/4] Gerando executavel (3-6 minutos)...
echo.

pyinstaller --onefile --windowed --clean --noconfirm ^
    --name "RadioProgramador" ^
    --uac-admin ^
    --add-data "%CTK_PATH%;customtkinter/" ^
    --hidden-import customtkinter ^
    --hidden-import tkinter ^
    --hidden-import PIL ^
    --hidden-import concurrent.futures ^
    --exclude-module matplotlib ^
    --exclude-module numpy ^
    --exclude-module pandas ^
    --exclude-module scipy ^
    --exclude-module notebook ^
    radio_programador_v7.py

if errorlevel 1 (
    echo.
    echo   ERRO ao gerar o executavel!
    echo   - Desative o antivirus temporariamente
    echo   - Verifique espaco em disco
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
echo  ======================================================
echo.

start "" "PRONTO"
pause
