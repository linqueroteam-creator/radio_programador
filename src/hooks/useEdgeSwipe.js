import { useEffect, useRef } from 'react';

/**
 * ============================================================================
 *  ANOTATA — Hook de "edge swipe"
 * ============================================================================
 *
 *  Detecta quando o usuário arrasta o dedo a partir de uma das bordas da
 *  tela (esquerda ou direita) e dispara um callback. Usado em mobile pra
 *  abrir a gaveta lateral ao puxar do canto, como Gmail/Slack/Notion fazem.
 *
 *  Por que tem que ser pelo canto:
 *  -------------------------------
 *  Se ouvíssemos qualquer "swipe horizontal", o gesto colidiria com:
 *    - rolagem horizontal de listas (toolbar do editor)
 *    - swipe-to-archive na lista de notas
 *    - drag de imagens redimensionáveis
 *  Limitar à borda (24px) garante que só ativa quando o usuário "puxa de
 *  fora pra dentro", deixando o resto do app livre de interferência.
 *
 *  Uso:
 *      useEdgeSwipe({
 *        enabled: isMobile,
 *        edge: 'left',          // 'left' | 'right'
 *        threshold: 60,         // pixels horizontais
 *        onSwipe: () => openSidebar(),
 *      });
 *
 *  Importante:
 *    - Listener `passive: true` — não bloqueia rolagem em nenhum momento.
 *    - Cancela automaticamente se o usuário arrastar muito na vertical
 *      (provavelmente está rolando a página, não puxando a gaveta).
 *    - Cancela se o gesto demorar mais de ~700ms (tempo demais é sinal
 *      de que parou pra olhar, não pra abrir).
 * ============================================================================
 */

export default function useEdgeSwipe({
  enabled = true,
  edge = 'left',
  edgeWidth = 24,
  threshold = 60,
  maxVerticalDelta = 60,
  maxDuration = 700,
  onSwipe,
}) {
  // Refs pra leitura sempre fresca dentro do listener (sem re-attach)
  const enabledRef = useRef(enabled);
  const edgeRef = useRef(edge);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { edgeRef.current = edge; }, [edge]);
  useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let tracking = null;

    const onStart = (e) => {
      if (!enabledRef.current) return;
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      const winW = window.innerWidth;
      const fromLeft = t.clientX <= edgeWidth;
      const fromRight = t.clientX >= winW - edgeWidth;
      const wantsLeft = edgeRef.current === 'left';
      if (wantsLeft && !fromLeft) return;
      if (!wantsLeft && !fromRight) return;
      tracking = { startX: t.clientX, startY: t.clientY, t0: Date.now() };
    };

    const onEnd = (e) => {
      if (!tracking) return;
      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) { tracking = null; return; }
      const dx = t.clientX - tracking.startX;
      const dy = Math.abs(t.clientY - tracking.startY);
      const dt = Date.now() - tracking.t0;
      tracking = null;
      if (dt > maxDuration) return;
      if (dy > maxVerticalDelta) return;
      const direction = edgeRef.current === 'left' ? 1 : -1;
      const horizontalDelta = dx * direction;
      if (horizontalDelta < threshold) return;
      try { onSwipeRef.current && onSwipeRef.current(); } catch (_) {}
    };

    const onCancel = () => { tracking = null; };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, [edgeWidth, threshold, maxVerticalDelta, maxDuration]);
}
