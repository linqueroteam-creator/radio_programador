import { useEffect, useState } from 'react';

/**
 * ============================================================================
 *  ANOTATA — Hook de detecção mobile
 * ============================================================================
 *
 *  Retorna `true` se a tela é menor que o breakpoint informado (default 768px,
 *  que é o `md` do Tailwind).
 *
 *  - Faz a leitura inicial de forma segura (suporta SSR sem `window`).
 *  - Escuta `resize` da janela e atualiza o valor reativamente.
 *  - Debounce simples via `requestAnimationFrame` para não disparar em rajada.
 *
 *  Uso:
 *      import useIsMobile from '../hooks/useIsMobile';
 *      const isMobile = useIsMobile();        // < 768
 *      const isNarrow = useIsMobile(640);     // < 640 (sm)
 *
 *  Por que existe:
 *  - Tailwind cobre o estilo em CSS, mas ALGUMAS coisas só dá pra resolver em
 *    JS: estado de gavetas (drawer aberto/fechado), bloqueio de scroll do
 *    body, fechar gavetas ao redimensionar pra desktop, etc.
 *  - Concentrar essa lógica num hook único evita repetir `window.innerWidth`
 *    em vários componentes.
 * ============================================================================
 */
export default function useIsMobile(breakpoint = 768) {
  const getCurrent = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getCurrent);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let frame = null;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < breakpoint);
      });
    };

    window.addEventListener('resize', onResize);
    // Roda uma vez no mount pra garantir sincronia (em caso de hidratação)
    onResize();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [breakpoint]);

  return isMobile;
}
