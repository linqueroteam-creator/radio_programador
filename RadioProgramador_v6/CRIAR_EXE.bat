@echo off
chcp 65001 >nul 2>&1
title Radio Programador v6.0 - Criador de Executavel
color 0A

echo.
echo  ============================================================
echo   RADIO PROGRAMADOR v6.0 - Criador de Executavel (.exe)
echo   Windows 11
echo  ============================================================
echo.

:: Verifica se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Python nao encontrado!
    echo.
    echo  Instale o Python em: https://www.python.org/downloads/
    echo  IMPORTANTE: Marque "Add Python to PATH" durante a instalacao.
    echo.
    pause
    exit /b 1
)

echo  [1/3] Instalando PyInstaller...
echo.
pip install pyinstaller --upgrade --quiet
if errorlevel 1 (
    echo  [AVISO] Falha ao instalar PyInstaller. Tentando continuar...
)

echo.
echo  [2/3] Criando executavel do INSTALADOR...
echo         (Isso pode levar 1-2 minutos)
echo.
pyinstaller --onefile --windowed --name "RadioProgramador_Setup" --clean instalador.py
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao criar o executavel do instalador.
    echo  Verifique se o PyInstaller esta instalado corretamente.
    pause
    exit /b 1
)

echo.
echo  [3/3] Criando executavel do PROGRAMA PRINCIPAL...
echo         (Isso pode levar 1-2 minutos)
echo.
pyinstaller --onefile --windowed --name "RadioProgramador" --clean radio_programador.py
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha ao criar o executavel do programa.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   PRONTO! Executaveis criados com sucesso.
echo  ============================================================
echo.
echo   Arquivos gerados na pasta "dist\":
echo.
echo     dist\RadioProgramador_Setup.exe  (Instalador)
echo     dist\RadioProgramador.exe        (Programa principal)
echo.
echo   Como usar:
echo     1. Copie os 2 arquivos .exe para onde quiser
echo     2. Execute RadioProgramador_Setup.exe para instalar
echo        (ele instala dependencias e cria atalho)
echo     3. Ou execute RadioProgramador.exe diretamente
echo        (precisa ter as dependencias ja instaladas)
echo.
echo   DICA: Clique direito no .exe e escolha
echo         "Executar como administrador" para funcoes completas.
echo.
echo  ============================================================
echo.
pause
