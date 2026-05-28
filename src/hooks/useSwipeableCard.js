import { useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 *  ANOTATA — Hook de cartão deslizável (swipe-to-action)
 * ============================================================================
 *
 *  Padrão consagrado no Gmail/Mail/iOS: o usuário arrasta o cartão pra
 *  esquerda pra arquivar, pra direita pra favoritar. Aqui a implementação
 *  fica isolada num hook reutilizável.
 *
 *  Uso:
 *      const { ref, dragX, phase } = useSwipeableCard({
 *        enabled: isMobile,
 *        onSwipeLeftCommit: () => archive(note.id),
 *        onSwipeRightCommit: () => toggleFavorite(note.id),
 *        leftCommitDistance: 180,    // arrastar -180px pra arquivar
 *        rightCommitDistance: 80,    // arrastar +80px pra favoritar
 *      });
 *
 *      <div ref={ref} style={{ transform: `translateX(${dragX}px)` }}>
 *        ...
 *      </div>
 *
 *  Detalhes
 *  --------
 *  - O hook trava a direção dominante no início do gesto: se o dedo está
 *    indo mais pra cima/baixo do que pros lados, ele se "desliga" e deixa
 *    a rolagem vertical acontecer normalmente. Sem isso, o swipe brigaria
 *    com a rolagem da lista.
 *  - Quando trava em "horizontal", chama `preventDefault()` no touchmove
 *    (listener não-passivo) pra impedir que a página role enquanto o
 *    cartão desliza.
 *  - `phase` indica o estado visual:
 *        'idle'         → parado
 *        'dragging'     → o usuário está com o dedo na tela
 *        'snapping'     → soltou e está voltando ao zero (sem disparar)
 *        'committing'   → soltou além do gatilho, indo pra fora
 *  - Após `commit`, o cartão sai voando pra fora da tela (fade) e o
 *    callback é chamado depois. Isso dá a sensação de que a ação aconteceu
 *    "pelo gesto", não "porque um botão foi pressionado".
 * ============================================================================
 */

const ABS_DEAD_ZONE = 6;          // ignora micro-movimentos
const VERTICAL_LOCK_DELTA = 12;   // se desviou mais que isso na vertical, abandona
const ANIMATION_MS = 220;

export default function useSwipeableCard({
  enabled = true,
  onSwipeLeftCommit,
  onSwipeRightCommit,
  leftCommitDistance = 180,
  rightCommitDistance = 80,
  maxLeftDrag = 280,
  maxRightDrag = 140,
}) {
  const elementRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [phase, setPhase] = useState('idle');

  // Refs pra evitar re-attach dos listeners quando callbacks mudarem
  const onLeftRef = useRef(onSwipeLeftCommit);
  const onRightRef = useRef(onSwipeRightCommit);
  const enabledRef = useRef(enabled);

  useEffect(() => { onLeftRef.current = onSwipeLeftCommit; }, [onSwipeLeftCommit]);
  useEffect(() => { onRightRef.current = onSwipeRightCommit; }, [onSwipeRightCommit]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return undefined;

    let startX = 0, startY = 0;
    let lock = null;            // null | 'h' | 'v'
    let current = 0;
    let interactionId = 0;

    const reset = (animate = true) => {
      if (animate) setPhase('snapping');
      setDragX(0);
      current = 0;
      lock = null;
      if (animate) {
        const id = ++interactionId;
        setTimeout(() => {
          // Só vira "idle" se ninguém começou outro gesto enquanto isso
          if (id === interactionId) setPhase('idle');
        }, ANIMATION_MS);
      } else {
        setPhase('idle');
      }
    };

    const onStart = (e) => {
      if (!enabledRef.current) return;
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lock = null;
      current = 0;
      interactionId++;
      setPhase('idle'); // não trava em "dragging" enquanto não tiver lock
    };

    const onMove = (e) => {
      if (!enabledRef.current) return;
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (lock == null) {
        // Esperando saída da dead zone pra decidir direção
        if (adx < ABS_DEAD_ZONE && ady < ABS_DEAD_ZONE) return;
        if (ady > VERTICAL_LOCK_DELTA && ady > adx) {
          // É rolagem vertical — desliga este gesto
          lock = 'v';
          return;
        }
        if (adx > ABS_DEAD_ZONE && adx >= ady) {
          lock = 'h';
          setPhase('dragging');
        }
      }

      if (lock !== 'h') return;

      // Bloqueia rolagem da página enquanto desliza o cartão
      if (e.cancelable) e.preventDefault();

      // Resistência elástica nos extremos (sensação de borracha)
      let next = dx;
      if (next < -maxLeftDrag) {
        const over = -maxLeftDrag - next;
        next = -maxLeftDrag - over * 0.25;
      } else if (next > maxRightDrag) {
        const over = next - maxRightDrag;
        next = maxRightDrag + over * 0.25;
      }
      current = next;
      setDragX(next);
    };

    const onEnd = () => {
      if (!enabledRef.current || lock !== 'h') {
        // não houve drag horizontal completo, só reseta
        if (current !== 0 || dragX !== 0) reset(true);
        else { lock = null; setPhase('idle'); }
        return;
      }

      const finalDx = current;

      // Compromisso à esquerda → arquivar
      if (finalDx <= -leftCommitDistance && onLeftRef.current) {
        setPhase('committing');
        const id = ++interactionId;
        // Anima pra fora da tela
        setDragX(-Math.max(window.innerWidth, leftCommitDistance + 200));
        setTimeout(() => {
          if (id !== interactionId) return;
          try { onLeftRef.current(); } catch (_) {}
          // Após o commit, o item provavelmente some da lista (foi arquivado).
          // Se sobrar (caller decidiu não remover), volta ao zero.
          setDragX(0);
          setPhase('idle');
        }, ANIMATION_MS);
        return;
      }

      // Compromisso à direita → favoritar (volta ao zero rapidinho)
      if (finalDx >= rightCommitDistance && onRightRef.current) {
        try { onRightRef.current(); } catch (_) {}
        reset(true);
        return;
      }

      // Sem commit → snap back
      reset(true);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [leftCommitDistance, rightCommitDistance, maxLeftDrag, maxRightDrag]);

  return { ref: elementRef, dragX, phase };
}
