import { useEffect, useRef } from 'react';
import { checkRemindersNow, getDueDateMeta } from '../engine/DateEngine';

/**
 * ============================================================================
 *  ANOTATA — Hook de lembretes de prazo (Web Notifications)
 * ============================================================================
 *
 *  Quando o usuário ativou os lembretes (settings.notifications.enabled) e
 *  o navegador deu permissão, este hook:
 *
 *    1. Roda a checagem de prazos a cada 5 minutos.
 *    2. Roda também sempre que a aba fica visível (visibilitychange).
 *    3. Para cada prazo "vencido", "hoje" ou "amanhã" que ainda não foi
 *       notificado HOJE, dispara uma `Notification` do navegador.
 *    4. Marca a chave "noteId-status-yyyymmdd" no store, pra não repetir.
 *
 *  Cliques na notificação focam a aba e abrem a nota correspondente.
 *
 *  Por que vive num hook
 *  ---------------------
 *  Centraliza toda a lógica em um lugar e garante limpeza correta dos
 *  intervalos quando o componente desmonta. Também respeita Rules of
 *  Hooks: chamado uma vez no `MainApp`, sempre antes de qualquer
 *  early return.
 *
 *  Boas práticas embutidas
 *  -----------------------
 *  - Nunca dispara mais de uma notificação por (nota, status, dia).
 *  - Nunca dispara se a aba está em foco e visível (UX: a pessoa já
 *    está vendo o app).
 *  - Falha em silêncio se a API de Notification não existir (PWA em
 *    iOS antigo, browsers exóticos, etc).
 * ============================================================================
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

function todayStamp() {
  const d = new Date();
  return (
    d.getFullYear().toString().padStart(4, '0') +
    (d.getMonth() + 1).toString().padStart(2, '0') +
    d.getDate().toString().padStart(2, '0')
  );
}

function getNotificationApi() {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;
  return window.Notification;
}

/**
 * Pede permissão pro navegador. DEVE ser chamada dentro de um gesto do usuário
 * (clique de botão), senão alguns browsers ignoram. Retorna a promessa com o
 * resultado: 'granted' | 'denied' | 'default'.
 */
export async function requestNotificationPermission() {
  const N = getNotificationApi();
  if (!N) return 'unsupported';
  try {
    // Em Safari antigo, requestPermission usa callback. Em todos os modernos, Promise.
    if (typeof N.requestPermission !== 'function') return N.permission || 'default';
    const result = await N.requestPermission();
    return result;
  } catch (_) {
    return N.permission || 'default';
  }
}

export function getNotificationPermission() {
  const N = getNotificationApi();
  if (!N) return 'unsupported';
  return N.permission || 'default';
}

/**
 * Dispara uma única notificação (segura). Retorna true se conseguiu, false caso contrário.
 * Recebe `onClick` que é chamado quando o usuário clica.
 */
export function fireNotification({ title, body, tag, onClick }) {
  const N = getNotificationApi();
  if (!N || N.permission !== 'granted') return false;
  try {
    const n = new N(title, {
      body: body || '',
      tag: tag || undefined,
      icon: './icon-192.png',
      badge: './icon-192.png',
      lang: 'pt-BR',
      // renotify só funciona com tag; mantemos true para repor mesmo prazo
      renotify: !!tag,
    });
    if (onClick) {
      n.onclick = (e) => {
        e.preventDefault();
        try {
          window.focus();
          onClick();
        } catch (_) {}
        n.close();
      };
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Hook propriamente dito.
 *
 *   useDueDateReminders({
 *     enabled: store.settings.notifications.enabled,
 *     notes: store.notes,
 *     lastNotifiedKeys: store.settings.notifications.lastNotifiedKeys,
 *     onNotified: (key) => store.recordNotificationKey(key),
 *     onClickNote: (noteId) => { store.setCurrentView('all'); store.setSelectedNoteId(noteId); },
 *   });
 */
export default function useDueDateReminders({
  enabled,
  notes,
  lastNotifiedKeys,
  onNotified,
  onClickNote,
}) {
  // Refs pra evitar re-criação do timer quando notes/lastNotifiedKeys mudam
  const enabledRef = useRef(enabled);
  const notesRef = useRef(notes);
  const lastKeysRef = useRef(lastNotifiedKeys);
  const onNotifiedRef = useRef(onNotified);
  const onClickRef = useRef(onClickNote);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { lastKeysRef.current = lastNotifiedKeys; }, [lastNotifiedKeys]);
  useEffect(() => { onNotifiedRef.current = onNotified; }, [onNotified]);
  useEffect(() => { onClickRef.current = onClickNote; }, [onClickNote]);

  useEffect(() => {
    if (!enabled) return undefined;

    const N = getNotificationApi();
    if (!N || N.permission !== 'granted') return undefined;

    const runCheck = () => {
      // Não notifica se a aba está visível — o usuário já está vendo o app
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
        // Continua só pra alimentar lastKeys com os já vistos? Não — só não dispara,
        // mas também não marca. Se o usuário sair de foco e o dia mudar, aí dispara.
        return;
      }

      const reminders = checkRemindersNow(notesRef.current || []);
      if (!reminders.length) return;

      const stamp = todayStamp();
      const seen = new Set(lastKeysRef.current || []);

      reminders.forEach((r) => {
        const key = `${r.noteId}-${r.status}-${stamp}`;
        if (seen.has(key)) return;

        const meta = getDueDateMeta(r.status);
        const labelMap = {
          vencido: '⚠️ Prazo vencido',
          hoje: '🔥 Vence hoje',
          amanha: '📅 Vence amanhã',
        };
        const title = labelMap[r.status] || `${meta.label}`;
        const body = r.title + (r.formatted ? ` — ${r.formatted}` : '');

        const ok = fireNotification({
          title,
          body,
          tag: `anotata-due-${r.noteId}-${r.status}`,
          onClick: () => onClickRef.current && onClickRef.current(r.noteId),
        });
        if (ok && onNotifiedRef.current) {
          onNotifiedRef.current(key);
        }
      });
    };

    // Roda 1x agora, e depois a cada 5min
    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);

    // Roda também quando a aba volta a ficar invisível (vai pra background) —
    // assim quando o usuário sai do app, ele recebe o lembrete em seguida.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}

/**
 * Função pura — usada pelo "Tocar agora" do botão de teste.
 * Dispara uma notificação de exemplo na hora.
 */
export function fireTestNotification() {
  return fireNotification({
    title: '🔔 ANOTATA — lembrete de teste',
    body: 'Os lembretes do navegador estão funcionando! Você receberá avisos sobre prazos vencidos, de hoje e de amanhã.',
    tag: 'anotata-test',
  });
}
