"""
============================================================
  RADIO PROGRAMADOR v6.0 — Instalador para Windows 11
  Compilar: pyinstaller --onefile --windowed --name RadioProgramador_Setup instalador.py
============================================================
"""
import tkinter as tk
from tkinter import ttk, messagebox
import threading, subprocess, sys, os, platform, webbrowser
import base64, zlib

SISTEMA = platform.system()
PYTHON = sys.executable
VERSAO = "6.0"


# ── Cores estilo Windows 11 Dark ──────────────────────────
C = {
    "fundo":     "#0d1117",
    "fundo2":    "#161b22",
    "painel":    "#21262d",
    "verde":     "#39d353",
    "verde_dim": "#238636",
    "vermelho":  "#f85149",
    "amarelo":   "#e3b341",
    "azul":      "#58a6ff",
    "ciano":     "#79c0ff",
    "texto":     "#f0f6fc",
    "texto_dim": "#8b949e",
}

PACOTES = [
    ("scapy", "Driver de captura de pacotes Wi-Fi"),
    ("pywifi", "Scanner aprimorado de redes Wi-Fi"),
    ("comtypes", "Integracao com drivers Windows"),
    ("speedtest-cli", "Medicao de velocidade da internet"),
]


def _tem(lib):
    import importlib.util
    return importlib.util.find_spec(lib) is not None


def _tem_npcap():
    for p in [r"C:\Windows\System32\Npcap",
              r"C:\Windows\SysWOW64\Npcap",
              r"C:\Program Files\Npcap"]:
        if os.path.isdir(p):
            return True
    try:
        import winreg
        winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Npcap")
        return True
    except Exception:
        return False


def _is_admin():
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def _pasta_instalacao():
    base = os.path.join(
        os.environ.get("LOCALAPPDATA", "C:\\Users\\Public"),
        "RadioProgramador")
    os.makedirs(base, exist_ok=True)
    return base


def _extrair_programa(destino):
    """Copia o radio_programador.py para a pasta de instalacao."""
    # Busca o arquivo ao lado do instalador
    origem = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "radio_programador.py")
    if os.path.exists(origem):
        import shutil
        shutil.copy2(origem, destino)
    else:
        raise FileNotFoundError(
            f"radio_programador.py nao encontrado em:\n{origem}")


def _criar_atalho(alvo, nome):
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    lnk = os.path.join(desktop, f"{nome}.lnk")
    ps = (
        f'$s=(New-Object -COM WScript.Shell).CreateShortcut("{lnk}");'
        f'$s.TargetPath="{PYTHON}";'
        f'$s.Arguments="\\"{alvo}\\"";'
        f'$s.WorkingDirectory="{os.path.dirname(alvo)}";'
        f'$s.Description="Radio Programador v{VERSAO}";'
        f'$s.Save()'
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                   capture_output=True, timeout=15)



# ============================================================
# JANELA PRINCIPAL DO INSTALADOR
# ============================================================

class Instalador(tk.Tk):

    def __init__(self):
        super().__init__()
        self.title("Radio Programador - Instalacao")
        self.geometry("650x580")
        self.configure(bg=C["fundo"])
        self.resizable(False, False)

        # DPI awareness Windows 11
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass

        self._dpi_fix()
        self._centralizar()
        self._tela_boas_vindas()

    def _centralizar(self):
        self.update_idletasks()
        w = self.winfo_width()
        h = self.winfo_height()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")

    def _dpi_fix(self):
        s = ttk.Style(self)
        s.theme_use("clam")
        s.configure("Verde.Horizontal.TProgressbar",
                    background=C["verde"], troughcolor=C["fundo2"],
                    borderwidth=0)
        s.configure("Azul.Horizontal.TProgressbar",
                    background=C["azul"], troughcolor=C["fundo2"],
                    borderwidth=0)

    def _limpar(self):
        for w in self.winfo_children():
            w.destroy()

    def _hdr(self, subtitulo=""):
        fr = tk.Frame(self, bg=C["fundo2"], height=72)
        fr.pack(fill="x")
        fr.pack_propagate(False)
        tk.Label(fr, text="  RADIO PROGRAMADOR",
                 font=("Consolas", 19, "bold"),
                 bg=C["fundo2"], fg=C["verde"]).pack(side="left", pady=14)
        if subtitulo:
            tk.Label(fr, text=f"  {subtitulo}",
                     font=("Consolas", 9),
                     bg=C["fundo2"], fg=C["texto_dim"]).pack(side="left")
        tk.Label(fr, text=f"v{VERSAO}  ",
                 font=("Consolas", 8),
                 bg=C["fundo2"], fg=C["texto_dim"]).pack(side="right")

    def _btn(self, parent, txt, cmd, cor=None, fg="#000", pady=10,
             state="normal"):
        cor = cor or C["verde"]
        b = tk.Button(parent, text=txt,
                      font=("Consolas", 11, "bold"),
                      bg=cor, fg=fg,
                      relief="flat", cursor="hand2",
                      pady=pady, command=cmd, state=state)
        return b


    # ─── TELA 1: Boas-vindas ─────────────────────────────────
    def _tela_boas_vindas(self):
        self._limpar()
        self._hdr()

        corpo = tk.Frame(self, bg=C["fundo"])
        corpo.pack(fill="both", expand=True, padx=40, pady=20)

        tk.Label(corpo, text="Bem-vindo ao instalador",
                 font=("Consolas", 14, "bold"),
                 bg=C["fundo"], fg=C["amarelo"]).pack(anchor="w")

        tk.Label(corpo,
                 text="Ferramenta profissional de analise de redes Wi-Fi.",
                 font=("Consolas", 10),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor="w", pady=(2, 16))

        # O que vai ser instalado
        fr = tk.Frame(corpo, bg=C["painel"], padx=20, pady=14)
        fr.pack(fill="x", pady=(0, 12))

        tk.Label(fr, text="O que sera instalado:",
                 font=("Consolas", 9, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(anchor="w", pady=(0, 6))

        itens = [
            (">>", "Scanner de redes Wi-Fi ao redor"),
            (">>", "Analise de senha WPA2 com wordlist"),
            (">>", "Captura de handshake real (requer adaptador)"),
            (">>", "Visualizacao de dispositivos na rede"),
            (">>", "Teste de velocidade da internet"),
            (">>", "Gerador de senhas seguras"),
            (">>", "Informacoes detalhadas da rede"),
            (">>", "Desconexao de clientes (Deauth)"),
        ]
        for icone, desc in itens:
            f = tk.Frame(fr, bg=C["painel"])
            f.pack(fill="x", pady=2)
            tk.Label(f, text=icone, font=("Consolas", 9, "bold"),
                     bg=C["painel"], fg=C["verde"], width=3).pack(side="left")
            tk.Label(f, text=desc, font=("Consolas", 9),
                     bg=C["painel"], fg=C["texto"]).pack(side="left")

        # Aviso legal
        av = tk.Frame(corpo, bg="#1a1000", pady=8)
        av.pack(fill="x", pady=(0, 16))
        tk.Label(av, text="  [!] Use somente em redes proprias ou com "
                 "autorizacao formal.",
                 font=("Consolas", 8, "bold"),
                 bg="#1a1000", fg=C["amarelo"], anchor="w").pack(fill="x", padx=12)

        fr_btn = tk.Frame(corpo, bg=C["fundo"])
        fr_btn.pack(fill="x")

        self._btn(fr_btn, "INSTALAR AGORA  >>",
                  self._tela_instalando,
                  C["verde"], "#000", 12).pack(fill="x", pady=(0, 6))
        self._btn(fr_btn, "Cancelar",
                  self.destroy,
                  C["fundo2"], C["texto_dim"], 6).pack(fill="x")


    # ─── TELA 2: Instalando ──────────────────────────────────
    def _tela_instalando(self):
        self._limpar()
        self._hdr("Instalando componentes...")

        self.corpo = tk.Frame(self, bg=C["fundo"])
        self.corpo.pack(fill="both", expand=True, padx=32, pady=16)

        # Passos visuais
        self.passos_frame = tk.Frame(self.corpo, bg=C["fundo"])
        self.passos_frame.pack(fill="x", pady=(0, 12))

        nomes_passos = [
            "Preparando instalacao",
            "Instalando componentes Python",
            "Verificando driver Npcap",
            "Configurando o programa",
            "Criando atalho na area de trabalho",
        ]
        self.lbl_passos = []
        for i, nome in enumerate(nomes_passos):
            f = tk.Frame(self.passos_frame, bg=C["fundo"])
            f.pack(fill="x", pady=2)
            ic = tk.Label(f, text="o", font=("Consolas", 12),
                          bg=C["fundo"], fg=C["texto_dim"], width=3)
            ic.pack(side="left")
            lb = tk.Label(f, text=nome, font=("Consolas", 9),
                          bg=C["fundo"], fg=C["texto_dim"])
            lb.pack(side="left")
            self.lbl_passos.append((ic, lb))

        # Barra de progresso
        self.barra = ttk.Progressbar(self.corpo,
                                     style="Verde.Horizontal.TProgressbar",
                                     mode="determinate", length=540)
        self.barra.pack(fill="x", pady=(8, 4))

        self.lbl_status = tk.Label(self.corpo, text="Iniciando...",
                                   font=("Consolas", 8),
                                   bg=C["fundo"], fg=C["texto_dim"])
        self.lbl_status.pack(anchor="w")

        # Log compacto
        self.log_txt = tk.Text(self.corpo, height=7,
                               font=("Consolas", 8),
                               bg=C["painel"], fg=C["verde"],
                               relief="flat", state="disabled",
                               wrap="word")
        self.log_txt.pack(fill="both", expand=True, pady=(8, 0))
        self.log_txt.tag_config("ok", foreground=C["verde"])
        self.log_txt.tag_config("aviso", foreground=C["amarelo"])
        self.log_txt.tag_config("erro", foreground=C["vermelho"])
        self.log_txt.tag_config("info", foreground=C["azul"])
        self.log_txt.tag_config("dim", foreground=C["texto_dim"])

        threading.Thread(target=self._instalar, daemon=True).start()

    def _log(self, msg, tag="dim"):
        def _do():
            self.log_txt.config(state="normal")
            self.log_txt.insert("end", msg + "\n", tag)
            self.log_txt.see("end")
            self.log_txt.config(state="disabled")
        self.after(0, _do)

    def _passo(self, idx, status="ok"):
        def _do():
            ic, lb = self.lbl_passos[idx]
            if status == "ok":
                ic.config(text="V", fg=C["verde"])
                lb.config(fg=C["verde"])
            elif status == "ativo":
                ic.config(text=">", fg=C["amarelo"])
                lb.config(fg=C["amarelo"])
            elif status == "aviso":
                ic.config(text="!", fg=C["amarelo"])
                lb.config(fg=C["amarelo"])
            elif status == "erro":
                ic.config(text="X", fg=C["vermelho"])
                lb.config(fg=C["vermelho"])
        self.after(0, _do)

    def _upd(self, pct, msg=""):
        def _do():
            self.barra["value"] = pct
            if msg:
                self.lbl_status.config(text=msg)
        self.after(0, _do)


    def _instalar(self):
        import time

        # PASSO 0: Preparar
        self._passo(0, "ativo")
        self._upd(5, "Preparando pasta de instalacao...")
        self._log("Iniciando instalacao do Radio Programador v6.0", "info")
        self._log(f"Python: {sys.version_info.major}.{sys.version_info.minor} "
                  f"({'64' if sys.maxsize > 2**32 else '32'}-bit)", "dim")

        pasta = _pasta_instalacao()
        self._log(f"Pasta: {pasta}", "dim")
        self._passo(0, "ok")
        self._upd(10, "")
        time.sleep(0.3)

        # PASSO 1: Pacotes Python
        self._passo(1, "ativo")
        self._upd(15, "Atualizando pip...")
        try:
            subprocess.run(
                [PYTHON, "-m", "pip", "install", "--upgrade", "pip", "--quiet"],
                capture_output=True, timeout=30)
            self._log("pip atualizado.", "ok")
        except Exception:
            pass

        total = len(PACOTES)
        ok_count = 0
        for i, (pkg, desc) in enumerate(PACOTES):
            pct = 15 + int((i / total) * 35)
            self._upd(pct, f"Instalando: {desc}...")
            self._log(f"Instalando {desc} ({pkg})...", "dim")
            try:
                subprocess.check_call(
                    [PYTHON, "-m", "pip", "install", pkg,
                     "--upgrade", "--quiet"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=90)
                self._log(f"  [OK] {pkg} instalado.", "ok")
                ok_count += 1
            except Exception as e:
                self._log(f"  [!] {pkg}: {e}", "aviso")
            time.sleep(0.2)

        if ok_count >= 2:
            self._passo(1, "ok")
        else:
            self._passo(1, "aviso")
        self._upd(52, "")
        time.sleep(0.3)

        # PASSO 2: Npcap
        self._passo(2, "ativo")
        self._upd(55, "Verificando driver Npcap...")
        time.sleep(0.5)
        if _tem_npcap():
            self._log("Npcap ja esta instalado!", "ok")
            self._passo(2, "ok")
        else:
            self._log("Npcap nao encontrado.", "aviso")
            self._log("O programa funciona sem ele, mas captura "
                      "avancada requer Npcap.", "aviso")
            self._passo(2, "aviso")
        self._upd(60, "")
        time.sleep(0.3)

        # PASSO 3: Extrair programa
        self._passo(3, "ativo")
        self._upd(65, "Instalando programa principal...")
        prog_path = os.path.join(pasta, "radio_programador.py")
        try:
            _extrair_programa(prog_path)
            self._log(f"Programa instalado em: {prog_path}", "ok")
            self._passo(3, "ok")
        except Exception as e:
            self._log(f"Erro ao instalar programa: {e}", "erro")
            self._passo(3, "erro")
        self._upd(80, "")
        time.sleep(0.3)

        # PASSO 4: Atalho
        self._passo(4, "ativo")
        self._upd(85, "Criando atalho na area de trabalho...")
        try:
            _criar_atalho(prog_path, "Radio Programador")
            self._log("Atalho criado na area de trabalho.", "ok")
            self._passo(4, "ok")
        except Exception as e:
            self._log(f"Atalho nao criado: {e}", "aviso")
            self._passo(4, "aviso")

        self._upd(100, "Instalacao concluida!")
        time.sleep(0.5)
        self._prog_path = prog_path
        self.after(0, self._tela_concluida)


    # ─── TELA 3: Concluida ───────────────────────────────────
    def _tela_concluida(self):
        self._limpar()
        self._hdr()

        corpo = tk.Frame(self, bg=C["fundo"])
        corpo.pack(fill="both", expand=True, padx=40, pady=20)

        tk.Label(corpo, text="[OK]  Instalacao Concluida!",
                 font=("Consolas", 16, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(anchor="w")

        tk.Label(corpo,
                 text="O Radio Programador foi instalado com sucesso.",
                 font=("Consolas", 10),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor="w", pady=(2, 14))

        # Status dos componentes
        fr = tk.Frame(corpo, bg=C["painel"], padx=20, pady=14)
        fr.pack(fill="x", pady=(0, 12))

        tk.Label(fr, text="Status dos componentes:",
                 font=("Consolas", 9, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(anchor="w", pady=(0, 6))

        def linha(txt, ok, aviso=False):
            f = tk.Frame(fr, bg=C["painel"])
            f.pack(fill="x", pady=2)
            if ok:
                ic, cor = "V", C["verde"]
            elif aviso:
                ic, cor = "!", C["amarelo"]
            else:
                ic, cor = "X", C["vermelho"]
            tk.Label(f, text=ic, font=("Consolas", 10, "bold"),
                     bg=C["painel"], fg=cor, width=3).pack(side="left")
            tk.Label(f, text=txt, font=("Consolas", 9),
                     bg=C["painel"], fg=C["texto"]).pack(side="left")

        linha(f"Python {'64' if sys.maxsize > 2**32 else '32'}-bit", True)
        linha("scapy (captura de pacotes)", _tem("scapy"), not _tem("scapy"))
        linha("pywifi (scanner de redes)", _tem("pywifi"), not _tem("pywifi"))
        linha("speedtest-cli (velocidade)", _tem("speedtest"),
              not _tem("speedtest"))

        if not _tem_npcap():
            av = tk.Frame(corpo, bg="#1a0d00", padx=16, pady=12)
            av.pack(fill="x", pady=(0, 10))
            tk.Label(av, text="[!]  Npcap nao esta instalado",
                     font=("Consolas", 10, "bold"),
                     bg="#1a0d00", fg=C["amarelo"]).pack(anchor="w")
            tk.Label(av, text=(
                "Para captura de handshake e envio de pacotes,\n"
                "instale o Npcap (gratuito, leva ~1 minuto).\n"
                "Marque: 'WinPcap API compatibility' e "
                "'Support raw 802.11 traffic'"),
                     font=("Consolas", 8),
                     bg="#1a0d00", fg=C["texto_dim"],
                     justify="left").pack(anchor="w", pady=(4, 8))
            self._btn(av, "Baixar e instalar o Npcap (gratuito)",
                      lambda: webbrowser.open("https://npcap.com/#download"),
                      "#2d1800", C["amarelo"], 7).pack(fill="x")
        else:
            linha("Npcap (driver de pacotes)", True)

        fr_btn = tk.Frame(corpo, bg=C["fundo"])
        fr_btn.pack(fill="x", pady=(10, 0))

        self._btn(fr_btn, "ABRIR O PROGRAMA",
                  self._abrir_programa,
                  C["verde"], "#000", 12).pack(fill="x", pady=(0, 6))

        self._btn(fr_btn, "Fechar instalador",
                  self.destroy,
                  C["fundo2"], C["texto_dim"], 6).pack(fill="x")

    def _abrir_programa(self):
        prog = getattr(self, "_prog_path", None)
        if prog and os.path.exists(prog):
            try:
                import ctypes
                ret = ctypes.windll.shell32.ShellExecuteW(
                    None, "runas", PYTHON, f'"{prog}"', None, 1)
                if ret <= 32:
                    subprocess.Popen([PYTHON, prog])
            except Exception:
                subprocess.Popen([PYTHON, prog])
        self.destroy()


# ============================================================
# POPUP DE ELEVACAO (UAC) — Windows 11
# ============================================================

def solicitar_admin():
    """Reabre o instalador como Administrador via UAC do Windows 11."""
    if _is_admin():
        return True
    try:
        import ctypes
        script = os.path.abspath(__file__)
        ret = ctypes.windll.shell32.ShellExecuteW(
            None, "runas", PYTHON, f'"{script}"', None, 1)
        return ret > 32
    except Exception:
        return False


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    # Popup de UAC — solicita permissao de Administrador
    if not _is_admin():
        resp = messagebox.askyesno(
            "Radio Programador - Instalador",
            "Este instalador precisa de permissao de Administrador\n"
            "para instalar drivers e componentes.\n\n"
            "Deseja continuar como Administrador?\n"
            "(Uma janela de permissao do Windows vai aparecer)",
            icon="question")
        if resp:
            if solicitar_admin():
                sys.exit(0)
            else:
                messagebox.showerror(
                    "Erro",
                    "Nao foi possivel obter permissao de Administrador.\n"
                    "Clique com botao direito no instalador e escolha\n"
                    "'Executar como administrador'.")
                sys.exit(1)
        else:
            # Continua sem admin (funcionalidades limitadas)
            pass

    app = Instalador()
    app.mainloop()
