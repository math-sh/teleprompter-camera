/**
 * Paleta e constantes de layout.
 *
 * A regra que rege tudo aqui: o preview da câmera é o fundo. Nenhum elemento de
 * UI pode competir com ele, então todo painel é escuro e translúcido, e o único
 * acento cromático é o vermelho de gravação.
 */

export const colors = {
  /** Fundo das telas sem câmera (gate de permissão, editor). */
  screen: '#0A0A0B',
  /** Painéis flutuantes sobre a câmera. */
  panel: 'rgba(18,18,20,0.82)',
  panelBorder: 'rgba(255,255,255,0.12)',

  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.62)',
  textFaint: 'rgba(255,255,255,0.38)',

  /** Vermelho de gravação — o único acento saturado do app. */
  record: '#FF3B30',
  recordDim: 'rgba(255,59,48,0.22)',

  accent: '#0A84FF',
} as const;

export const layout = {
  /**
   * Distância entre o recorte (notch / Dynamic Island) e a primeira linha.
   * Somado a `insets.top`, nunca usado sozinho — o XR tem 44pt de inset e o
   * 15 Pro tem 59pt, e essa diferença é exatamente o que separa "colado na
   * lente" de "escondido atrás da Dynamic Island".
   */
  bandTopGap: 4,

  /** Altura da banda de leitura, como fração da altura da janela. */
  bandHeightRatio: 0.34,

  /**
   * Onde fica a linha ativa dentro da banda, como fração da altura dela.
   * Propositalmente acima do centro: o objetivo é manter o olho perto da
   * lente. Centralizar joga o olhar para baixo e devolve exatamente o
   * problema que o app existe para resolver.
   */
  activeLineRatio: 0.25,

  /** Margem lateral do texto do roteiro. */
  textInsetX: 22,
} as const;

export const typography = {
  minFontSize: 20,
  maxFontSize: 64,
  fontSizeStep: 4,
  /** Entrelinha generosa: teleprompter é lido em movimento, não parado. */
  lineHeightRatio: 1.35,
} as const;

export const speed = {
  /** Duração total da subida do roteiro, em segundos. */
  minSec: 10,
  maxSec: 600,
  /**
   * Passo fino até 1 minuto, grosso acima. Com passo fixo de 5s, ir de 10s a
   * 10min custaria 118 toques; com passo fixo de 15s, não dá para ajustar
   * finamente um roteiro curto, que é onde 5 segundos fazem diferença.
   */
  fineStepSec: 5,
  coarseStepSec: 15,
  coarseAboveSec: 60,
} as const;
