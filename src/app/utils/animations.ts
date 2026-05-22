import { useEffect, useRef, useState } from 'react';
import type { Transition, Variants } from 'motion/react';

/**
 * Anima um numero de 0 (ou valor anterior) ate `target` no carregamento.
 * Use em contadores do Dashboard (VAI / NAO / PEND) e em statisticas — em vez
 * de aparecer o numero final estatico, ele "conta" rapidamente. Da sensacao
 * de vida sem ser barulhento.
 *
 * Respeita prefers-reduced-motion: usuarios com a preferencia setada veem o
 * numero final direto, sem animação.
 */
export function useCountUp(
  target: number,
  options: { duration?: number; startFrom?: number } = {},
): number {
  const { duration = 800, startFrom } = options;
  const [value, setValue] = useState<number>(startFrom ?? target);
  const previousTarget = useRef<number>(startFrom ?? target);

  useEffect(() => {
    // Respeita preferencia do sistema — pula a animacao se for "reduzir movimento"
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(target);
      previousTarget.current = target;
      return;
    }

    const from = previousTarget.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic — desacelera no fim, deixa o numero "pousar" no valor final
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    previousTarget.current = to;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// ─── Variants reusaveis pra motion ───────────────────────────────────────

/** Container que aplica stagger nos filhos. */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

/** Item filho que sobe + fade. Combina com `staggerContainer` no pai. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Item filho com scale leve — bom pra cards e KPIs. */
export const popInItem: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Transition spring suave — usar em bottom sheets, drawers, layout shifts. */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.9,
};
