// İlana Başvuranlar (Open Applicants) — Plan 8 Phase E17, wired to live data.
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-matches.jsx
//   (`OpenApplicants`)
//
// Owner-only screen for one of the current user's open call requests.
// Lists every applicant with their name/note plus a "Kabul et" action
// that closes the listing and creates the match. The route param is the
// match-request id.
//
// Layout:
//   1. NavHeader with back, title="Başvuranlar",
//      subtitle derived from the match request's category/format.
//   2. Clay-softer info banner — "Birini kabul ettiğinde ilan kapanır…"
//   3. Applicant cards — avatar + name row, quoted note in a
//      surface-2 block, and Profil / Kabul et buttons.
//
// Live data:
//   - useMatchApplications(requestId) — applicant list (names embedded)
//   - useAcceptApplication() — accept one applicant (closes the listing)
//   - useMatchRequestDetail(requestId) — request metadata for subtitle

import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  useMatchApplications,
  useAcceptApplication,
} from '../../../hooks/use-match-applications';
import { useMatchRequestDetail } from '../../../hooks/use-match-request-detail';
import { colors } from '../../../theme/colors';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function OpenApplicants() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const applications = useMatchApplications(requestId);
  const requestDetail = useMatchRequestDetail(requestId);
  const acceptMutation = useAcceptApplication();

  const apps = applications.data ?? [];

  // Build subtitle from request detail
  const req = requestDetail.data;
  const subtitle = req
    ? [
        'İlanın',
        CATEGORY_LABELS[req.category] ?? req.category,
        req.court?.name ?? null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'İlanın';

  function handleAccept(applicantUserId: string, applicantName: string) {
    if (!requestId) return;
    Alert.alert(
      'Başvuruyu kabul et',
      `${applicantName} adlı oyuncuyu kabul etmek istiyor musun? İlan kapanacak ve maç oluşturulacak.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kabul et',
          style: 'default',
          onPress: () => {
            acceptMutation.mutate(
              { requestId, applicantUserId },
              {
                onSuccess: () => {
                  router.back();
                },
                onError: (err) => {
                  Alert.alert(
                    'Hata',
                    err instanceof Error ? err.message : 'Bir hata oluştu.',
                  );
                },
              },
            );
          },
        },
      ],
    );
  }

  const header = (
    <NavHeader
      title="Başvuranlar"
      subtitle={subtitle}
      onBack={() => router.back()}
    />
  );

  if (applications.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (applications.isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="bolt"
          title="Başvurular yüklenemedi"
          body="Bir hata oluştu. Lütfen tekrar dene."
          action="Tekrar dene"
          onAction={() => applications.refetch()}
        />
      </View>
    );
  }

  if (apps.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="handshake"
          title="Henüz başvuru yok"
          body="İlanına henüz kimse başvurmadı. Biraz bekle."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={applications.isRefetching}
            onRefresh={() => applications.refetch()}
            tintColor={colors.clay}
          />
        }
      >
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
            {apps.length} kişi başvurdu.
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          {apps.map((a) => {
            const fullName = `${a.applicant.first_name} ${a.applicant.last_name}`;
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
                  <Avatar name={fullName} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text
                      className="font-sans font-bold text-text"
                      style={{ fontSize: 15 }}
                    >
                      {fullName}
                    </Text>
                  </View>
                </View>
                {!!a.note && (
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
                )}
                <View className="flex-row" style={{ gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      full
                      onPress={() =>
                        router.push(
                          `/profile/${a.applicant_id}` as never,
                        )
                      }
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
                      onPress={() => handleAccept(a.applicant_id, fullName)}
                      disabled={acceptMutation.isPending}
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
