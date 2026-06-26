import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConnectionBadge } from '@/components/ui/ConnectionBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SessionListItem } from '@/components/ui/SessionListItem';
import { ChartColors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { useDeviceStore } from '@/lib/store/deviceStore';
import { getSessionSummary, listRecentSessions } from '@/lib/supabase/queries';
import type { SessionRow, SessionSummaryRow } from '@/lib/supabase/types';

type SessionWithSummary = SessionRow & { summary: SessionSummaryRow | null };

function formatDuration(session: SessionRow): string {
  if (!session.ended_at) return 'In progress';
  const ms = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
  return `${Math.max(1, Math.round(ms / 60000))} min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Home() {
  const session = useAuthStore((s) => s.session);
  const connectionState = useDeviceStore((s) => s.connectionState);
  const pairedDevice = useDeviceStore((s) => s.pairedDevice);

  const [sessions, setSessions] = useState<SessionWithSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const recent = await listRecentSessions(session.user.id, 10);
      const withSummaries = await Promise.all(
        recent.map(async (s) => ({
          ...s,
          summary: s.status === 'completed' ? await getSessionSummary(s.id) : null,
        })),
      );
      setSessions(withSummaries);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const latest = sessions.find((s) => s.summary != null)?.summary ?? null;

  return (
    <ScreenContainer>
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-text">AeroScan</Text>
        <ConnectionBadge state={connectionState} />
      </View>

      <Card>
        <Text className="mb-3 text-sm font-medium text-text">Latest Session</Text>
        {latest ? (
          <View className="flex-row justify-around">
            <ScoreRing value={latest.avg_fat_burn_index} label="Fat-Burn Index" color={ChartColors.fatBurnIndex} />
            <ScoreRing
              value={latest.avg_breathing_efficiency}
              label="Breathing Efficiency"
              color={ChartColors.breathingEfficiency}
            />
          </View>
        ) : (
          <Text className="py-4 text-center text-sm text-textSecondary">
            Complete a session to see your scores here.
          </Text>
        )}
      </Card>

      <Button
        label="Start Session"
        onPress={() => router.push('/session/live')}
        disabled={!pairedDevice}
        className="mt-1"
      />
      {!pairedDevice ? (
        <Text className="text-center text-xs text-textSecondary">Pair a mask in Settings to start a session.</Text>
      ) : null}

      <View className="gap-2">
        <Text className="text-sm font-medium text-text">Recent Sessions</Text>
        {loading ? (
          <ActivityIndicator color="#F04E14" />
        ) : sessions.length === 0 ? (
          <Text className="text-sm text-textSecondary">No sessions yet.</Text>
        ) : (
          <View className="gap-2">
            {sessions.map((item) => (
              <SessionListItem
                key={item.id}
                dateLabel={formatDate(item.started_at)}
                durationLabel={formatDuration(item)}
                resistanceLevel={item.resistance_level}
                fatBurnIndex={item.summary?.avg_fat_burn_index ?? null}
                breathingEfficiency={item.summary?.avg_breathing_efficiency ?? null}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: item.id } })}
              />
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
