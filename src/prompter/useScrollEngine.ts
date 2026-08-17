import { useCallback, useMemo } from 'react';
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Descarta frames com Δt absurdo.
 *
 * `timeSincePreviousFrame` vem gigante quando o app volta do background ou
 * quando a primeira frame roda depois da montagem. Sem essa guarda o texto
 * teleporta vários parágrafos no instante em que você reabre o app.
 * 250ms = 15 frames a 60Hz; qualquer coisa acima disso não é uma frame real.
 */
const MAX_PLAUSIBLE_FRAME_MS = 250;

export type ScrollEngine = {
  /** Pixels já rolados. Cresce; o transform aplica como translateY negativo. */
  offsetY: SharedValue<number>;
  /** Velocidade em px/s. Derivada da duração — ver `durationToPxPerSec`. */
  pxPerSec: SharedValue<number>;
  isRunning: SharedValue<boolean>;
  maxScroll: SharedValue<number>;

  start: () => void;
  pause: () => void;
  toggle: () => void;
  /** Volta ao topo e para. */
  reset: () => void;
  /**
   * Atualiza o limite de rolagem preservando o progresso relativo.
   * É isto que mantém você na mesma palavra quando o tamanho da fonte muda.
   */
  setMaxScroll: (next: number) => void;
  /** Soma um delta ao offset (arrasto manual), respeitando os limites. */
  nudge: (dy: number) => void;
};

/**
 * Motor de rolagem do teleprompter — roda inteiramente na UI thread.
 *
 * Usa `useFrameCallback` com acumulação por Δt em vez de `withTiming(duração)`.
 * As três razões, em ordem de importância:
 *
 * 1. **Independência de refresh rate.** Um acumulador de "N pixels por frame"
 *    rodaria em velocidade dobrada num 15 Pro (120Hz) comparado a um XR (60Hz).
 *    Multiplicar pelo Δt real elimina isso.
 * 2. **Mudança de velocidade sem descontinuidade.** Trocar a duração no meio da
 *    leitura é só escrever em `pxPerSec.value`. Com `withTiming` seria preciso
 *    recalcular a duração e reiniciar a animação, o que produz um salto visível.
 * 3. **Composição com gesto.** O arrasto manual soma em `offsetY` sem brigar
 *    com uma animação em curso, porque não há animação em curso — há um
 *    acumulador.
 *
 * Nada aqui cruza para a JS thread durante a rolagem, exceto uma única
 * notificação quando o roteiro termina.
 */
export function useScrollEngine(onComplete?: () => void): ScrollEngine {
  const offsetY = useSharedValue(0);
  const pxPerSec = useSharedValue(0);
  const isRunning = useSharedValue(false);
  const maxScroll = useSharedValue(0);

  // `useCallback` em vez de um worklet inline: o `useFrameCallback` depende de
  // `[callback, autostart]` no seu efeito interno, então uma identidade nova a
  // cada render desmonta e remonta o loop da UI thread. Cada remontagem perde
  // uma frame (a primeira do novo registro sempre vem com
  // `timeSincePreviousFrame: null`, descartado pela guarda abaixo) — e durante
  // a gravação o cronômetro re-renderiza esta tela a 2Hz.
  const onFrame = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      if (!isRunning.value) return;

      const elapsedMs = frame.timeSincePreviousFrame;
      if (
        elapsedMs === null ||
        elapsedMs <= 0 ||
        elapsedMs > MAX_PLAUSIBLE_FRAME_MS
      ) {
        return;
      }

      const limit = maxScroll.value;

      // Roteiro ainda não medido (ou curto demais para rolar). Sem esta guarda,
      // `next >= limit` seria verdadeiro já na primeira frame e a rolagem se
      // declararia concluída antes de começar — indistinguível, para quem olha,
      // de um play que não funciona.
      if (limit <= 0) return;

      const next = offsetY.value + pxPerSec.value * (elapsedMs / 1000);

      if (next >= limit) {
        offsetY.value = limit;
        isRunning.value = false;
        if (onComplete) runOnJS(onComplete)();
        return;
      }

      offsetY.value = next;
    },
    [isRunning, maxScroll, offsetY, pxPerSec, onComplete]
  );

  // `autostart: true` de propósito. O segundo argumento do useFrameCallback
  // controla se o callback roda, e não se a rolagem anda — quem controla a
  // rolagem é `isRunning`. Passar `false` aqui deixava o callback inerte, e
  // então ligar `isRunning` não produzia efeito nenhum: não havia ninguém
  // rodando para ler a variável.
  //
  // Manter o callback sempre ativo custa um `if` por frame na UI thread
  // (~100ns), o que é irrelevante até no A12. Em troca, existe uma única
  // fonte de verdade para "está rolando?" em vez de duas para sincronizar.
  useFrameCallback(onFrame, true);

  const start = useCallback(() => {
    // Falhar em medir o texto zera `maxScroll` e `pxPerSec` de uma vez só, e o
    // resultado é um play que acende o botão de pausa e não move nada. Já
    // aconteceu uma vez (o <Text> era medido truncado dentro da banda) e levou
    // muito tempo para ser diagnosticado justamente por ser mudo.
    if (__DEV__ && maxScroll.value <= 0) {
      console.warn(
        '[prompter] start() com maxScroll = 0 — o texto não foi medido; nada vai rolar.'
      );
    }

    // Chegou ao fim: um novo play recomeça do topo em vez de não fazer nada.
    if (offsetY.value >= maxScroll.value) offsetY.value = 0;
    isRunning.value = true;
  }, [isRunning, offsetY, maxScroll]);

  const pause = useCallback(() => {
    isRunning.value = false;
  }, [isRunning]);

  const toggle = useCallback(() => {
    if (isRunning.value) pause();
    else start();
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
    isRunning.value = false;
    offsetY.value = 0;
  }, [isRunning, offsetY]);

  const setMaxScroll = useCallback(
    (next: number) => {
      const safeNext = Math.max(0, next);
      const previous = maxScroll.value;

      // Preserva a posição relativa de leitura. O texto reflui
      // proporcionalmente quando a fonte muda, então a mesma fração da altura
      // total corresponde aproximadamente à mesma palavra.
      if (previous > 0 && safeNext > 0) {
        const progress = offsetY.value / previous;
        offsetY.value = Math.min(progress * safeNext, safeNext);
      } else if (safeNext === 0) {
        offsetY.value = 0;
      }

      maxScroll.value = safeNext;
    },
    [maxScroll, offsetY]
  );

  const nudge = useCallback(
    (dy: number) => {
      const next = offsetY.value + dy;
      offsetY.value = Math.min(Math.max(next, 0), maxScroll.value);
    },
    [offsetY, maxScroll]
  );

  // Identidade estável: quem consome isto roda efeitos com `engine` na lista
  // de dependências, e um objeto novo a cada render os dispararia sem parar.
  return useMemo(
    () => ({
      offsetY,
      pxPerSec,
      isRunning,
      maxScroll,
      start,
      pause,
      toggle,
      reset,
      setMaxScroll,
      nudge,
    }),
    [
      offsetY,
      pxPerSec,
      isRunning,
      maxScroll,
      start,
      pause,
      toggle,
      reset,
      setMaxScroll,
      nudge,
    ]
  );
}
