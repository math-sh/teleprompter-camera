import { CameraView } from 'expo-camera';
import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';

type Props = {
  /**
   * Desliga a sessão de captura quando a tela sai de foco. Manter a câmera
   * ativa em background aquece o aparelho à toa — e o XR já é o gargalo
   * térmico do projeto.
   */
  active: boolean;
  onReady: () => void;
  onError: (message: string) => void;
};

/**
 * O preview da câmera frontal, ocupando a tela inteira como fundo.
 *
 * Duas decisões travadas aqui, ambas com motivo:
 *
 * **`mode="video"` é fixo e nunca muda.** Alternar entre `picture` e `video`
 * em tempo de execução deixa o `recordAsync` permanentemente quebrado
 * ("Cannot record video at this time"). Este app não tira fotos, então o modo
 * é definido na montagem e esquecido.
 *
 * **`mirror={false}`** afeta apenas o arquivo gravado, não o preview. O
 * preview frontal é espelhado pelo AVFoundation dentro da
 * `AVCaptureVideoPreviewLayer` (via `automaticallyAdjustsVideoMirroring`), e
 * o expo-camera não toca nisso. O resultado é o que se quer: você se vê como
 * num espelho enquanto grava, e quem assiste te vê como no mundo real.
 */
export const CameraLayer = forwardRef<CameraView, Props>(function CameraLayer(
  { active, onReady, onError },
  ref
) {
  return (
    <CameraView
      ref={ref}
      style={StyleSheet.absoluteFill}
      facing="front"
      mode="video"
      mirror={false}
      videoQuality="1080p"
      videoStabilizationMode="auto"
      active={active}
      onCameraReady={onReady}
      onMountError={(event) => onError(event.message)}
    />
  );
});
