import type { CameraView } from 'expo-camera';
import { File } from 'expo-file-system';
import { Asset } from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Teto de segurança por tomada. Evita encher o disco num take esquecido. */
const MAX_DURATION_SEC = 600;

export type RecorderStatus = 'idle' | 'recording' | 'saving';

export type Recorder = {
  status: RecorderStatus;
  /** Segundos decorridos da tomada atual. */
  elapsedSec: number;
  error: string | null;
  start: () => void;
  stop: () => void;
  clearError: () => void;
};

/**
 * Gravação de vídeo e persistência na galeria.
 *
 * O ciclo de vida do `recordAsync` é contra-intuitivo: a promise não resolve
 * quando a gravação começa, e sim quando ela *termina* — depois de
 * `stopRecording()` ou de estourar `maxDuration`. É ela que entrega o URI do
 * arquivo no cache. Por isso `start()` dispara a promise sem aguardá-la e todo
 * o pós-processamento vive no `.then` dela.
 */
export function useRecorder(
  cameraRef: React.RefObject<CameraView | null>,
  onStopped?: () => void
): Recorder {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Guarda contra desmontar o componente no meio do salvamento.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cronômetro da tomada. 1Hz na JS thread — irrelevante perto do encoder,
  // e a rolagem não depende disto (ela vive na UI thread).
  useEffect(() => {
    if (status !== 'recording') return;

    setElapsedSec(0);
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    return () => clearInterval(id);
  }, [status]);

  const start = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) {
      setError('A câmera ainda não está pronta.');
      return;
    }

    setError(null);
    setStatus('recording');

    camera
      .recordAsync({ maxDuration: MAX_DURATION_SEC })
      .then(async (result) => {
        onStopped?.();

        if (!result?.uri) {
          if (mountedRef.current) setStatus('idle');
          return;
        }

        if (mountedRef.current) setStatus('saving');
        await persistToLibrary(result.uri);
        if (mountedRef.current) setStatus('idle');
      })
      .catch((cause: unknown) => {
        onStopped?.();
        if (!mountedRef.current) return;
        setError(
          cause instanceof Error ? cause.message : 'Falha ao gravar o vídeo.'
        );
        setStatus('idle');
      });
  }, [cameraRef, onStopped]);

  const stop = useCallback(() => {
    // Não muda o status aqui: quem fecha o ciclo é a promise do recordAsync,
    // que ainda precisa salvar o arquivo.
    cameraRef.current?.stopRecording();
  }, [cameraRef]);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({ status, elapsedSec, error, start, stop, clearError }),
    [status, elapsedSec, error, start, stop, clearError]
  );
}

/**
 * Move a gravação do cache para a galeria e limpa o original.
 *
 * `Asset.create` é o sucessor do `saveToLibraryAsync`, que desde o SDK 56
 * lança em tempo de execução quando importado da entrada principal do módulo.
 *
 * A troca não custa a permissão `writeOnly` pedida no App.tsx: o nativo de
 * `create` checa `checkIfWritePermissionGranted` — e não a variante de leitura
 * e escrita que `Asset.delete` exige. O `Asset` devolvido é descartado de
 * propósito; o app só precisa que o vídeo entre no rolo da câmera.
 */
async function persistToLibrary(uri: string): Promise<void> {
  await Asset.create(uri);

  // Best-effort: o vídeo já está salvo na galeria, então falhar em apagar o
  // arquivo de cache não é motivo para reportar erro ao usuário. O iOS limpa
  // o diretório de cache por conta própria sob pressão de disco.
  try {
    new File(uri).delete();
  } catch {
    // silêncio proposital
  }
}
