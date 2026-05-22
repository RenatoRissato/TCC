import type { CSSProperties } from 'react';
import { useCountUp } from '../../utils/animations';

interface AnimatedNumberProps {
  /** Valor alvo. A animacao desliza do anterior pra esse. */
  value: number;
  /** Duracao em ms. Default 800ms (sensacao "rapida mas perceptivel"). */
  duration?: number;
  /** Sufixo opcional ("%", " min", etc) renderizado sem virgula. */
  suffix?: string;
  /** Classes Tailwind do span externo. */
  className?: string;
  style?: CSSProperties;
}

/**
 * Numero que conta progressivamente ate o valor final. Usado em contadores
 * grandes (Dashboard) e estatisticas — substitui o salto brusco "0 -> 17"
 * por uma transicao easeOut natural. Respeita prefers-reduced-motion
 * (renderiza o valor final estatico para usuarios com a preferencia setada).
 */
export function AnimatedNumber({
  value, duration = 800, suffix, className, style,
}: AnimatedNumberProps) {
  const displayed = useCountUp(value, { duration });
  return (
    <span className={className} style={style}>
      {displayed}
      {suffix}
    </span>
  );
}
