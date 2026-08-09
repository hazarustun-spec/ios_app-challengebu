// Admin · Bracket Düzenle — Plan 8 Phase G (screen 52 in screens-admin.jsx).
//
// Category filter chips along the top → singles tournaments expose the seed
// reorder UI (up/down buttons, save via `admin_reorder_bracket_seeds`);
// doubles tournaments fall back to the existing "void match" admin actions.
//
// Hooks preserved:
//   - `useAdminTournaments` for the category list
//   - `useTournamentBracket` for the rendered slots + bracket size
//   - `useVoidBracketMatch` for the void admin action (doubles only here)
//
// Hooks added (Plan 8 Phase A4 / G):
//   - `useBracketSeeds` reads the raw [rank, profile_id, name] standings
//   - `useReorderBracket` wraps the `admin_reorder_bracket_seeds` RPC

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Banner } from '../../components/ui/Banner';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { useAdminTournaments, useVoidBracketMatch } from '../../hooks/use-admin-tournaments';
import { useTournamentBracket } from '../../hooks/use-tournament-bracket';
import { useBracketSeeds, type BracketSeedEntry } from '../../hooks/use-bracket-seeds';
import { useReorderBracket } from '../../hooks/use-reorder-bracket';
import { colors } from '../../theme/colors';
import { userMessage } from '../../lib/user-message';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

const DOUBLES = (cat: string) => cat.endsWith('_cift');

export default function AdminTournamentsScreen() {
  const list = useAdminTournaments();
  const [activeId, setActiveId] = useState<string | null>(null);
  const selected = activeId ?? list.data?.[0]?.id ?? null;
  const bracket = useTournamentBracket(selected ?? undefined);
  const voidMatch = useVoidBracketMatch();
  const reorder = useReorderBracket();

  const isDoubles = bracket.data ? DOUBLES(bracket.data.category) : false;
  const seedsQuery = useBracketSeeds({
    seasonId: bracket.data?.season_id,
    category: bracket.data?.category,
    bracketSize: bracket.data?.bracket_size ?? 8,
  });

  // Local draft order — only used for singles. Sync from the source whenever
  // a new tournament becomes selected or the standings refetch.
  const [draft, setDraft] = useState<BracketSeedEntry[]>([]);
  useEffect(() => {
    if (seedsQuery.data) setDraft(seedsQuery.data);
  }, [seedsQuery.data]);

  const dirty = useMemo(() => {
    if (!seedsQuery.data) return false;
    if (draft.length !== seedsQuery.data.length) return false;
    return draft.some((d, i) => d.profile_id !== seedsQuery.data?.[i]?.profile_id);
  }, [draft, seedsQuery.data]);

  const handleSave = () => {
    if (!selected || draft.length !== 8) return;
    reorder.mutate(
      {
        tournamentId: selected,
        seedPlayerIds: draft.map((d) => d.profile_id),
      },
      {
        onSuccess: () => Alert.alert('Kaydedildi', 'Bracket sırası güncellendi.'),
        onError: (e) => Alert.alert('Hata', userMessage(e, 'Kaydedilemedi')),
      },
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(target, 0, moved);
    setDraft(next);
  };

  const handleVoid = (matchId: string | null) => {
    if (!matchId) return;
    Alert.alert(
      'Maçı geçersiz say',
      'Bu turnuva maçı geçersiz sayılacak ve bir sonraki tura geçiş duracak. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geçersiz say',
          style: 'destructive',
          onPress: () =>
            voidMatch.mutate(
              { matchId, reason: 'Turnuva maçı yönetici tarafından geçersiz sayıldı' },
              {
                onError: (e) => Alert.alert('Hata', userMessage(e, 'Maç geçersiz sayılamadı.')),
              },
            ),
        },
      ],
    );
  };

  const tournaments = list.data ?? [];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Bracket Düzenle"
        subtitle={
          bracket.data
            ? `${CATEGORY_LABELS[bracket.data.category] ?? bracket.data.category} · Top ${bracket.data.bracket_size} seed`
            : undefined
        }
        onBack={() => router.back()}
        action={!isDoubles && dirty ? 'Kaydet' : undefined}
        onAction={handleSave}
      />

      {/* Category chips */}
      {tournaments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 }}
        >
          {tournaments.map((t) => {
            const isActive = t.id === selected;
            return (
              <Pressable
                key={t.id}
                onPress={() => setActiveId(t.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: isActive ? colors.text : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                }}
              >
                <Text
                  className="font-sans font-bold"
                  style={{
                    fontSize: 12.5,
                    color: isActive ? colors.bg : colors.text,
                  }}
                >
                  {CATEGORY_LABELS[t.category] ?? t.category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}>
        {list.isLoading ? (
          <Loading />
        ) : tournaments.length === 0 ? (
          <Empty msg="Aktif turnuva yok." />
        ) : !bracket.data ? (
          <Loading />
        ) : isDoubles ? (
          <DoublesAdmin slots={bracket.data.slots} onVoid={handleVoid} />
        ) : (
          <SinglesReorder draft={draft} onMove={move} saving={reorder.isPending} />
        )}
      </ScrollView>
    </View>
  );
}

function SinglesReorder({
  draft,
  onMove,
  saving,
}: {
  draft: BracketSeedEntry[];
  onMove: (index: number, direction: -1 | 1) => void;
  saving: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Banner
        tone="info"
        title="Seed sırası"
        body="Sezon sonu ELO'ya göre otomatik. Yukarı/aşağı oklarla elle düzenleyebilirsin."
      />
      <View style={{ gap: 8 }}>
        {draft.map((p, i) => (
          <View
            key={p.profile_id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              borderRadius: 14,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                backgroundColor: colors.claySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 12.5, color: colors.clayText }}
              >
                {i + 1}
              </Text>
            </View>
            <Avatar name={`${p.first_name} ${p.last_name}`} size={36} />
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 14 }}
                numberOfLines={1}
              >
                {p.first_name} {p.last_name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable
                onPress={() => onMove(i, -1)}
                disabled={i === 0 || saving}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: i === 0 ? colors.surface3 : colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: i === 0 ? 0.5 : 1,
                }}
              >
                <Icon name="arrowUp" size={16} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => onMove(i, 1)}
                disabled={i === draft.length - 1 || saving}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: i === draft.length - 1 ? colors.surface3 : colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: i === draft.length - 1 ? 0.5 : 1,
                }}
              >
                <Icon name="arrowDn" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DoublesAdmin({
  slots,
  onVoid,
}: {
  slots: Array<{
    id: string;
    round: number;
    bracket_position: number;
    match_id: string | null;
    match_status: string | null;
    player_a_name: string | null;
    player_b_name: string | null;
  }>;
  onVoid: (matchId: string | null) => void;
}) {
  const targets = slots.filter((s) => s.match_id !== null && s.match_status !== 'voided');
  return (
    <View style={{ gap: 12 }}>
      <Banner
        tone="warning"
        title="Çift bracket reorder desteklenmiyor"
        body="Çift kategorilerde seed sıralaması arayüzü hazır değil. Yalnızca void aksiyonu kullanılabilir."
      />
      {targets.length === 0 ? (
        <Empty msg="Voidlenebilir maç yok." />
      ) : (
        targets.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onVoid(s.match_id)}
            style={{
              padding: 14,
              backgroundColor: '#FCE6E4',
              borderWidth: 1,
              borderColor: colors.loss,
              borderRadius: 14,
            }}
          >
            <Text className="font-sans font-bold" style={{ fontSize: 13, color: colors.loss }}>
              Tur {s.round} · poz {s.bracket_position}
            </Text>
            <Text className="font-sans text-text" style={{ fontSize: 12, marginTop: 2 }}>
              {s.player_a_name ?? '—'} vs {s.player_b_name ?? '—'}
            </Text>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 11, color: colors.loss, marginTop: 6 }}
            >
              VOIDED YAP
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

function Loading() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
      <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
        Yükleniyor…
      </Text>
    </View>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
      <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
        {msg}
      </Text>
    </View>
  );
}
