"""
============================================================
  RADIO PROGRAMADOR — LIMPADOR DE RASTROS
  Remove todos os arquivos de instalacoes anteriores
  Windows 11
============================================================
"""

import tkinter as tk
from tkinter import messagebox
import os
import sys
import shutil
import winreg
import subprocess
import ctypes
import threading


# ── Cores (mesmo visual do Radio Programador) ──────────────
C = {
    "fundo":     "#0d1117",
    "fundo2":    "#161b22",
    "painel":    "#21262d",
    "verde":     "#39d353",
    "verde_dim": "#238636",
    "vermelho":  "#f85149",
    "amarelo":   "#e3b341",
    "azul":      "#58a6ff",
    "texto":     "#f0f6fc",
    "texto_dim": "#8b949e",
    "laranja":   "#ff7b29",
}


def is_admin():
    """Verifica se esta rodando como Administrador."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def reabrir_como_admin():
    """Relanca o programa com elevacao UAC."""
    script = os.path.abspath(sys.argv[0])
    python = sys.executable
    ctypes.windll.shell32.ShellExecuteW(
        None, "runas", python, f'"{script}"', None, 1
    )
    sys.exit(0)


# ============================================================
# MOTOR DE LIMPEZA
# ============================================================

class Limpador:
    """Busca e remove rastros de instalacoes anteriores."""

    def __init__(self):
        self.encontrados = []
        self.removidos = []
        self.erros = []

    def _add(self, tipo, caminho, descricao):
        self.encontrados.append({
            "tipo": tipo,
            "caminho": caminho,
            "desc": descricao,
        })

    def escanear(self):
        """Varre o sistema em busca de rastros."""
        self.encontrados = []
        self._pastas_instalacao()
        self._atalhos()
        self._arquivos_temporarios()
        self._cache_pyinstaller()
        self._registro_windows()
        self._pip_pacotes()
        return self.encontrados

    def _pastas_instalacao(self):
        """Busca pastas criadas pelo instalador."""
        locais = [
            os.path.join(os.environ.get("PROGRAMFILES", r"C:\Program Files"), "RadioProgramador"),
            os.path.join(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"), "RadioProgramador"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "RadioProgramador"),
            os.path.join(os.environ.get("APPDATA", ""), "RadioProgramador"),
            os.path.join(os.environ.get("USERPROFILE", ""), "RadioProgramador"),
            os.path.join(os.environ.get("USERPROFILE", ""), "Desktop", "RadioProgramador"),
            # Versoes anteriores
            os.path.join(os.environ.get("PROGRAMFILES", ""), "Radio Programador"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Radio Programador"),
        ]
        for pasta in locais:
            if pasta and os.path.isdir(pasta):
                self._add("pasta", pasta, f"Pasta de instalacao: {pasta}")

    def _atalhos(self):
        """Busca atalhos na area de trabalho e menu iniciar."""
        desktop = os.path.join(os.environ.get("USERPROFILE", ""), "Desktop")
        menu = os.path.join(os.environ.get("APPDATA", ""),
                           "Microsoft", "Windows", "Start Menu", "Programs")
        menu_all = r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"

        nomes = [
            "RadioProgramador.lnk",
            "Radio Programador.lnk",
            "RadioProgramador_Setup.lnk",
            "Radio Programador v6.lnk",
            "Radio Programador v5.lnk",
        ]

        for pasta_base in [desktop, menu, menu_all]:
            if not pasta_base or not os.path.isdir(pasta_base):
                continue
            for nome in nomes:
                caminho = os.path.join(pasta_base, nome)
                if os.path.isfile(caminho):
                    self._add("atalho", caminho, f"Atalho: {nome}")
            # Pasta no menu iniciar
            for sub in ["RadioProgramador", "Radio Programador"]:
                sub_path = os.path.join(pasta_base, sub)
                if os.path.isdir(sub_path):
                    self._add("pasta", sub_path, f"Pasta no menu: {sub}")

    def _arquivos_temporarios(self):
        """Busca arquivos temporarios (.cap, logs, build)."""
        temp = os.environ.get("TEMP", os.environ.get("TMP", ""))
        if not temp:
            return

        # Arquivos .cap de handshake
        try:
            for arq in os.listdir(temp):
                if arq.startswith("hs_") and arq.endswith(".cap"):
                    caminho = os.path.join(temp, arq)
                    self._add("arquivo", caminho, f"Captura temporaria: {arq}")
        except Exception:
            pass

        # Pastas _MEI do PyInstaller (executaveis antigos)
        try:
            for arq in os.listdir(temp):
                if arq.startswith("_MEI") or arq.startswith("_mei"):
                    caminho = os.path.join(temp, arq)
                    if os.path.isdir(caminho):
                        self._add("pasta", caminho, f"Cache de executavel antigo: {arq}")
        except Exception:
            pass

    def _cache_pyinstaller(self):
        """Busca cache de builds anteriores."""
        home = os.environ.get("USERPROFILE", "")
        if not home:
            return

        # Cache do PyInstaller
        cache_pi = os.path.join(home, "AppData", "Local", "pyinstaller")
        if os.path.isdir(cache_pi):
            self._add("pasta", cache_pi, "Cache do PyInstaller (builds antigos)")

        # Pasta build/ e dist/ que podem ter ficado
        for pasta_base in [home, os.path.join(home, "Desktop"),
                           os.path.join(home, "Downloads")]:
            for sub in ["RadioProgramador_v5", "RadioProgramador_v6",
                        "radio_programador-main", "radio_programador-v6-corrigido"]:
                caminho = os.path.join(pasta_base, sub)
                if os.path.isdir(caminho):
                    # Verifica se tem build/ ou dist/ dentro
                    for lixo in ["build", "dist", "__pycache__"]:
                        lixo_path = os.path.join(caminho, lixo)
                        if os.path.isdir(lixo_path):
                            self._add("pasta", lixo_path,
                                     f"Lixo de build: {sub}/{lixo}")

    def _registro_windows(self):
        """Busca entradas no Registro do Windows."""
        chaves = [
            (winreg.HKEY_CURRENT_USER,
             r"Software\RadioProgramador",
             "Configuracao do usuario"),
            (winreg.HKEY_LOCAL_MACHINE,
             r"SOFTWARE\RadioProgramador",
             "Configuracao do sistema"),
            (winreg.HKEY_CURRENT_USER,
             r"Software\Microsoft\Windows\CurrentVersion\Uninstall\RadioProgramador",
             "Entrada de desinstalacao (usuario)"),
            (winreg.HKEY_LOCAL_MACHINE,
             r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\RadioProgramador",
             "Entrada de desinstalacao (sistema)"),
        ]
        for hive, chave, desc in chaves:
            try:
                winreg.OpenKey(hive, chave)
                self._add("registro", f"{hive}\\{chave}", desc)
            except (FileNotFoundError, OSError):
                pass

    def _pip_pacotes(self):
        """Verifica pacotes pip instalados pelo Radio Programador."""
        # Nao remove automaticamente, so informa
        pacotes = ["scapy", "pywifi", "comtypes", "speedtest-cli"]
        instalados = []
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "list", "--format=columns"],
                capture_output=True, text=True, timeout=15
            )
            saida = result.stdout.lower()
            for pkg in pacotes:
                if pkg.lower().replace("-", "_") in saida.replace("-", "_"):
                    instalados.append(pkg)
        except Exception:
            pass

        if instalados:
            self._add("pacote", ", ".join(instalados),
                     f"Pacotes Python instalados: {', '.join(instalados)}")

    # ─── REMOCAO ─────────────────────────────────────────────
    def remover_tudo(self, callback=None):
        """Remove todos os rastros encontrados."""
        self.removidos = []
        self.erros = []
        total = len(self.encontrados)

        for i, item in enumerate(self.encontrados):
            if callback:
                callback(i + 1, total, item["desc"])

            try:
                if item["tipo"] == "pasta":
                    if os.path.isdir(item["caminho"]):
                        shutil.rmtree(item["caminho"], ignore_errors=True)
                        self.removidos.append(item)

                elif item["tipo"] == "arquivo" or item["tipo"] == "atalho":
                    if os.path.isfile(item["caminho"]):
                        os.remove(item["caminho"])
                        self.removidos.append(item)

                elif item["tipo"] == "registro":
                    self._remover_registro(item["caminho"])
                    self.removidos.append(item)

                elif item["tipo"] == "pacote":
                    # Remove pacotes pip
                    pacotes = item["caminho"].split(", ")
                    for pkg in pacotes:
                        subprocess.run(
                            [sys.executable, "-m", "pip", "uninstall", "-y", pkg],
                            capture_output=True, timeout=30
                        )
                    self.removidos.append(item)

            except Exception as e:
                self.erros.append({"item": item, "erro": str(e)})

        return self.removidos, self.erros

    def _remover_registro(self, caminho_str):
        """Remove chave do registro."""
        # Formato: HIVE\chave
        partes = caminho_str.split("\\", 1)
        if len(partes) < 2:
            return
        hive_str, chave = partes[0], partes[1]

        # Mapeia string para constante
        hives = {
            str(winreg.HKEY_CURRENT_USER): winreg.HKEY_CURRENT_USER,
            str(winreg.HKEY_LOCAL_MACHINE): winreg.HKEY_LOCAL_MACHINE,
        }
        hive = hives.get(hive_str)
        if not hive:
            return
        try:
            winreg.DeleteKey(hive, chave)
        except (FileNotFoundError, OSError):
            pass



# ============================================================
# INTERFACE GRAFICA
# ============================================================

class AppLimpador:

    def __init__(self, root):
        self.root = root
        root.title("Radio Programador — Limpador de Rastros")
        root.geometry("620x540")
        root.configure(bg=C["fundo"])
        root.resizable(False, False)

        self.limpador = Limpador()
        self.items_encontrados = []

        self._ui()

        # Auto-escanear ao abrir
        self.root.after(500, self._escanear)

    def _ui(self):
        # Header
        hdr = tk.Frame(self.root, bg=C["fundo2"], height=60)
        hdr.pack(fill='x')
        hdr.pack_propagate(False)

        tk.Label(hdr, text="  LIMPADOR DE RASTROS",
                 font=("Consolas", 15, "bold"),
                 bg=C["fundo2"], fg=C["vermelho"]).pack(side='left', pady=12)

        admin_txt = "ADMINISTRADOR" if is_admin() else "SEM ADMIN"
        admin_cor = C["verde"] if is_admin() else C["amarelo"]
        tk.Label(hdr, text=admin_txt,
                 font=("Consolas", 9, "bold"),
                 bg=C["fundo2"], fg=admin_cor).pack(side='right', padx=16)

        # Descricao
        tk.Label(self.root,
                 text="Remove todos os arquivos, pastas, atalhos e configuracoes\n"
                      "de instalacoes anteriores do Radio Programador.",
                 font=("Consolas", 9),
                 bg=C["fundo"], fg=C["texto_dim"],
                 justify='center').pack(pady=(12, 8))

        # Frame de resultados
        fr_res = tk.Frame(self.root, bg=C["painel"])
        fr_res.pack(fill='both', expand=True, padx=16, pady=(0, 8))

        tk.Label(fr_res, text="RASTROS ENCONTRADOS:",
                 font=("Consolas", 9, "bold"),
                 bg=C["painel"], fg=C["amarelo"]).pack(anchor='w', padx=12, pady=(10, 4))

        # Lista
        fr_lista = tk.Frame(fr_res, bg=C["fundo2"])
        fr_lista.pack(fill='both', expand=True, padx=12, pady=(0, 10))

        self.listbox = tk.Listbox(
            fr_lista, font=("Consolas", 9),
            bg=C["fundo2"], fg=C["texto"],
            selectbackground=C["vermelho"], selectforeground="#fff",
            relief='flat', borderwidth=0, highlightthickness=0,
            activestyle='none')
        scroll = tk.Scrollbar(fr_lista, orient='vertical',
                              command=self.listbox.yview)
        self.listbox.configure(yscrollcommand=scroll.set)
        self.listbox.pack(side='left', fill='both', expand=True)
        scroll.pack(side='right', fill='y')

        # Status
        self.lbl_status = tk.Label(self.root, text="Escaneando...",
                                   font=("Consolas", 10, "bold"),
                                   bg=C["fundo"], fg=C["amarelo"])
        self.lbl_status.pack(pady=(4, 8))

        # Barra de progresso simples (frame colorido)
        self.fr_barra = tk.Frame(self.root, bg=C["fundo2"], height=6)
        self.fr_barra.pack(fill='x', padx=16, pady=(0, 8))
        self.barra_inner = tk.Frame(self.fr_barra, bg=C["verde"], height=6, width=0)
        self.barra_inner.place(x=0, y=0, height=6, width=0)

        # Botoes
        fr_btn = tk.Frame(self.root, bg=C["fundo"])
        fr_btn.pack(fill='x', padx=16, pady=(0, 16))

        self.btn_limpar = tk.Button(
            fr_btn, text="LIMPAR TUDO",
            font=("Consolas", 11, "bold"),
            bg=C["vermelho"], fg="#fff",
            relief='flat', cursor='hand2', pady=10,
            command=self._confirmar_limpeza, state='disabled')
        self.btn_limpar.pack(side='left', fill='x', expand=True, padx=(0, 6))

        self.btn_escanear = tk.Button(
            fr_btn, text="ESCANEAR NOVAMENTE",
            font=("Consolas", 10, "bold"),
            bg=C["painel"], fg=C["azul"],
            relief='flat', cursor='hand2', pady=10,
            command=self._escanear)
        self.btn_escanear.pack(side='left', fill='x', expand=True, padx=(6, 0))

    # ─── ACOES ───────────────────────────────────────────────

    def _escanear(self):
        self.listbox.delete(0, tk.END)
        self.lbl_status.config(text="Escaneando o sistema...", fg=C["amarelo"])
        self.btn_limpar.config(state='disabled')
        self.btn_escanear.config(state='disabled')
        self.root.update()

        def t():
            items = self.limpador.escanear()
            self.root.after(0, self._mostrar_resultado, items)
        threading.Thread(target=t, daemon=True).start()

    def _mostrar_resultado(self, items):
        self.items_encontrados = items
        self.listbox.delete(0, tk.END)

        if not items:
            self.listbox.insert(tk.END, "  Nenhum rastro encontrado! Sistema limpo.")
            self.lbl_status.config(
                text="LIMPO — Nenhum rastro de instalacao anterior",
                fg=C["verde"])
            self.btn_limpar.config(state='disabled')
        else:
            icones = {
                "pasta": "[PASTA]  ",
                "arquivo": "[ARQ]    ",
                "atalho": "[ATALHO] ",
                "registro": "[REG]    ",
                "pacote": "[PKG]    ",
            }
            for item in items:
                icone = icones.get(item["tipo"], "[?]      ")
                self.listbox.insert(tk.END, f"  {icone}{item['desc']}")
            self.lbl_status.config(
                text=f"{len(items)} rastro(s) encontrado(s) — prontos para remover",
                fg=C["amarelo"])
            self.btn_limpar.config(state='normal')

        self.btn_escanear.config(state='normal')

    def _confirmar_limpeza(self):
        n = len(self.items_encontrados)
        resposta = messagebox.askyesno(
            "Confirmar Limpeza",
            f"Tem certeza que deseja remover {n} item(ns)?\n\n"
            "Isso vai apagar:\n"
            "- Pastas de instalacao\n"
            "- Atalhos na area de trabalho e menu\n"
            "- Arquivos temporarios\n"
            "- Entradas no Registro do Windows\n"
            "- Pacotes Python instalados pelo programa\n\n"
            "Essa acao NAO pode ser desfeita!",
            icon='warning')

        if resposta:
            self._executar_limpeza()

    def _executar_limpeza(self):
        self.btn_limpar.config(state='disabled', text="Limpando...")
        self.btn_escanear.config(state='disabled')
        self.lbl_status.config(text="Removendo rastros...", fg=C["laranja"])

        def t():
            def progresso(atual, total, desc):
                pct = (atual / total) if total > 0 else 1
                self.root.after(0, self._atualizar_progresso, pct, desc)

            removidos, erros = self.limpador.remover_tudo(callback=progresso)
            self.root.after(0, self._limpeza_concluida, removidos, erros)

        threading.Thread(target=t, daemon=True).start()

    def _atualizar_progresso(self, pct, desc):
        largura = int(self.fr_barra.winfo_width() * pct)
        self.barra_inner.place(x=0, y=0, height=6, width=largura)
        self.lbl_status.config(text=f"Removendo: {desc[:50]}...", fg=C["laranja"])

    def _limpeza_concluida(self, removidos, erros):
        self.barra_inner.place(x=0, y=0, height=6,
                              width=self.fr_barra.winfo_width())
        self.barra_inner.config(bg=C["verde"])

        self.btn_limpar.config(text="LIMPAR TUDO")
        self.btn_escanear.config(state='normal')

        # Atualizar lista
        self.listbox.delete(0, tk.END)

        if removidos:
            self.listbox.insert(tk.END, f"  === {len(removidos)} REMOVIDO(S) ===")
            self.listbox.insert(tk.END, "")
            for item in removidos:
                self.listbox.insert(tk.END, f"  [OK] {item['desc']}")

        if erros:
            self.listbox.insert(tk.END, "")
            self.listbox.insert(tk.END, f"  === {len(erros)} ERRO(S) ===")
            for err in erros:
                self.listbox.insert(tk.END,
                    f"  [X] {err['item']['desc']} — {err['erro']}")

        total_ok = len(removidos)
        total_err = len(erros)

        if total_err == 0:
            self.lbl_status.config(
                text=f"CONCLUIDO! {total_ok} rastro(s) removido(s) com sucesso.",
                fg=C["verde"])
            messagebox.showinfo(
                "Limpeza Concluida",
                f"Todos os {total_ok} rastros foram removidos!\n\n"
                "Seu sistema esta limpo.\n"
                "Voce pode fechar esta janela.")
        else:
            self.lbl_status.config(
                text=f"Parcial: {total_ok} removidos, {total_err} com erro.",
                fg=C["amarelo"])
            messagebox.showwarning(
                "Limpeza Parcial",
                f"{total_ok} rastros removidos com sucesso.\n"
                f"{total_err} nao puderam ser removidos.\n\n"
                "Dica: Execute como Administrador para\n"
                "remover itens protegidos do sistema.")



# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    # Pede admin se nao tiver
    if not is_admin():
        try:
            reabrir_como_admin()
        except Exception:
            pass  # Se falhar, abre sem admin mesmo

    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass

    root = tk.Tk()
    AppLimpador(root)
    root.mainloop()
