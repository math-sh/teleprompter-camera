import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { colors, layout, typography } from '../theme';
import type { ScrollEngine } from './useScrollEngine';

type Props = {
  script: string;
  fontSize: number;
  engine: ScrollEngine;
  /** Topo da banda de leitura, em px, já somado ao safe area inset. */
  bandTop: number;
  bandHeight: number;
  /** Altura medida do texto renderizado — alimenta `maxScroll` e a velocidade. */
  onContentHeightChange: (height: number) => void;
};

/**
 * A camada de texto do teleprompter.
 *
 * Sobre espelhamento: esta é uma view React Native comum, irmã do preview da
 * câmera. O espelhamento do preview frontal acontece dentro de uma
 * `AVCaptureVideoPreviewLayer` nativa, abaixo desta árvore — o texto já nasce
 * legível e nenhuma contra-transformação é necessária. Aplicar `scaleX: -1`
 * em qualquer ancestral aqui é o único jeito de quebrar isso.
 */
function TeleprompterOverlayImpl({
  script,
  fontSize,
  engine,
  bandTop,
  bandHeight,
  onContentHeightChange,
}: Props) {
  const lineHeight = Math.round(fontSize * typography.lineHeightRatio);
  const activeLineOffset = bandHeight * layout.activeLineRatio;

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -engine.offsetY.value }],
  }));

  const handleTextLayout = (event: LayoutChangeEvent) => {
    onContentHeightChange(event.nativeEvent.layout.height);
  };

  return (
    <View
      pointerEvents="none"
      style={[styles.band, { top: bandTop, height: bandHeight }]}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          // Desvanece o texto nas bordas da banda agindo sobre o alpha dele.
          // Um gradiente de cor sólida por cima faria o mesmo efeito visual no
          // texto, mas escureceria o preview da câmera junto — que é
          // exatamente o que não se pode fazer aqui.
          <LinearGradient
            style={StyleSheet.absoluteFill}
            colors={[
              'transparent',
              'rgba(0,0,0,1)',
              'rgba(0,0,0,1)',
              'transparent',
            ]}
            // O texto sobe: entra por baixo, sai por cima. A linha ativa está
            // a 25% do topo, então o fade superior precisa terminar antes
            // disso para não apagar o que você está lendo agora.
            locations={[0, 0.18, 0.78, 1]}
          />
        }
      >
        <Animated.View
          style={[styles.scroller, { paddingTop: activeLineOffset }, scrollStyle]}
        >
          <Text
            onLayout={handleTextLayout}
            style={[styles.script, { fontSize, lineHeight }]}
          >
            {script}
          </Text>
        </Animated.View>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  scroller: {
    // `position: absolute` aqui NÃO é cosmético, e transformar isto em fluxo
    // normal quebra a rolagem inteira de um jeito silencioso.
    //
    // Em fluxo normal, o Yoga mede um filho de container de altura definida
    // (a banda) com `MeasureMode::AtMost(bandHeight)`, e o layout de texto do
    // iOS trunca a medida nesse limite. O `onLayout` do <Text> abaixo passa a
    // reportar ~4 linhas em vez do roteiro inteiro — e como `pxPerSec` e
    // `maxScroll` derivam os dois dessa altura, a rolagem sai ~10x lenta e
    // ainda para no começo do texto.
    //
    // Nada disso é visível: a banda só exibe ~5 linhas, então o texto truncado
    // preenche a tela e parece inteiro. Absoluto com `top/left/right` e sem
    // `height` nem `bottom` deixa a altura em `MeasureMode::Undefined`, que é
    // o que faz o <Text> medir a altura natural completa.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  script: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'left',
    paddingHorizontal: layout.textInsetX,
    // Contraste sobre um fundo arbitrário — o preview da câmera pode ser
    // qualquer coisa, de uma parede branca a uma janela estourada.
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

export const TeleprompterOverlay = memo(TeleprompterOverlayImpl);
