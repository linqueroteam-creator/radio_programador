import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// === Registro do Service Worker (PWA) ===
// Faz o app funcionar offline e ser instalável no celular como aplicativo.
// Só roda em produção (vite dev mode não tem SW pra evitar cache infernal).
// É registrado no `load` da janela pra não competir com a primeira renderização.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // O caminho é relativo ao base path (./ no vite config). Em GitHub Pages
    // isso vira https://.../radio_programador/sw.js — exatamente onde o SW
    // foi publicado. Scope automático: o diretório do SW.
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      // Não bloqueia o app se o registro falhar — só avisa no console.
      // eslint-disable-next-line no-console
      console.warn('[ANOTATA] Service Worker não registrou:', err);
    });
  });
}
