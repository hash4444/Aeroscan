import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TrendLineChart } from '@/components/ui/TrendLineChart';
import { ChartColors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { listSummariesSince } from '@/lib/supabase/queries';
import type { SessionSummaryRow } from '@/lib/supabase/types';

type Range = 'week' | 'month';

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30 };

export default function Trends() {
  const session = useAuthStore((s) => s.session);
  const [range, setRange] = useState<Range>('week');
  const [summaries, setSummaries] = useState<(SessionSummaryRow & { started_at: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const since = new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString();
      const rows = await listSummariesSince(session.user.id, since);
      setSummaries(rows);
    } finally {
      setLoading(false);
    }
  }, [session, range]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const firstMs = summaries.length ? new Date(summaries[0].started_at).getTime() : 0;
  const chartData = summaries.map((s) => ({
    x: Math.round((new Date(s.started_at).getTime() - firstMs) / (24 * 60 * 60 * 1000)),
    avg_fat_burn_index: s.avg_fat_burn_index,
    avg_breathing_efficiency: s.avg_breathing_efficiency,
  }));

  const avg = (key: 'avg_fat_burn_index' | 'avg_breathing_efficiency') => {
    const values = summaries.map((s) => s[key]).filter((v): v is number => v != null);
    if (!values.length) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  return (
    <ScreenContainer>
      <Text className="pt-2 text-2xl font-bold text-text">Trends</Text>

      <View className="flex-row gap-2">
        <Button
          label="Week"
          variant={range === 'week' ? 'primary' : 'secondary'}
          onPress={() => setRange('week')}
          className="flex-1"
        />
        <Button
          label="Month"
          variant={range === 'month' ? 'primary' : 'secondary'}
          onPress={() => setRange('month')}
          className="flex-1"
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#F04E14" />
      ) : summaries.length === 0 ? (
        <Card>
          <Text className="py-6 text-center text-sm text-textSecondary">
            No sessions in this range yet. Complete a session to start tracking trends.
          </Text>
        </Card>
      ) : (
        <>
          <Card>
            <View className="flex-row gap-6">
              <View className="flex-1 gap-1">
                <Text className="text-xs text-textSecondary">Avg Fat-Burn Index</Text>
                <Text className="text-xl font-semibold text-text">{avg('avg_fat_burn_index') ?? '—'}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-xs text-textSecondary">Avg Breathing Efficiency</Text>
                <Text className="text-xl font-semibold text-text">{avg('avg_breathing_efficiency') ?? '—'}</Text>
              </View>
            </View>
          </Card>

          <Card>
            <TrendLineChart
              title="Fat-Burn Index"
              data={chartData}
              series={[{ key: 'avg_fat_burn_index', color: ChartColors.fatBurnIndex, label: 'Fat-Burn' }]}
              height={200}
            />
          </Card>

          <Card>
            <TrendLineChart
              title="Breathing Efficiency"
              data={chartData}
              series={[
                { key: 'avg_breathing_efficiency', color: ChartColors.breathingEfficiency, label: 'Breathing' },
              ]}
              height={200}
            />
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}
