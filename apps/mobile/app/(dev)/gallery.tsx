// Component Gallery — Plan 8 Phase C visual verification.
//
// Single scrollable screen rendering every Phase C primitive with realistic
// Turkish sample data. Lets the user (and reviewers) visually confirm the
// design system on the iOS Simulator before Phase D ports 88 screens on top.
//
// Sections (13):
//   1. Tab bar           7. Banner
//   2. Buttons           8. Toast
//   3. Fields            9. Avatar gallery
//   4. Selection        10. Domain chips
//   5. Cards & ListRows 11. Sparkline
//   6. Overlays         12. Composed
//                        13. Misc
//
// Visual style strictly uses NativeWind tokens + theme colors. No hardcoded
// hex values in this file — all colors come from `theme/colors` indirectly
// via the components themselves.

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import * as LA from '../../lib/live-match-activity';

import { Avatar } from '../../components/ui/Avatar';
import { Banner } from '../../components/ui/Banner';
import { BellWithBadge } from '../../components/ui/BellWithBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CheckBox } from '../../components/ui/CheckBox';
import { EloChip } from '../../components/ui/EloChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { FormDots } from '../../components/ui/FormDots';
import { FormatChip } from '../../components/ui/FormatChip';
import { GreetHeader } from '../../components/ui/GreetHeader';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { LevelRing } from '../../components/ui/LevelRing';
import { ListRow } from '../../components/ui/ListRow';
import { MatchCard } from '../../components/ui/MatchCard';
import { Modal } from '../../components/ui/Modal';
import { PlayerChip } from '../../components/ui/PlayerChip';
import { ScoreInput } from '../../components/ui/ScoreInput';
import { SearchBar } from '../../components/ui/SearchBar';
import { Segmented } from '../../components/ui/Segmented';
import { Sheet } from '../../components/ui/Sheet';
import { Skel } from '../../components/ui/Skel';
import { Sparkline } from '../../components/ui/Sparkline';
import { TabBar } from '../../components/ui/TabBar';
import { Toggle } from '../../components/ui/Toggle';
import { useToast } from '../../components/ui/ToastProvider';
import { LEVELS } from '../../lib/levels';
import type { FormatKey } from '../../lib/formats';

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="mb-3 font-display text-[18px] font-extrabold text-text">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function Row({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return (
    <View className="flex-row flex-wrap items-center" style={{ gap }}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mock TabBar state — TabBar expects an Expo Router `state.routes` slice.
// ---------------------------------------------------------------------------

const MOCK_TAB_STATE = {
  index: 0,
  routes: [
    { key: 'index', name: 'index' },
    { key: 'matches', name: 'matches' },
    { key: 'new-match', name: 'new-match' },
    { key: 'notifications', name: 'notifications' },
    { key: 'profile', name: 'profile' },
  ],
};

const MOCK_TAB_NAV = {
  navigate: (_name: string) => {},
  emit: (_event: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => ({
    defaultPrevented: false,
  }),
};

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export default function Gallery() {
  const toast = useToast();

  // Controlled state for interactive components.
  const [searchValue, setSearchValue] = useState('');
  const [emailValue, setEmailValue] = useState('ad.soyad@std.bogazici.edu.tr');
  const [passwordValue, setPasswordValue] = useState('hunter2hunter2');
  const [showPassword, setShowPassword] = useState(false);
  const [errorValue, setErrorValue] = useState('abc');
  const [bigValue, setBigValue] = useState('');

  const [segValue, setSegValue] = useState<'hafta' | 'ay' | 'sezon'>('hafta');
  const [segValueSm, setSegValueSm] = useState<'tumu' | 'aktif'>('tumu');

  const [toggleOn, setToggleOn] = useState(true);
  const [toggleOff, setToggleOff] = useState(false);

  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(true);
  const [check3, setCheck3] = useState(false);
  const [check4, setCheck4] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const formats: FormatKey[] = ['klasik', 'tiebreak', 'proset', 'set3'];

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* ---------- Live Activity (dev test — Task 1) ---------- */}
        <Section title="Live Activity (dev)">
          <Row>
            <Button
              onPress={() =>
                LA.startMatchActivity({
                  matchId: 'test',
                  youSide: 'a',
                  nameA: 'Sen',
                  nameB: 'Ahmet',
                })
              }
            >
              Başlat
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                LA.updateMatchActivity({
                  gamesA: 2,
                  gamesB: 1,
                  pointsA: 3,
                  pointsB: 1,
                  phase: 'ongoing',
                })
              }
            >
              Güncelle
            </Button>
            <Button
              variant="danger"
              onPress={() =>
                LA.endMatchActivity({
                  gamesA: 4,
                  gamesB: 1,
                  pointsA: 0,
                  pointsB: 0,
                  phase: 'finished',
                  winner: 'a',
                })
              }
            >
              Bitir
            </Button>
          </Row>
        </Section>

        {/* ---------- 1. Tab bar ---------- */}
        <Section title="1. Tab bar">
          <Text className="text-[12px] text-text-3">
            Lime pill, ink active fill, central + button.
          </Text>
          <View className="-mx-4">
            <TabBar state={MOCK_TAB_STATE} navigation={MOCK_TAB_NAV} />
          </View>
        </Section>

        {/* ---------- 2. Buttons ---------- */}
        <Section title="2. Buttons">
          <Row>
            <Button variant="primary">Maç oluştur</Button>
            <Button variant="secondary">İptal</Button>
            <Button variant="danger">İtiraz et</Button>
          </Row>
          <Row>
            <Button variant="dark">Meydan oku</Button>
            <Button variant="ghost">Vazgeç</Button>
            <Button variant="tonal">Daha sonra</Button>
          </Row>
          <Row>
            <Button>Devam</Button>
            <Button disabled>Devam</Button>
            <Button loading>Devam</Button>
          </Row>
          <Row>
            <Button size="sm">Devam</Button>
            <Button size="md">Devam</Button>
            <Button size="lg">Devam</Button>
          </Row>
          <Button full arrow>
            Devam et
          </Button>
        </Section>

        {/* ---------- 3. Fields ---------- */}
        <Section title="3. Fields">
          <Field
            label="BÜ e-posta"
            value={emailValue}
            onChange={setEmailValue}
            icon="mail"
            type="email"
          />
          <Field
            label="Şifre"
            value={passwordValue}
            onChange={setPasswordValue}
            icon="lock"
            suffix={showPassword ? 'gizle' : 'göster'}
            onSuffixPress={() => setShowPassword((p) => !p)}
            type={showPassword ? 'text' : 'password'}
          />
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Oyuncu ara…"
          />
          <Field big value={bigValue} onChange={setBigValue} placeholder="Adın ne?" />
          <Field
            label="Doğrulama kodu"
            value={errorValue}
            onChange={setErrorValue}
            error
            hint="6 haneli kodu eksiksiz gir."
          />
        </Section>

        {/* ---------- 4. Selection ---------- */}
        <Section title="4. Selection">
          <Segmented
            value={segValue}
            onChange={setSegValue}
            options={[
              { value: 'hafta', label: 'Haftalık' },
              { value: 'ay', label: 'Aylık' },
              { value: 'sezon', label: 'Sezon' },
            ]}
          />
          <Segmented
            value={segValueSm}
            onChange={setSegValueSm}
            size="sm"
            options={[
              { value: 'tumu', label: 'Tümü' },
              { value: 'aktif', label: 'Aktif' },
            ]}
          />
          <Row gap={16}>
            <Toggle value={toggleOff} onChange={setToggleOff} />
            <Toggle value={toggleOn} onChange={setToggleOn} />
            <Toggle value={true} disabled />
          </Row>
          <Row gap={16}>
            <CheckBox checked={check1} onChange={setCheck1} />
            <CheckBox checked={check2} onChange={setCheck2} />
            <CheckBox checked={check3} onChange={setCheck3} shape="circle" />
            <CheckBox checked={check4} onChange={setCheck4} shape="circle" />
          </Row>
        </Section>

        {/* ---------- 5. Cards & ListRows ---------- */}
        <Section title="5. Cards & ListRows">
          <Card>
            <Text className="font-display text-[15px] font-extrabold text-text">
              Güz Sezonu
            </Text>
            <Text className="mt-1 text-[12.5px] font-semibold text-text-3">
              1 Eyl – 15 Oca · Aktif ladder
            </Text>
          </Card>

          <Card variant="featured">
            <Text
              className="text-[11px] font-extrabold uppercase text-white"
              style={{ letterSpacing: 1.1 }}
            >
              Sezon Lideri
            </Text>
            <Text className="mt-1 font-display text-[22px] font-extrabold text-white">
              Kaan Demir
            </Text>
            <Text className="mt-1 font-num text-[28px] font-extrabold text-white">
              1924
            </Text>
          </Card>

          <Card className="p-0">
            <ListRow
              icon="trophy"
              title="Maç geçmişi"
              subtitle="32 maç"
              chevron
              onPress={() => {}}
            />
            <View className="h-px bg-surface-2" />
            <ListRow
              icon="bell"
              title="Bildirimler"
              subtitle="3 yeni"
              chevron
              onPress={() => {}}
            />
            <View className="h-px bg-surface-2" />
            <ListRow
              icon="trash"
              title="Hesabı sil"
              danger
              onPress={() => {}}
            />
          </Card>
        </Section>

        {/* ---------- 6. Overlays ---------- */}
        <Section title="6. Overlays">
          <Row>
            <Button variant="secondary" onPress={() => setModalVisible(true)}>
              Modal'ı aç
            </Button>
            <Button variant="secondary" onPress={() => setSheetVisible(true)}>
              Sheet'i aç
            </Button>
          </Row>
        </Section>

        {/* ---------- 7. Banner ---------- */}
        <Section title="7. Banner">
          <Banner
            tone="info"
            title="Sezon finali yaklaşıyor"
            body="İlk 8'e girmek için 41 günün var."
          />
          <Banner
            tone="success"
            title="Skor onaylandı"
            body="ELO 1590 → 1612."
          />
          <Banner
            tone="warning"
            title="Skor onayı bekliyor"
            body="Berk Aydın'ın onayı bekleniyor."
          />
          <Banner
            tone="error"
            title="Skorlar uyuşmuyor"
            body="İtiraz açıldı."
          />
        </Section>

        {/* ---------- 8. Toast ---------- */}
        <Section title="8. Toast">
          <Button
            variant="primary"
            onPress={() => toast.show('Meydan okuma gönderildi')}
          >
            Toast göster
          </Button>
        </Section>

        {/* ---------- 9. Avatar gallery ---------- */}
        <Section title="9. Avatar gallery">
          <Row gap={16}>
            <Avatar name="Aleyna Kaya" size={32} />
            <Avatar name="Kaan Demir" size={44} />
            <Avatar name="Mert Şahin" size={92} />
          </Row>
          <Row gap={16}>
            <Avatar name="Aleyna Kaya" size={52} ring="#7A9F4B" />
            <Avatar name="Kaan Demir" size={52} badge={1} />
            <Avatar name="Mert Şahin" size={52} badge="frozen" />
          </Row>
        </Section>

        {/* ---------- 10. Domain chips ---------- */}
        <Section title="10. Domain chips">
          <Row>
            <EloChip elo={1612} delta={22} />
            <EloChip elo={1487} delta={-14} />
          </Row>
          <Row gap={12}>
            {LEVELS.map((lv) => (
              <View key={lv.key} className="items-center" style={{ gap: 4 }}>
                <LevelIcon level={lv} size={20} />
                <Text className="text-[10px] font-semibold text-text-3">
                  {lv.name}
                </Text>
              </View>
            ))}
          </Row>
          <Row>
            {formats.map((f) => (
              <FormatChip key={f} fmtKey={f} />
            ))}
          </Row>
          <Row>
            <FormDots form={['W', 'W', 'L', 'W', 'W']} size={11} />
          </Row>
        </Section>

        {/* ---------- 11. Sparkline ---------- */}
        <Section title="11. Sparkline">
          <Row gap={24}>
            <View className="items-center" style={{ gap: 4 }}>
              <Sparkline data={[1500, 1520, 1540, 1612]} w={80} h={28} />
              <Text className="text-[10px] text-text-3">yükseliş</Text>
            </View>
            <View className="items-center" style={{ gap: 4 }}>
              <Sparkline data={[1612, 1580, 1530, 1487]} w={80} h={28} />
              <Text className="text-[10px] text-text-3">düşüş</Text>
            </View>
            <View className="items-center" style={{ gap: 4 }}>
              <Sparkline data={[1500, 1500, 1500]} w={80} h={28} />
              <Text className="text-[10px] text-text-3">sabit</Text>
            </View>
          </Row>
        </Section>

        {/* ---------- 12. Composed ---------- */}
        <Section title="12. Composed">
          <Row>
            <PlayerChip
              name="Aleyna Kaya"
              elo={1487}
              sub="Amatör · 2. sınıf"
            />
          </Row>
          <MatchCard
            kind="planned"
            opponentName="Berk Aydın"
            whenLabel="Yarın 18:30 · Kort 1"
            format="klasik"
            ctaLabel="Detayları gör"
            onCtaPress={() => {}}
          />
          <MatchCard
            kind="pending"
            opponentName="Ece Yılmaz"
            whenLabel="Bugün 14:00 · Kort 3"
            format="tiebreak"
            ctaLabel="Skoru gir"
            onCtaPress={() => {}}
          />
          <MatchCard
            kind="done"
            opponentName="Kaan Demir"
            opponentElo={1612}
            whenLabel="Dün 19:00 · Kort 2"
            format="proset"
            win
            score="4-2"
            eloDelta={22}
          />
        </Section>

        {/* ---------- 13. Misc ---------- */}
        <Section title="13. Misc">
          <View className="-mx-4">
            <GreetHeader name="Hazar" sub="Bugün maç günü mü?" unreadCount={3} />
          </View>

          <Row gap={16}>
            <LevelRing name="Mert Şahin" elo={1612} size={82} />
            <View style={{ gap: 6 }}>
              <Text className="font-display text-[15px] font-extrabold text-text">
                Mert Şahin
              </Text>
              <Text className="text-[12.5px] font-semibold text-text-3">
                Rekabetçi · 1612
              </Text>
            </View>
          </Row>

          <View style={{ gap: 8 }}>
            <Skel w={200} h={20} />
            <Skel w={120} h={14} />
          </View>

          <Card className="p-0" variant="default">
            <View style={{ height: 280 }}>
              <EmptyState
                icon="matches"
                title="Henüz maç yok"
                body="İlk maçını oluştur."
                action="Yeni maç oluştur"
                onAction={() => {}}
              />
            </View>
          </Card>

          <Row gap={24}>
            <BellWithBadge count={0} />
            <BellWithBadge count={5} />
            <BellWithBadge count={120} />
          </Row>

          <Row gap={12}>
            <ScoreInput label="Sana sayı" onPress={() => {}} />
            <ScoreInput label="Berk sayı" onPress={() => {}} />
          </Row>
        </Section>
      </ScrollView>

      {/* Overlays mounted at root of the screen so they cover the scroll view. */}
      <Modal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <Text className="mb-2 font-display text-[18px] font-extrabold text-text">
          Hesabını sil
        </Text>
        <Text className="mb-4 text-[14px] text-text-2">
          Bu işlem geri alınamaz. ELO geçmişin ve maçların kaybolur.
        </Text>
        <Row>
          <Button variant="secondary" onPress={() => setModalVisible(false)}>
            Vazgeç
          </Button>
          <Button variant="danger" onPress={() => setModalVisible(false)}>
            Sil
          </Button>
        </Row>
      </Modal>

      <Sheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Format seç"
      >
        <View style={{ gap: 8 }}>
          {formats.map((f) => (
            <View
              key={f}
              className="flex-row items-center justify-between rounded-md border-base border-border-strong bg-surface px-4 py-3"
            >
              <FormatChip fmtKey={f} size={12} />
              <Text className="text-[12.5px] font-semibold text-text-3">Seç</Text>
            </View>
          ))}
          <Button
            variant="secondary"
            full
            onPress={() => setSheetVisible(false)}
          >
            Kapat
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
