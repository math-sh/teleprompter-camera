import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PrompterScreen } from './src/screens/PrompterScreen';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <PermissionGate />
    </SafeAreaProvider>
  );
}

function PermissionGate() {
  const [camera, requestCamera] = useCameraPermissions();
  const [microphone, requestMicrophone] = useMicrophonePermissions();
  // `writeOnly` porque o app só adiciona vídeos à galeria — nunca lê o que já
  // está lá. É o pedido de permissão menos invasivo que resolve o problema.
  const [library, requestLibrary] = MediaLibrary.usePermissions({
    writeOnly: true,
  });

  const requestAll = useCallback(async () => {
    // Em sequência, não em paralelo: o iOS enfileira os diálogos de permissão
    // e disparar os três de uma vez faz alguns serem descartados sem resposta.
    if (!camera?.granted) await requestCamera();
    if (!microphone?.granted) await requestMicrophone();
    if (!library?.granted) await requestLibrary();
  }, [
    camera?.granted,
    microphone?.granted,
    library?.granted,
    requestCamera,
    requestMicrophone,
    requestLibrary,
  ]);

  // `null` significa que o estado ainda está sendo lido do sistema.
  if (camera === null || microphone === null || library === null) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.textDim} />
      </View>
    );
  }

  const missing = [
    !camera.granted && 'câmera',
    !microphone.granted && 'microfone',
    !library.granted && 'galeria',
  ].filter(Boolean) as string[];

  if (missing.length === 0) {
    return <PrompterScreen />;
  }

  const blocked = [camera, microphone, library].some(
    (permission) => !permission.granted && !permission.canAskAgain
  );

  return (
    <View style={styles.center}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>Quase lá</Text>
        <Text style={styles.body}>
          O Teleprompter precisa de acesso a {formatList(missing)} para gravar
          seus vídeos e salvá-los.
        </Text>

        {blocked ? (
          <Text style={styles.hint}>
            Alguma permissão foi negada anteriormente. Abra Ajustes › Expo Go e
            libere o acesso.
          </Text>
        ) : (
          <Pressable
            onPress={requestAll}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Permitir acesso</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.screen,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  body: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 23,
  },
  hint: {
    color: colors.textFaint,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  button: {
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
