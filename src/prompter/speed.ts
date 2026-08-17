/**
 * Conversão entre a velocidade que o usuário controla (duração total) e a que a
 * engine consome (px/s).
 *
 * Por que não expor px/s direto: dobrando o tamanho da fonte, cada linha fica
 * duas vezes mais alta, então uma velocidade fixa em px/s entrega metade das
 * linhas por segundo — o ritmo de leitura cai pela metade justamente quando
 * você só queria enxergar melhor.
 *
 * Duração total é imune a isso (mudar a fonte reflui o texto, e `maxScroll`
 * acompanha) e tem a propriedade que WPM não tem: o número que você escolhe é
 * literalmente o tempo que a rolagem leva, cronometrável. O preço é que editar
 * o roteiro muda o ritmo de leitura — escrever mais dois parágrafos aperta a
 * mesma duração. `impliedWpm` existe para tornar esse preço visível.
 */

import { speed as speedRange } from '../theme';

/** Conta palavras de forma tolerante a espaços múltiplos e quebras de linha. */
export function countWords(script: string): number {
  const trimmed = script.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * @param maxScroll Distância que a rolagem precisa percorrer, em px. Derivar
 *   daqui — e não da altura do texto — é o que garante que a duração escolhida
 *   seja exatamente a observada: a engine para em `maxScroll`, não na altura.
 * @param durationSec Tempo desejado para percorrer tudo.
 * @returns Velocidade em px/s para a engine.
 */
export function durationToPxPerSec(
  maxScroll: number,
  durationSec: number
): number {
  if (maxScroll <= 0 || durationSec <= 0) return 0;
  return maxScroll / durationSec;
}

/**
 * Ritmo de leitura que a duração escolhida implica, em palavras por minuto.
 * Só para exibir: 140 ppm é conversa confortável, acima de 200 é apressado.
 */
export function impliedWpm(totalWords: number, durationSec: number): number {
  if (totalWords <= 0 || durationSec <= 0) return 0;
  return (totalWords / durationSec) * 60;
}

/**
 * Próximo valor do stepper de duração, já com clamp na faixa.
 *
 * O passo muda em `coarseAboveSec`, e a assimetria entre `>=` (subindo) e `>`
 * (descendo) é proposital: sem ela, 60 subiria para 65 e desceria para 45, e o
 * limiar viraria um buraco em vez de uma fronteira. Com ela, 60 → 75 → 60 → 55.
 */
export function stepDuration(current: number, direction: 1 | -1): number {
  const crossesCoarse =
    direction > 0
      ? current >= speedRange.coarseAboveSec
      : current > speedRange.coarseAboveSec;

  const step = crossesCoarse
    ? speedRange.coarseStepSec
    : speedRange.fineStepSec;

  const next = current + direction * step;
  return Math.min(Math.max(next, speedRange.minSec), speedRange.maxSec);
}

/** Formata segundos como `m:ss`. */
export function formatDuration(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
