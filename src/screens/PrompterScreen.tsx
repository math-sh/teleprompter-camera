import type { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraLayer } from '../camera/CameraLayer';
import { useRecorder } from '../camera/useRecorder';
import { DEFAULT_SCRIPT } from '../prompter/defaultScript';
import { countWords, durationToPxPerSec, impliedWpm } from '../prompter/speed';
import { TeleprompterOverlay } from '../prompter/TeleprompterOverlay';
import { useScrollEngine } from '../prompter/useScrollEngine';
import { layout, typography } from '../theme';
import { Controls } from '../ui/Controls';
import { Countdown } from '../ui/Countdown';
import { ScriptEditorModal } from './ScriptEditorModal';

const COUNTDOWN_FROM = 3;
const COUNTDOWN_TICK_MS = 900;

/** ~1 minuto é o tempo do roteiro padrão num ritmo de conversa (≈140 ppm). */
const DEFAULT_DURATION_SEC = 60;

export function PrompterScreen() {
  // Sem isto a tela apaga no meio de uma tomada. Vale para a tela inteira e
  // não só durante a gravação: você também fica parado lendo enquanto se
  // enquadra, sem tocar em nada.
  useKeepAwake();

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView | null>(null);

  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [fontSize, setFontSize] = useState(36);
  const [durationSec, setDurationSec] = useState(DEFAULT_DURATION_SEC);
  const [contentHeight, setContentHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);

  const handleScrollComplete = useCallback(() => setIsScrolling(false), []);
  const engine = useScrollEngine(handleScrollComplete);

  const stopScrolling = useCallback(() => {
    engine.pause();
    setIsScrolling(false);
  }, [engine]);

  const recorder = useRecorder(cameraRef, stopScrolling);
  // Desestruturado de propósito: estas referências são estáveis, enquanto o
  // objeto `recorder` muda a cada tique do cronômetro. Um efeito que dependa
  // do objeto inteiro reinicia seus timers sem parar durante a gravação.
  const { start: startRecording, stop: stopRecording, clearError } = recorder;

  // --- Geometria da banda de leitura -------------------------------------
  // O topo depende do inset real do aparelho: 44pt no XR (notch) e 59pt no
  // 15 Pro (Dynamic Island). Um valor fixo esconderia o texto atrás do
  // recorte num dos dois.
  const bandTop = insets.top + layout.bandTopGap;
  const bandHeight = Math.round(windowHeight * layout.bandHeightRatio);
  const lineHeight = Math.round(fontSize * typography.lineHeightRatio);

  const words = useMemo(() => countWords(script), [script]);
  const pace = useMemo(
    () => impliedWpm(words, durationSec),
    [words, durationSec]
  );

  // A rolagem termina com a última linha parada na altura de leitura, e não
  // com o texto inteiro fora da tela.
  const maxScroll = Math.max(0, contentHeight - lineHeight);

  useEffect(() => {
    engine.setMaxScroll(maxScroll);
  }, [engine, maxScroll]);

  // Duração → px/s. Reage a fonte e roteiro (via maxScroll) e ao tempo escolhido.
  useEffect(() => {
    engine.pxPerSec.value = durationToPxPerSec(maxScroll, durationSec);
  }, [engine, maxScroll, durationSec]);

  // --- Contagem regressiva ------------------------------------------------
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      startRecording();
      engine.start();
      setIsScrolling(true);
      return;
    }

    const id = setTimeout(
      () => setCountdown((current) => (current === null ? null : current - 1)),
      COUNTDOWN_TICK_MS
    );
    return () => clearTimeout(id);
  }, [countdown, engine, startRecording]);

  useEffect(() => {
    if (!recorder.error) return;
    Alert.alert('Não foi possível gravar', recorder.error, [
      { text: 'OK', onPress: clearError },
    ]);
  }, [recorder.error, clearError]);

  // --- Ações --------------------------------------------------------------
  const handleToggleRecording = useCallback(() => {
    if (recorder.status === 'recording') {
      stopRecording();
      return;
    }

    if (countdown !== null) {
      setCountdown(null); // segundo toque durante a contagem = cancelar
      return;
    }

    // Toda tomada nova começa do topo do roteiro.
    engine.reset();
    setIsScrolling(false);
    setCountdown(COUNTDOWN_FROM);
  }, [recorder.status, stopRecording, countdown, engine]);

  const handleToggleScroll = useCallback(() => {
    if (isScrolling) {
      stopScrolling();
    } else {
      engine.start();
      setIsScrolling(true);
    }
  }, [isScrolling, engine, stopScrolling]);

  const handleRewind = useCallback(() => {
    engine.reset();
    setIsScrolling(false);
  }, [engine]);

  const handleSaveScript = useCallback((next: string) => {
    setScript(next);
    setEditorVisible(false);
  }, []);

  const handleCameraError = useCallback((message: string) => {
    Alert.alert('Erro na câmera', message);
  }, []);

  const clampFontSize = useCallback((next: number) => {
    setFontSize(
      Math.min(Math.max(next, typography.minFontSize), typography.maxFontSize)
    );
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraLayer
        ref={cameraRef}
        active={!editorVisible}
        onReady={() => {}}
        onError={handleCameraError}
      />

      <TeleprompterOverlay
        script={script}
        fontSize={fontSize}
        engine={engine}
        bandTop={bandTop}
        bandHeight={bandHeight}
        onContentHeightChange={setContentHeight}
      />

      {/* Área de toque sobre a banda: pausar e retomar sem procurar botão.
          O overlay em si é pointerEvents="none" para não capturar nada. */}
      <Pressable
        onPress={handleToggleScroll}
        style={[styles.tapTarget, { top: bandTop, height: bandHeight }]}
      />

      <Countdown value={countdown && countdown > 0 ? countdown : null} />

      <Controls
        bottomInset={insets.bottom}
        fontSize={fontSize}
        onFontSizeChange={clampFontSize}
        durationSec={durationSec}
        onDurationChange={setDurationSec}
        words={words}
        pace={pace}
        isRecording={recorder.status === 'recording'}
        isSaving={recorder.status === 'saving'}
        recordElapsedSec={recorder.elapsedSec}
        onToggleRecording={handleToggleRecording}
        isScrolling={isScrolling}
        onToggleScroll={handleToggleScroll}
        onRewind={handleRewind}
        onEditScript={() => setEditorVisible(true)}
      />

      <ScriptEditorModal
        visible={editorVisible}
        script={script}
        durationSec={durationSec}
        onSave={handleSaveScript}
        onCancel={() => setEditorVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tapTarget: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
