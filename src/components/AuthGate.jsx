import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn, Shield } from 'lucide-react';

// === CONFIGURAÇÃO DE ACESSO ===
// Email autorizado e hash da senha (SHA-256 com salt)
// Senha real: CocaCola007*00 (só você sabe)
const AUTHORIZED_EMAIL = 'nuance.empreendimentos@gmail.com';
const PASSWORD_HASH = 'd5d7591475f300069d34f6ae712f58a97a2cdd6a154db2ce72f700b10e0c2c74';
const SALT = 'anotata_v3_2026_salt';
const AUTH_KEY = 'anotata-auth-session';
const SESSION_DURATION_DAYS = 30;

// Hash SHA-256 usando Web Crypto API (nativo do navegador)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(SALT + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verifica se a sessão salva ainda é válida
function checkSavedSession() {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) return false;
    const { token, expiresAt } = JSON.parse(saved);
    if (!token || !expiresAt) return false;
    if (Date.now() > expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function saveSession() {
  const expiresAt = Date.now() + (SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  localStorage.setItem(AUTH_KEY, JSON.stringify({
    token: 'authorized',
    expiresAt,
  }));
}

export default function AuthGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Verifica sessão ao carregar
  useEffect(() => {
    if (checkSavedSession()) {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Pequeno delay pra dar sensação de processamento
    await new Promise(r => setTimeout(r, 400));

    const emailNorm = email.trim().toLowerCase();
    const expectedEmail = AUTHORIZED_EMAIL.toLowerCase();

    if (emailNorm !== expectedEmail) {
      setError('Email ou senha incorretos.');
      setIsLoading(false);
      setAttempts(a => a + 1);
      return;
    }

    try {
      const passHash = await hashPassword(password);
      if (passHash !== PASSWORD_HASH) {
        setError('Email ou senha incorretos.');
        setIsLoading(false);
        setAttempts(a => a + 1);
        return;
      }

      // Acesso liberado!
      if (rememberMe) {
        saveSession();
      }
      setIsAuthenticated(true);
    } catch (err) {
      setError('Erro ao verificar credenciais. Tenta de novo.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  // Carregando
  if (isChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-anotata-bg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-anotata-roxo mb-2">ANOTATA</h1>
          <p className="text-anotata-muted text-sm">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Tela de login
  if (!isAuthenticated) {
    const tooManyAttempts = attempts >= 5;

    return (
      <div className="h-screen flex items-center justify-center p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #F2F1F4 0%, #EDE8F2 50%, #F0E9F8 100%)'
        }}
      >
        {/* Padrão decorativo de fundo */}
        <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="bg-pattern" patternUnits="userSpaceOnUse" width="60" height="60">
              <circle cx="30" cy="30" r="1.5" fill="#5B2D8E" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg-pattern)" />
        </svg>

        {/* Blob colorido decorativo */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #E8637C 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #5B2D8E 0%, transparent 70%)' }} />

        {/* Card de login */}
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header com gradiente */}
          <div className="px-8 pt-8 pb-6 text-center"
            style={{ background: 'linear-gradient(135deg, #5B2D8E 0%, #7C4DC9 100%)' }}
          >
            <div className="w-14 h-14 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3">
              <Lock size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">ANOTATA</h1>
            <p className="text-white/80 text-xs mt-1">Acesso restrito</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <p className="text-sm text-anotata-text-suave mb-6 text-center">
              Entre com seu email e senha para acessar suas anotações.
            </p>

            {/* Campo email */}
            <div className="mb-4">
              <label className="text-xs font-medium text-anotata-text-suave mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-anotata-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  disabled={tooManyAttempts}
                  className="w-full pl-10 pr-3 py-2.5 bg-anotata-lavanda-clara border border-anotata-border rounded-lg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Campo senha */}
            <div className="mb-4">
              <label className="text-xs font-medium text-anotata-text-suave mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-anotata-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                  disabled={tooManyAttempts}
                  className="w-full pl-10 pr-10 py-2.5 bg-anotata-lavanda-clara border border-anotata-border rounded-lg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-anotata-muted hover:text-anotata-roxo transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Lembrar senha */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-anotata-roxo cursor-pointer"
              />
              <span className="text-xs text-anotata-text-suave">
                Manter conectado neste navegador (30 dias)
              </span>
            </label>

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-4 p-3 bg-anotata-goiaba-bg border border-anotata-goiaba/30 rounded-lg">
                <p className="text-xs text-anotata-goiaba-escuro">{error}</p>
                {attempts >= 3 && !tooManyAttempts && (
                  <p className="text-2xs text-anotata-goiaba mt-1">
                    Tentativas: {attempts}/5
                  </p>
                )}
              </div>
            )}

            {/* Bloqueio por muitas tentativas */}
            {tooManyAttempts && (
              <div className="mb-4 p-3 bg-anotata-goiaba-bg border border-anotata-goiaba/30 rounded-lg text-center">
                <Shield size={20} className="mx-auto text-anotata-goiaba mb-1" />
                <p className="text-xs text-anotata-goiaba-escuro font-medium">Muitas tentativas incorretas</p>
                <p className="text-2xs text-anotata-goiaba mt-1">
                  Recarregue a página para tentar de novo
                </p>
              </div>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={isLoading || tooManyAttempts || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  Entrar no ANOTATA
                </>
              )}
            </button>

            {/* Rodapé */}
            <p className="text-2xs text-anotata-muted text-center mt-6">
              Acesso pessoal • Suas notas ficam só no seu navegador
            </p>
          </form>
        </div>
      </div>
    );
  }

  // App liberado — passa o handler de logout pro children
  return typeof children === 'function'
    ? children({ logout: handleLogout })
    : children;
}
