// Settings → Geri bildirim — free-text feedback form (#0).
//
// Coarse category chip (Hata / Öneri / Genel) + a multiline note. Submits via
// useSubmitFeedback into public.feedback, then thanks the user and pops back.

import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import {
  useSubmitFeedback,
  type FeedbackCategory,
} from '../../hooks/use-submit-feedback';
import { colors } from '../../theme/colors';

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Hata' },
  { value: 'idea', label: 'Öneri' },
  { value: 'general', label: 'Genel' },
];

const MAX = 2000;

export default function FeedbackScreen() {
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [body, setBody] = useState('');
  const submit = useSubmitFeedback();

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && !submit.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submit.mutate(
      { category, body: trimmed },
      {
        onSuccess: () => {
          Alert.alert(
            'Teşekkürler! 🎾',
            'Geri bildirimin bize ulaştı. Her mesajı okuyoruz.',
            [{ text: 'Tamam', onPress: () => router.back() }],
          );
        },
        onError: (err) => {
          Alert.alert(
            'Gönderilemedi',
            err instanceof Error ? err.message : 'Bir sorun oluştu.',
          );
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Geri bildirim" onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 14.5, lineHeight: 22 }}
          >
            Bir hata mı buldun, bir fikrin mi var? Yaz — hepsini okuyoruz.
          </Text>

          {/* Category chips */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CATEGORIES.map((c) => {
              const active = c.value === category;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 9999,
                    backgroundColor: active ? colors.lime : colors.surface2,
                    borderWidth: 1,
                    borderColor: active ? colors.lime : colors.borderStrong,
                  }}
                >
                  <Text
                    className="font-sans font-bold"
                    style={{
                      fontSize: 13.5,
                      color: active ? colors.onLime : colors.text2,
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Note */}
          <View style={{ gap: 6 }}>
            <TextInput
              value={body}
              onChangeText={(t) => setBody(t.slice(0, MAX))}
              placeholder="Mesajını buraya yaz…"
              placeholderTextColor={colors.text3}
              multiline
              textAlignVertical="top"
              className="font-sans text-text"
              style={{
                minHeight: 160,
                fontSize: 15,
                lineHeight: 22,
                padding: 14,
                borderRadius: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderStrong,
              }}
            />
            <Text
              className="font-num text-text-3"
              style={{ fontSize: 11.5, textAlign: 'right' }}
            >
              {trimmed.length}/{MAX}
            </Text>
          </View>
        </ScrollView>

        <View style={{ padding: 20, paddingTop: 8 }}>
          <Button
            full
            size="lg"
            disabled={!canSubmit}
            loading={submit.isPending}
            onPress={handleSubmit}
          >
            {submit.isPending ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
