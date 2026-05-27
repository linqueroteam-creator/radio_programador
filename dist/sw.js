/**
 * ============================================================================
 *  ANOTATA — Service Worker
 *  ----------------------------------------------------------------------------
 *  Estratégia: cache-first para o "shell" do app (HTML, JS, CSS, ícones),
 *  network-first para tudo mais (dados externos, imagens grandes coladas
 *  pelo usuário, LanguageTool API).
 *
 *  IMPORTANTE: o app guarda os dados do usuário em localStorage. O SW
 *  só guarda os arquivos do app (a casca). Os dados pessoais NÃO passam
 *  por este service worker — eles ficam no navegador independentemente.
 *
 *  Como atualizar:
 *    Quando o build muda, o nome do bundle (assets/index-XXXX.js) muda
 *    junto. O SW vê o nome novo, não acha no cache, busca da rede e
 *    cacheia. A versão antiga é substituída automaticamente.
 *
 *  Se um dia o app travar com um SW antigo:
 *    Em DevTools > Application > Service Workers > Unregister
 *    Ou bumpar o CACHE_VERSION abaixo, o SW antigo limpa tudo e baixa do zero.
 * ============================================================================
 */

const CACHE_VERSION = 'anotata-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;

// Arquivos do shell — sempre disponíveis offline depois do primeiro acesso.
// Os bundles da pasta assets/ são adicionados dinamicamente pelo fetch handler.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

// === INSTALL: pré-cacheia o shell ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // se algum arquivo do shell falhar, instalamos parcialmente
        // pra não bloquear o registro completo
        console.warn('[ANOTATA SW] install parcial:', err);
      })
  );
});

// === ACTIVATE: limpa caches antigos ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// === FETCH: estratégia híbrida ===
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só GET é cacheável
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Pula requests cross-origin que não são nossos (ex: LanguageTool API).
  // Deixa passar direto pra rede sem cachear.
  if (url.origin !== self.location.origin) return;

  // Bundles em /assets/ → cache-first agressivo (o nome muda quando o build muda)
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // Navegação (index.html) → network-first com fallback offline pro cache
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }

  // Outros (manifest, ícones) → cache-first
  event.respondWith(cacheFirst(req, SHELL_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    // sem rede, sem cache — devolve fallback genérico
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(req) || await cache.match('./index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
