import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
};

/**
 * Controle de −/+ com o valor no meio.
 *
 * Alvos de toque de 44pt mesmo com o visual compacto: isto é operado com o
 * braço estendido segurando o telefone, às vezes já gravando.
 */
export function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={onDecrement}
          disabled={!canDecrement}
          hitSlop={8}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            !canDecrement && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonGlyph}>−</Text>
        </Pressable>

        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>

        <Pressable
          onPress={onIncrement}
          disabled={!canIncrement}
          hitSlop={8}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            !canIncrement && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  buttonDisabled: {
    opacity: 0.28,
  },
  buttonGlyph: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 26,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
