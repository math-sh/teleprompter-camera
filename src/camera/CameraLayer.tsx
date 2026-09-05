import { CameraView, type CameraType } from 'expo-camera';
import { forwardRef } from 'react';
import { StyleSheet } from 'react-native';

type Props = {
  /**
   * Desliga a sessão de captura quando a tela sai de foco. Manter a câmera
   * ativa em background aquece o aparelho à toa — e o XR já é o gargalo
   * térmico do projeto.
   *
   * Só vale no iOS: o módulo Android não implementa esta prop e a ignora em
   * silêncio, então lá a sessão continua rodando com o editor aberto.
   */
  active: boolean;
  /** Qual câmera alimenta o preview e a gravação. */
  facing: CameraType;
  onReady: () => void;
  onError: (message: string) => void;
};

/**
 * O preview da câmera, ocupando a tela inteira como fundo.
 *
 * Três decisões travadas aqui, todas com motivo:
 *
 * **`mode="video"` é fixo e nunca muda.** Alternar entre `picture` e `video`
 * em tempo de execução deixa o `recordAsync` permanentemente quebrado
 * ("Cannot record video at this time"). Este app não tira fotos, então o modo
 * é definido na montagem e esquecido.
 *
 * **`mirror={false}`** afeta apenas o arquivo gravado, não o preview, e só tem
 * efeito na câmera frontal. O preview frontal é espelhado pelo AVFoundation
 * dentro da `AVCaptureVideoPreviewLayer` (via
 * `automaticallyAdjustsVideoMirroring`), e o expo-camera não toca nisso. O
 * resultado é o que se quer: você se vê como num espelho enquanto grava, e
 * quem assiste te vê como no mundo real. Na traseira nada disso se aplica —
 * ela nunca espelha, nem no preview nem no arquivo.
 *
 * **`facing` não pode mudar durante uma gravação.** Trocar a câmera obriga o
 * nativo a remover e readicionar o input da sessão de captura
 * (`CameraSessionManager.addDevice`, entre `beginConfiguration` e
 * `commitConfiguration`), e reconfigurar uma `AVCaptureSession` com o
 * `AVCaptureMovieFileOutput` gravando encerra o arquivo ali mesmo. No Android
 * é pior: o CameraX refaz o `bindToLifecycle` e a gravação pode falhar de vez.
 * Quem garante isso é o `canToggleFacing` da tela, que desabilita o botão
 * enquanto há tomada em andamento.
 */
export const CameraLayer = forwardRef<CameraView, Props>(function CameraLayer(
  { active, facing, onReady, onError },
  ref
) {
  return (
    <CameraView
      ref={ref}
      style={StyleSheet.absoluteFill}
      facing={facing}
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
