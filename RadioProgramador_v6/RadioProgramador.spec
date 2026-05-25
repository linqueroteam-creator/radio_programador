# -*- mode: python ; coding: utf-8 -*-
# ============================================================
#  RADIO PROGRAMADOR v6.0 — Configuracao de Build
#  Gera um UNICO arquivo .exe para Windows 11
# ============================================================

import sys
import os

block_cipher = None

a = Analysis(
    ['radio_programador.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'tkinter',
        'tkinter.ttk',
        'tkinter.messagebox',
        'tkinter.scrolledtext',
        'tkinter.filedialog',
        'tkinter.simpledialog',
        'hashlib',
        'hmac',
        'struct',
        'threading',
        'socket',
        'json',
        'random',
        'urllib.request',
        'urllib.error',
        'concurrent.futures',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'scipy',
        'notebook',
        'jupyter',
        'pytest',
        'unittest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='RadioProgramador',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,              # Sem janela preta de terminal
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    uac_admin=True,             # Pede permissao de Administrador automaticamente
    version_info={
        'FileVersion': (6, 0, 0, 0),
        'ProductVersion': (6, 0, 0, 0),
        'FileDescription': 'Radio Programador - Auditoria Wi-Fi',
        'ProductName': 'Radio Programador',
        'CompanyName': 'Radio Programador',
        'LegalCopyright': '2025',
        'OriginalFilename': 'RadioProgramador.exe',
    } if sys.platform == 'win32' else None,
)
