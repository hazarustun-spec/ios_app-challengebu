// Onboarding · Bölüm (D9) — sheet picker + show toggle
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObDept

import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { Field } from '../../components/ui/Field';
import { Sheet } from '../../components/ui/Sheet';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { useOnboardingStore } from '../../stores/onboarding-store';
import {
  useDepartments,
  type Department,
  type ProgramLevel,
} from '../../hooks/use-departments';
import { colors } from '../../theme/colors';

export default function ObDepartment() {
  const classYear = useOnboardingStore((s) => s.classYear);
  const departmentId = useOnboardingStore((s) => s.departmentId);
  const departmentName = useOnboardingStore((s) => s.departmentName);
  const showDepartment = useOnboardingStore((s) => s.showDepartment);
  const setField = useOnboardingStore((s) => s.setField);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const programLevel: ProgramLevel | undefined =
    classYear == null || classYear === 'mezun'
      ? undefined
      : classYear === 'yl' || classYear === 'doktora'
        ? 'lisansustu'
        : 'lisans';

  const { data: deps } = useDepartments(programLevel);

  // Group + search
  const sections = useMemo(() => {
    const filtered = (deps ?? []).filter((d) =>
      d.name.toLowerCase().includes(q.toLowerCase()),
    );
    const byFaculty = new Map<string, Department[]>();
    for (const d of filtered) {
      const key = d.faculty ?? 'Diğer';
      if (!byFaculty.has(key)) byFaculty.set(key, []);
      byFaculty.get(key)!.push(d);
    }
    return Array.from(byFaculty.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [deps, q]);

  return (
    <OBFrame
      step="department"
      title="Bölümün"
      subtitle={
        programLevel === 'lisansustu'
          ? 'Lisansüstü program listesinden seç.'
          : 'Lisans bölüm listesinden seç.'
      }
      canNext={!!departmentId}
      onNext={() => router.push('/(onboarding)/level')}
    >
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Bölüm seç"
        style={{
          width: '100%',
          height: 58,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: colors.borderStrong,
          backgroundColor: colors.surface,
        }}
      >
        <Icon name="list" size={20} color={colors.text3} />
        <Text
          className="font-sans"
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: departmentName ? '600' : '500',
            color: departmentName ? colors.text : colors.text3,
          }}
          numberOfLines={1}
        >
          {departmentName || 'Bölüm seç'}
        </Text>
        <Icon name="chevD" size={20} color={colors.text3} />
      </Pressable>

      <Pressable
        onPress={() => setField('showDepartment', !showDepartment)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginTop: 18,
          paddingVertical: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 14.5 }}
          >
            Profilimde göster
          </Text>
          <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
            Diğer oyuncular bölümünü görebilir
          </Text>
        </View>
        <Toggle
          value={showDepartment}
          onChange={(v) => setField('showDepartment', v)}
        />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Bölüm seç">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ height: 520 }}
        >
          <Field
            icon="search"
            placeholder="Bölüm ara…"
            value={q}
            onChange={setQ}
          />
          <SectionList
            style={{ marginTop: 12, flex: 1 }}
            sections={sections}
            keyExtractor={(d) => d.id}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={25}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text
                className="font-sans font-extrabold text-text-3"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  paddingTop: 16,
                  paddingBottom: 6,
                  paddingHorizontal: 6,
                  backgroundColor: colors.surface,
                }}
              >
                {section.title}
              </Text>
            )}
            renderItem={({ item: d }) => (
              <Pressable
                onPress={() => {
                  setField('departmentId', d.id);
                  setField('departmentName', d.name);
                  setOpen(false);
                  setQ('');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 6,
                  borderBottomWidth: 1,
                  borderColor: colors.surface3,
                }}
              >
                <Text
                  className="font-sans font-semibold text-text"
                  style={{ fontSize: 15, flex: 1 }}
                >
                  {d.name}
                </Text>
                {departmentId === d.id && (
                  <Icon name="check" size={18} color={colors.clay} stroke={3} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                className="font-sans text-text-3"
                style={{
                  fontSize: 13,
                  textAlign: 'center',
                  paddingVertical: 24,
                }}
              >
                {deps === undefined ? 'Yükleniyor…' : 'Eşleşen bölüm yok'}
              </Text>
            }
          />
        </KeyboardAvoidingView>
      </Sheet>
    </OBFrame>
  );
}
