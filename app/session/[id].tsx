import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatBlock } from '@/components/ui/StatBlock';
import { TrendLineChart } from '@/components/ui/TrendLineChart';
import { ChartColors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { getSensorReadings, getSession, getSessionSummary, listRecentSessions } from '@/lib/supabase/queries';
import type { SensorReadingRow, SessionRow, SessionSummaryRow } from '@/lib/supabase/types';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  return `${Math.round(seconds / 60)} min`;
}

function diffLabel(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null) return null;
  const delta = Math.round(current - previous);
  if (delta === 0) return 'Same as last session';
  return `${delta > 0 ? '+' : ''}${delta} vs. last session`;
}

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authSession = useAuthStore((s) => s.session);

  const [session, setSession] = useState<SessionRow | null>(null);
  const [summary, setSummary] = useState<SessionSummaryRow | null>(null);
  const [readings, setReadings] = useState<SensorReadingRow[]>([]);
  const [previousSummary, setPreviousSummary] = useState<SessionSummaryRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !authSession) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [sessionRow, summaryRow, readingRows, recent] = await Promise.all([
        getSession(id),
        getSessionSummary(id),
        getSensorReadings(id),
        listRecentSessions(authSession.user.id, 20),
      ]);
      if (cancelled) return;

      const olderCompleted = recent.find((s) => s.id !== id && s.status === 'completed');
      const prevSummary = olderCompleted ? await getSessionSummary(olderCompleted.id) : null;
      if (cancelled) return;

      setSession(sessionRow);
      setSummary(summaryRow);
      setReadings(readingRows);
      setPreviousSummary(prevSummary);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, authSession]);

  if (loading || !session) {
    return (
      <ScreenContainer scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F04E14" />
        </View>
      </ScreenContainer>
    );
  }

  const startedAtMs = new Date(session.started_at).getTime();
  const chartData = readings.map((r) => ({
    x: Math.round((new Date(r.ts).getTime() - startedAtMs) / 1000),
    co2_ppm: r.co2_ppm,
    voc_index: r.voc_index,
    heart_rate: r.heart_rate,
  }));

  return (
    <ScreenContainer>
      <Text className="pt-2 text-sm text-textSecondary">
        {new Date(session.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </Text>

      <Card>
        <View className="flex-row justify-around">
          <ScoreRing
            value={summary?.avg_fat_burn_index ?? null}
            label="Fat-Burn Index"
            color={ChartColors.fatBurnIndex}
          />
          <ScoreRing
            value={summary?.avg_breathing_efficiency ?? null}
            label="Breathing Efficiency"
            color={ChartColors.breathingEfficiency}
          />
        </View>
        {previousSummary ? (
          <View className="mt-2 gap-0.5">
            {diffLabel(summary?.avg_fat_burn_index ?? null, previousSummary.avg_fat_burn_index) ? (
              <Text className="text-center text-xs text-textSecondary">
                Fat-Burn: {diffLabel(summary?.avg_fat_burn_index ?? null, previousSummary.avg_fat_burn_index)}
              </Text>
            ) : null}
            {diffLabel(summary?.avg_breathing_efficiency ?? null, previousSummary.avg_breathing_efficiency) ? (
              <Text className="text-center text-xs text-textSecondary">
                Breathing:{' '}
                {diffLabel(summary?.avg_breathing_efficiency ?? null, previousSummary.avg_breathing_efficiency)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card>
        <View className="flex-row gap-4">
          <StatBlock label="Duration" value={formatDuration(summary?.duration_sec ?? null)} />
          <StatBlock label="Resistance" value={session.resistance_level?.toString() ?? '—'} />
          <StatBlock
            label="Calories"
            value={summary?.calories_est != null ? Math.round(summary.calories_est).toString() : '—'}
            unit="kcal"
          />
        </View>
      </Card>

      <Card>
        <Text className="mb-2 text-sm font-medium text-text">CO2 & VOC</Text>
        <TrendLineChart
          data={chartData}
          series={[
            { key: 'co2_ppm', color: ChartColors.co2, label: 'CO2' },
            { key: 'voc_index', color: ChartColors.voc, label: 'VOC' },
          ]}
        />
      </Card>

      <Card>
        <Text className="mb-2 text-sm font-medium text-text">Heart Rate</Text>
        <TrendLineChart data={chartData} series={[{ key: 'heart_rate', color: ChartColors.heartRate, label: 'HR' }]} />
      </Card>
    </ScreenContainer>
  );
}
