import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, BellRing, X, Check, AlertTriangle } from 'lucide-react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  fireTestNotification,
} from '../hooks/useDueDateReminders';
import { checkRemindersNow, getDueDateMeta, formatDueDate } from '../engine/DateEngine';

/**
 * ============================================================================
 *  <NotificationsBell> — sino de lembretes na Sidebar
 * ============================================================================
 *
 *  Comportamento:
 *
 *    1. Mostra um sininho com badge numérico se houver prazos hoje/amanhã/
 *       vencidos. Cor do badge muda conforme severidade.
 *
 *    2. Clicar abre um popover ancorado no botão com:
 *         - Status da permissão e do toggle
 *         - Botão "Ativar / Desativar lembretes"
 *         - Botão "Tocar agora" (notificação de teste)
 *         - Lista de prazos próximos (vencidos / hoje / amanhã)
 *         - Cada item da lista é clicável → abre a nota.
 *
 *    3. O toggle persiste em store.settings.notifications.enabled. A
 *       permissão real (Notification.requestPermission) só é pedida quando
 *       o usuário clica em "Ativar" pela primeira vez.
 *
 *  Por que portal:
 *    - Em mobile a Sidebar é uma drawer com `overflow: hidden` no parent.
 *      Renderizar o popover via portal evita clipping.
 *    - Z-index garantido acima de tudo.
 * ============================================================================
 */

export default function NotificationsBell({ store, onOpenNote }) {
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState(() => getNotificationPermission());
  const [coords, setCoords] = useState(null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  const settings = store.settings || { notifications: { enabled: false } };
  const enabled = !!settings.notifications.enabled;

  // Lista de lembretes ativos (vencido + hoje + amanhã)
  const reminders = useMemo(() => {
    return checkRemindersNow(store.notes || []);
  }, [store.notes]);

  // Quantos lembretes pra mostrar no badge — só os mais urgentes
  const urgentCount = useMemo(() => {
    return reminders.filter(r => r.status === 'vencido' || r.status === 'hoje').length;
  }, [reminders]);
  const totalCount = reminders.length;

  // Cor do badge: goiaba escuro pra vencido, goiaba pra hoje, ambar pra amanhã
  const badgeColor = useMemo(() => {
    if (reminders.some(r => r.status === 'vencido')) return 'bg-anotata-goiaba-escuro';
    if (reminders.some(r => r.status === 'hoje')) return 'bg-anotata-goiaba';
    if (reminders.some(r => r.status === 'amanha')) return 'bg-anotata-warn';
    return 'bg-anotata-roxo';
  }, [reminders]);

  // Atualiza posição do popover quando abre ou janela muda
  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const POPOVER_WIDTH = 320;
      const padding = 8;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let top = rect.bottom + padding;
      let left = rect.left;

      // Clamp horizontal
      if (left + POPOVER_WIDTH > winW - padding) {
        left = winW - POPOVER_WIDTH - padding;
      }
      if (left < padding) left = padding;

      // Auto-flip vertical se não couber abaixo
      if (top + 360 > winH - padding) {
        top = Math.max(padding, rect.top - 360 - padding);
      }
      setCoords({ top, left, width: POPOVER_WIDTH });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  // Click fora fecha
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (buttonRef.current && buttonRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Atualiza permissão se ela mudou (ex: usuário reabilitou nas configs do navegador)
  useEffect(() => {
    if (open) setPerm(getNotificationPermission());
  }, [open]);

  const handleToggle = async () => {
    if (enabled) {
      // Desativar
      store.setNotificationsEnabled(false);
      return;
    }
    // Ativar — pede permissão se ainda não foi pedida
    if (perm === 'unsupported') {
      alert('Este navegador não suporta lembretes (Web Notifications). Use Chrome, Firefox, Edge ou Safari recente.');
      return;
    }
    if (perm === 'denied') {
      alert(
        'O navegador está bloqueando lembretes do ANOTATA.\n\n' +
        'Pra liberar, clique no cadeado da barra de endereço e marque "Notificações" como permitidas. Depois recarregue a página.'
      );
      return;
    }
    if (perm !== 'granted') {
      const result = await requestNotificationPermission();
      setPerm(result);
      if (result !== 'granted') {
        if (result === 'denied') {
          alert('Você bloqueou os lembretes. Pra reativar, ajuste no cadeado da barra de endereço.');
        }
        return;
      }
    }
    store.setNotificationsEnabled(true);
  };

  const handleTest = () => {
    if (perm !== 'granted') {
      alert('Permissão ainda não concedida. Clique em "Ativar lembretes" primeiro.');
      return;
    }
    const ok = fireTestNotification();
    if (!ok) {
      alert('Não consegui disparar a notificação. Verifique nas configurações do navegador se notificações do ANOTATA estão liberadas.');
    }
  };

  const statusLine = useMemo(() => {
    if (perm === 'unsupported') return { text: 'Navegador não suporta lembretes', color: 'text-anotata-muted', icon: AlertTriangle };
    if (perm === 'denied') return { text: 'Permissão bloqueada pelo navegador', color: 'text-anotata-goiaba', icon: AlertTriangle };
    if (enabled && perm === 'granted') return { text: 'Lembretes ligados — você receberá avisos', color: 'text-anotata-success', icon: Check };
    if (perm === 'granted') return { text: 'Permissão concedida — clique em ativar', color: 'text-anotata-text-suave', icon: Check };
    return { text: 'Clique em ativar pra começar', color: 'text-anotata-text-suave', icon: Bell };
  }, [perm, enabled]);

  const StatusIcon = statusLine.icon;

  // Ícone do botão muda conforme estado
  const ButtonIcon = !enabled ? BellOff : (urgentCount > 0 ? BellRing : Bell);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        title={
          totalCount > 0
            ? `Lembretes (${totalCount} prazo${totalCount === 1 ? '' : 's'} próximo${totalCount === 1 ? '' : 's'})`
            : 'Lembretes de prazo'
        }
        aria-label={`Lembretes de prazo${totalCount > 0 ? ` — ${totalCount} próximo${totalCount === 1 ? '' : 's'}` : ''}`}
        aria-expanded={open}
        className={`relative p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 ${
          open ? 'bg-anotata-hover text-anotata-roxo' : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
        }`}
      >
        <ButtonIcon size={16} aria-hidden="true" />
        {totalCount > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -top-0.5 -right-0.5 ${badgeColor} text-white text-2xs font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none shadow-sm`}
          >
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && coords && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Lembretes de prazo"
          className="fixed z-[150] bg-white border border-anotata-border rounded-xl shadow-popover overflow-hidden flex flex-col animate-fade-in"
          style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: 420 }}
        >
          <div className="px-3 py-2 border-b border-anotata-border bg-anotata-lavanda-clara flex items-center gap-2">
            <Bell size={14} className="text-anotata-roxo shrink-0" />
            <h3 className="text-sm font-semibold text-anotata-text flex-1">Lembretes de prazo</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-anotata-muted hover:text-anotata-text rounded"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Status + toggle */}
          <div className="p-3 border-b border-anotata-border space-y-2">
            <div className={`flex items-center gap-2 text-xs ${statusLine.color}`}>
              <StatusIcon size={12} aria-hidden="true" />
              <span>{statusLine.text}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggle}
                disabled={perm === 'unsupported'}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  enabled
                    ? 'bg-anotata-goiaba-bg text-anotata-goiaba-escuro hover:bg-anotata-goiaba-bg/80'
                    : 'bg-anotata-roxo text-white hover:bg-anotata-roxo-escuro'
                } ${perm === 'unsupported' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {enabled ? 'Desativar lembretes' : 'Ativar lembretes'}
              </button>
              <button
                onClick={handleTest}
                disabled={perm !== 'granted'}
                title="Disparar uma notificação de teste"
                className="px-3 py-1.5 rounded-lg text-xs text-anotata-text-suave bg-anotata-lavanda-clara hover:bg-anotata-hover hover:text-anotata-roxo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tocar agora
              </button>
            </div>
            <p className="text-2xs text-anotata-muted leading-relaxed">
              O ANOTATA verifica seus prazos a cada 5 minutos e te avisa pelo navegador
              quando algo vence hoje, amanhã, ou já passou da data.
            </p>
          </div>

          {/* Lista de lembretes */}
          <div className="flex-1 overflow-y-auto py-1">
            {reminders.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-anotata-muted">
                ✨ Nenhum prazo próximo. Você está em dia.
              </div>
            ) : (
              reminders.map((r) => {
                const meta = getDueDateMeta(r.status);
                return (
                  <button
                    key={r.noteId}
                    onClick={() => {
                      if (onOpenNote) onOpenNote(r.noteId);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-anotata-hover transition-colors"
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-2xs font-medium shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-anotata-text font-medium truncate">
                        {r.title}
                      </div>
                      <div className="text-2xs text-anotata-muted truncate">
                        {r.formatted}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
