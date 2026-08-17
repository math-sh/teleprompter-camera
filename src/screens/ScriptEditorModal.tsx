import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { countWords, formatDuration, impliedWpm } from '../prompter/speed';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  script: string;
  durationSec: number;
  onSave: (next: string) => void;
  onCancel: () => void;
};

export function ScriptEditorModal({
  visible,
  script,
  durationSec,
  onSave,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(script);

  // Ressincroniza ao reabrir, para não mostrar um rascunho abandonado.
  useEffect(() => {
    if (visible) setDraft(script);
  }, [visible, script]);

  const words = countWords(draft);
  // A duração é fixa; o que muda enquanto você cola texto é o ritmo exigido.
  // Ver o ppm subir é o aviso de que o tempo escolhido ficou curto demais.
  const pace = impliedWpm(words, durationSec);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text style={styles.headerAction}>Cancelar</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Roteiro</Text>

          <Pressable onPress={() => onSave(draft)} hitSlop={12}>
            <Text style={[styles.headerAction, styles.headerActionPrimary]}>
              Salvar
            </Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoCapitalize="sentences"
          placeholder="Cole ou escreva o seu roteiro aqui."
          placeholderTextColor={colors.textFaint}
          textAlignVertical="top"
          selectionColor={colors.accent}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.footerText}>
            {words} {words === 1 ? 'palavra' : 'palavras'}
            {words > 0
              ? ` · sobe em ${formatDuration(durationSec)} · ~${Math.round(pace)} ppm`
              : ''}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.panelBorder,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  headerAction: {
    color: colors.textDim,
    fontSize: 16,
  },
  headerActionPrimary: {
    color: colors.accent,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    lineHeight: 25,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.panelBorder,
  },
  footerText: {
    color: colors.textFaint,
    fontSize: 13,
  },
});
