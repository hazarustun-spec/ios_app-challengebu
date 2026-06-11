// Admin · Sistem Sağlığı — Plan 8 Phase G (screen 55 in
// screens-admin-system.jsx).
//
// Three sections:
//   1. Warn banner (only when at least one cron run failed)
//   2. Cron işleri — last status per job (status dot + jobname + ts + tone pill)
//   3. Denetim kaydı — Plan 7 audit log feed, restyled
//
// Plan 8 Phase A4 adds the `admin_cron_status(lim)` RPC — wired via the new
// `useCronStatus` hook. Old `useAdminHealth` (5 counters) still feeds the
// header stat strip so the screen surface both the platform's row counters
// and its job-runner health in one place.

import { router } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';
import { Banner } from '../../components/ui/Banner';
import { Icon } from '../../components/ui/Icon';
import { useAdminHealth } from '../../hooks/use-admin-health';
import { useAuditLog } from '../../hooks/use-audit-log';
import { useCronStatus, type CronRunRow } from '../../hooks/use-cron-status';
import { colors } from '../../theme/colors';

export default function AdminHealthScreen() {
  const health = useAdminHealth();
  const audit = useAuditLog(15);
  const cron = useCronStatus(15);

  // Group cron rows by jobname → latest run only, so we get one card per job
  // (newest-first ordering preserved by the SQL `order by start_time desc`).
  const latestPerJob = collectLatestPerJob(cron.data ?? []);
  const failingJobs = latestPerJob.filter((r) => r.status !== 'succeeded' && r.status !== 'running');

  const refreshing =
    health.isRefetching || audit.isRefetching || cron.isRefetching;

  const refreshAll = () => {
    health.refetch();
    audit.refetch();
    cron.refetch();
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Sistem Sağlığı"
        subtitle="Cron işleri + denetim kaydı"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={colors.text3}
          />
        }
      >
        {/* Top warn banner */}
        {failingJobs.length > 0 && (
          <Banner
            tone="warning"
            title={`${failingJobs.length} servis uyarı veriyor`}
            body={failingJobs.map((r) => r.jobname).join(', ')}
          />
        )}

        {/* Counters */}
        {health.data && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Stat label="Toplam üye" value={health.data.totalUsers} />
            <Stat label="Aktif üye" value={health.data.activeUsers} />
            <Stat label="Bugünkü maç" value={health.data.matchesTodayCount} />
            <Stat label="Açık itiraz" value={health.data.openDisputeCount} />
            <Stat label="Bekleyen teklif" value={health.data.pendingMatchRequestCount} />
          </View>
        )}

        {/* Cron jobs */}
        <SectionLabel>Cron işleri</SectionLabel>
        {cron.isLoading ? (
          <Loading />
        ) : latestPerJob.length === 0 ? (
          <Empty msg="Cron çalışmıyor görünüyor." />
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            {latestPerJob.map((row, i) => (
              <CronRow key={row.jobname} row={row} divider={i > 0} />
            ))}
          </View>
        )}

        {/* Audit log */}
        <SectionLabel>Denetim kaydı</SectionLabel>
        {(audit.data ?? []).length === 0 ? (
          <Empty msg="Audit kaydı yok." />
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            {(audit.data ?? []).map((row, i) => (
              <View
                key={row.id}
                style={{
                  flexDirection: 'row',
                  gap: 11,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.surface3,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor:
                      row.actor_id === null ? colors.surface2 : colors.claySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name={row.actor_id === null ? 'settings' : 'shield'}
                    size={15}
                    color={row.actor_id === null ? colors.text3 : colors.clayText}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 13, lineHeight: 18 }}
                  >
                    {row.action}
                  </Text>
                  <Text
                    className="font-sans text-text-3"
                    style={{ fontSize: 11, marginTop: 2 }}
                  >
                    {row.actor_name ?? 'sistem'} ·{' '}
                    <Text className="font-num">
                      {new Date(row.created_at).toLocaleString('tr-TR')}
                    </Text>
                    {row.entity_id ? ` · #${row.entity_id.slice(0, 8)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CronRow({ row, divider }: { row: CronRunRow; divider: boolean }) {
  const ok = row.status === 'succeeded';
  const running = row.status === 'running' || row.status === 'starting';
  const dotColor = ok ? colors.win : running ? colors.info : colors.warn;
  const pillTone = ok
    ? { bg: colors.limeSoft, color: colors.lvCaylak, label: 'OK' }
    : running
      ? { bg: colors.blueSoft, color: colors.court, label: 'ÇALIŞIYOR' }
      : { bg: colors.warnSoft, color: colors.warn, label: 'UYARI' };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.surface3,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: dotColor,
          borderWidth: 1.5,
          borderColor: colors.borderStrong,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 13.5 }}
          numberOfLines={1}
        >
          {row.jobname}
        </Text>
        <Text
          className="font-num"
          style={{
            fontSize: 11.5,
            color: ok ? colors.text3 : colors.warn,
            fontWeight: '600',
            marginTop: 1,
          }}
        >
          {new Date(row.start_time).toLocaleString('tr-TR')}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: pillTone.bg,
        }}
      >
        <Text
          className="font-sans font-extrabold"
          style={{ fontSize: 10.5, color: pillTone.color, letterSpacing: 0.5 }}
        >
          {pillTone.label}
        </Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        width: '48%',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surface,
        padding: 12,
      }}
    >
      <Text
        className="font-sans font-semibold text-text-3"
        style={{ fontSize: 11 }}
      >
        {label}
      </Text>
      <Text
        className="font-num font-extrabold text-text"
        style={{ fontSize: 22, marginTop: 4 }}
      >
        {value}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="font-sans font-extrabold text-text-3"
      style={{
        fontSize: 11,
        letterSpacing: 0.66,
        paddingLeft: 4,
        textTransform: 'uppercase',
        marginBottom: -8,
      }}
    >
      {children}
    </Text>
  );
}

function Loading() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
        Yükleniyor…
      </Text>
    </View>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
        {msg}
      </Text>
    </View>
  );
}

// Reduce the time-ordered cron rows down to one entry per job (the most
// recent run for each), preserving the SQL ordering.
function collectLatestPerJob(rows: CronRunRow[]): CronRunRow[] {
  const seen = new Set<string>();
  const out: CronRunRow[] = [];
  for (const r of rows) {
    if (seen.has(r.jobname)) continue;
    seen.add(r.jobname);
    out.push(r);
  }
  return out;
}
