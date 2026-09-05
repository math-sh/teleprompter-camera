import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration, stepDuration } from '../prompter/speed';
import { colors, speed as speedRange, typography } from '../theme';
import { Stepper } from './Stepper';

type Props = {
  bottomInset: number;

  fontSize: number;
  onFontSizeChange: (next: number) => void;

  /** Tempo total da subida do roteiro, em segundos. */
  durationSec: number;
  onDurationChange: (next: number) => void;

  words: number;
  /** Ritmo de leitura que a duração implica, em palavras por minuto. */
  pace: number;

  isRecording: boolean;
  isSaving: boolean;
  recordElapsedSec: number;
  onToggleRecording: () => void;

  isScrolling: boolean;
  onToggleScroll: () => void;
  onRewind: () => void;

  onToggleFacing: () => void;
  /**
   * Falso enquanto há tomada em andamento — trocar de câmera reconfigura a
   * sessão de captura e encerraria a gravação. Ver o docblock do CameraLayer.
   */
  canToggleFacing: boolean;

  onEditScript: () => void;
};

export function Controls({
  bottomInset,
  fontSize,
  onFontSizeChange,
  durationSec,
  onDurationChange,
  words,
  pace,
  isRecording,
  isSaving,
  recordElapsedSec,
  onToggleRecording,
  isScrolling,
  onToggleScroll,
  onRewind,
  onToggleFacing,
  canToggleFacing,
  onEditScript,
}: Props) {
  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(bottomInset, 14) }]}
    >
      {/* Enquanto grava, os ajustes continuam disponíveis — corrigir a
          velocidade no meio de uma tomada é melhor que refazer a tomada. */}
      <View style={styles.steppers}>
        <Stepper
          label="Fonte"
          value={`${fontSize}`}
          onDecrement={() => onFontSizeChange(fontSize - typography.fontSizeStep)}
          onIncrement={() => onFontSizeChange(fontSize + typography.fontSizeStep)}
          canDecrement={fontSize > typography.minFontSize}
          canIncrement={fontSize < typography.maxFontSize}
        />

        <View style={styles.divider} />

        <Stepper
          label="Duração"
          value={formatDuration(durationSec)}
          onDecrement={() => onDurationChange(stepDuration(durationSec, -1))}
          onIncrement={() => onDurationChange(stepDuration(durationSec, 1))}
          canDecrement={durationSec > speedRange.minSec}
          canIncrement={durationSec < speedRange.maxSec}
        />
      </View>

      {/* O stepper já mostra o tempo; o que ele não mostra é se esse tempo dá
          um ritmo humano. 140 ppm é conversa, acima de 200 é apressado. */}
      <Text style={styles.estimate}>
        {words > 0
          ? `${words} ${words === 1 ? 'palavra' : 'palavras'} · ~${Math.round(pace)} ppm`
          : 'Nenhum roteiro carregado'}
      </Text>

      <View style={styles.actions}>
        <View style={styles.sideSlot}>
          {isRecording ? (
            <View style={styles.timer}>
              <View style={styles.timerDot} />
              <Text style={styles.timerText}>
                {formatDuration(recordElapsedSec)}
              </Text>
            </View>
          ) : (
            <View style={styles.scriptGroup}>
              <Pressable
                onPress={onEditScript}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.secondary,
                  pressed && styles.secondaryPressed,
                ]}
              >
                <Text style={styles.secondaryText}>Roteiro</Text>
              </Pressable>

              {/* Trocar entre a frontal e a traseira. Vive neste slot porque
                  o cronômetro o ocupa durante a gravação — que é exatamente
                  quando a troca é proibida. O botão some em vez de ficar na
                  tela pedindo um toque que não faz nada. */}
              <Pressable
                onPress={onToggleFacing}
                disabled={!canToggleFacing}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                  !canToggleFacing && styles.iconButtonDisabled,
                ]}
              >
                <Text style={styles.iconGlyph}>⇄</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable
          onPress={onToggleRecording}
          disabled={isSaving}
          hitSlop={8}
          style={({ pressed }) => [
            styles.recordRing,
            pressed && styles.recordRingPressed,
            isSaving && styles.recordRingDisabled,
          ]}
        >
          <View
            style={[styles.recordCore, isRecording && styles.recordCoreActive]}
          />
        </Pressable>

        <View style={styles.sideSlot}>
          <View style={styles.playbackGroup}>
            <Pressable
              onPress={onRewind}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <Text style={styles.iconGlyph}>⤒</Text>
            </Pressable>

            <Pressable
              onPress={onToggleScroll}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <Text style={styles.iconGlyph}>{isScrolling ? '❚❚' : '▶'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isSaving ? (
        <Text style={styles.savingNote}>Salvando na galeria…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: colors.panel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.panelBorder,
  },
  steppers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: colors.panelBorder,
  },
  estimate: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideSlot: {
    flex: 1,
    alignItems: 'center',
  },

  recordRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRingPressed: {
    opacity: 0.7,
  },
  recordRingDisabled: {
    opacity: 0.4,
  },
  recordCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.record,
  },
  // Círculo vira quadrado arredondado ao gravar: a mesma convenção da câmera
  // nativa do iOS, para não obrigar ninguém a reaprender o botão.
  recordCoreActive: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },

  secondary: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  secondaryPressed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  secondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Pílula do roteiro + troca de câmera. O gap é menor que o do playbackGroup
  // porque este slot carrega uma pílula de texto junto: num aparelho estreito
  // (SE, 375pt) sobram ~135pt aqui e o conteúdo mede quase isso.
  scriptGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playbackGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  // Mesma opacidade do recordRingDisabled: um só vocabulário para "agora não".
  iconButtonDisabled: {
    opacity: 0.4,
  },
  iconGlyph: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.recordDim,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.record,
  },
  timerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  savingNote: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
  },
});
