import type { SomAlerta } from '../types';

/**
 * Toca um beep curto usando Web Audio API — sem precisar de arquivos de áudio.
 *
 * Por que Web Audio e não <audio src="...">:
 *   - Zero asset (nenhum mp3/ogg pra hospedar e versionar)
 *   - Latência praticamente nula (não precisa carregar arquivo)
 *   - Tamanho do bundle não muda
 *   - Política de autoplay dos navegadores: o AudioContext pode iniciar
 *     suspenso. Resolvemos chamando `resume()` na primeira interação do
 *     usuário (registro implícito via getCtx em cada chamada).
 *
 * Limitação: a primeira chamada após carregar a página pode falhar
 * silenciosamente se ainda não houve interação do usuário (clique/toque).
 * Como o toggle de som é ligado por clique do próprio motorista, isso é
 * aceitável — o som funciona após a primeira interação com a UI.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    // Política de autoplay: contexto pode estar suspenso. Tentar resumir
    // não bloqueia — se falhar, o som simplesmente não toca.
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  startMs?: number;
  volume?: number;
}

function tom(ctx: AudioContext, freq: number, duracaoMs: number, { startMs = 0, volume = 0.18 }: ToneOpts = {}) {
  const t0 = ctx.currentTime + startMs / 1000;
  const t1 = t0 + duracaoMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  // Envelope ADSR simplificado: ataque rápido (10ms), decay exponencial.
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t1 + 0.05);
}

export function tocarSomAlerta(som: SomAlerta) {
  if (som === 'none') return;
  const ctx = getCtx();
  if (!ctx) return;

  switch (som) {
    case 'chime':
      // 2 notas suaves em sequência (intervalo de quinta)
      tom(ctx, 660, 180);
      tom(ctx, 880, 220, { startMs: 150 });
      break;
    case 'bell':
      // Sino agudo + harmônico grave
      tom(ctx, 1320, 400, { volume: 0.12 });
      tom(ctx, 660, 400, { volume: 0.06 });
      break;
    case 'ding':
      // Tom único alto e curto
      tom(ctx, 1500, 120);
      break;
    case 'default':
    default:
      // 2 notas ascendentes — feedback "uma coisa aconteceu"
      tom(ctx, 880, 150);
      tom(ctx, 1100, 150, { startMs: 100 });
      break;
  }
}
