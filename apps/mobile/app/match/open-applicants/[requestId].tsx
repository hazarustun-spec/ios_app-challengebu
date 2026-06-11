// İlana Başvuranlar (Open Applicants) — Plan 8 Phase E17.
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-matches.jsx
//   (`OpenApplicants`)
//
// Owner-only screen for one of the current user's open call requests.
// Lists every applicant with their name/ELO/note plus a "Kabul et" action
// that closes the listing and creates the match. The route param is the
// match-request id (or "my-listing" placeholder until the polish pass
// wires the real hook).
//
// Layout:
//   1. NavHeader with back, title="Başvuranlar",
//      subtitle="İlanın · Erkek Tek · BÜ Klasik"
//   2. Clay-softer info banner — "Birini kabul ettiğinde ilan kapanır…"
//   3. Applicant cards — avatar + name + ELO·level row, quoted note in a
//      surface-2 block, and Profil / Kabul et buttons.
//
// Data wiring is intentionally STUBBED in this batch — Plan 8 Phase E17
// is a visual port. The polish pass will swap `MOCK_APPS` for a real
// `useMatchApplications(requestId)` query.

import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { levelForElo } from '../../../lib/levels';
import { colors } from '../../../theme/colors';

// TODO(plan-8-E-polish): wire `useMatchApplications(requestId)`.
const MOCK_APPS: Array<{
  id: string;
  name: string;
  elo: number;
  note: string;
}> = [
  {
    id: 'a1',
    name: 'Mert Şahin',
    elo: 1655,
    note: 'Yarın akşam müsaitim, Kort 1 olur.',
  },
  {
    id: 'a2',
    name: 'Onur Çelik',
    elo: 1432,
    note: 'Bu hafta sonu sabah?',
  },
  {
    id: 'a3',
    name: 'Eren Doğan',
    elo: 1320,
    note: 'Her zaman varım 🎾',
  },
];

export default function OpenApplicants() {
  // `requestId` is consumed by the polish pass to scope the query; the
  // visual port simply renders the mocked applicants regardless of id.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { requestId: _requestId } = useLocalSearchParams<{
    requestId: string;
  }>();

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Başvuranlar"
        subtitle="İlanın · Erkek Tek · BÜ Klasik"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View
          className="flex-row bg-clay-softer rounded-md"
          style={{
            padding: 14,
            gap: 10,
            borderWidth: 1,
            borderColor: colors.claySoft,
          }}
        >
          <Icon name="info" size={18} color={colors.clay} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 13, lineHeight: 19 }}
          >
            Birini kabul ettiğinde ilan kapanır ve maç oluşturulur.{' '}
            {MOCK_APPS.length} kişi başvurdu.
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          {MOCK_APPS.map((a) => {
            const lv = levelForElo(a.elo);
            return (
              <View
                key={a.id}
                className="bg-surface rounded-lg border-base border-border-strong"
                style={{ padding: 14 }}
              >
                <View
                  className="flex-row items-center"
                  style={{ gap: 12, marginBottom: 10 }}
                >
                  <Avatar name={a.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text
                      className="font-sans font-bold text-text"
                      style={{ fontSize: 15 }}
                    >
                      {a.name}
                    </Text>
                    <Text
                      className="font-num font-bold"
                      style={{
                        fontSize: 13,
                        color: lv.color,
                        marginTop: 1,
                      }}
                    >
                      {a.elo} · {lv.name}
                    </Text>
                  </View>
                </View>
                <View
                  className="bg-surface-2 rounded-sm"
                  style={{
                    padding: 10,
                    paddingHorizontal: 12,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    className="font-sans text-text-2"
                    style={{ fontSize: 13.5, lineHeight: 19 }}
                  >
                    "{a.note}"
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      full
                      onPress={() => {}}
                    >
                      Profil
                    </Button>
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Button
                      size="sm"
                      full
                      icon={
                        <Icon
                          name="check"
                          size={15}
                          color={colors.onLime}
                          stroke={3}
                        />
                      }
                      onPress={() => router.back()}
                    >
                      Kabul et
                    </Button>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
