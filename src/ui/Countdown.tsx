import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme';

type Props = {
  /** Número atual da contagem, ou `null` quando não há contagem em curso. */
  value: number | null;
};

/**
 * Contagem regressiva antes de a rolagem começar.
 *
 * Existe por um motivo prático: a gravação começa antes da leitura, então você
 * precisa de um par de segundos para respirar, encarar a lente e não entrar
 * falando por cima do primeiro frame.
 */
export function Countdown({ value }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (value === null) {
      opacity.value = withTiming(0, { duration: 150 });
      return;
    }

    // Pulso a cada número: entra grande e assenta.
    scale.value = 1.35;
    opacity.value = 1;
    scale.value = withTiming(1, { duration: 320 });
    opacity.value = withTiming(0.75, { duration: 900 });
  }, [value, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (value === null) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.bubble, style]}>
        <Text style={styles.digit}>{value}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,11,0.55)',
  },
  digit: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
