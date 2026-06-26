import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConnectionBadge } from '@/components/ui/ConnectionBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TrendLineChart } from '@/components/ui/TrendLineChart';
import { ChartColors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { reconnectToPairedDevice, useDeviceStore } from '@/lib/store/deviceStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useSettingsStore } from '@/lib/store/settingsStore';

const RESISTANCE_LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

function formatElapsed(startedAt: string | null, nowMs: number | null): string {
  if (!startedAt || nowMs == null) return '00:00';
  const totalSec = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveSession() {
  const authSession = useAuthStore((s) => s.session);
  const pairedDevice = useDeviceStore((s) => s.pairedDevice);
  const connectionState = useDeviceStore((s) => s.connectionState);
  const useMockBle = useSettingsStore((s) => s.useMockBle);
  const deviceSetResistance = useDeviceStore((s) => s.setResistanceLevel);

  const status = useSessionStore((s) => s.status);
  const startedAt = useSessionStore((s) => s.startedAt);
  const resistanceLevel = useSessionStore((s) => s.resistanceLevel);
  const latestSample = useSessionStore((s) => s.latestSample);
  const series = useSessionStore((s) => s.series);
  const error = useSessionStore((s) => s.error);
  const start = useSessionStore((s) => s.start);
  const end = useSessionStore((s) => s.end);
  const setResistanceLevel = useSessionStore((s) => s.setResistanceLevel);

  const [now, setNow] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const initial = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(tick);
      clearTimeout(initial);
    };
  }, []);

  useEffect(() => {
    if (startedRef.current || !authSession || !pairedDevice) return;
    startedRef.current = true;

    (async () => {
      if (connectionState !== 'connected') {
        await reconnectToPairedDevice(pairedDevice, useMockBle);
      }
      await start({ userId: authSession.user.id, deviceRowId: pairedDevice.id, resistanceLevel: 1 });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession, pairedDevice]);

  async function handleResistanceChange(level: number) {
    setResistanceLevel(level);
    await deviceSetResistance(level);
  }

  async function handleEnd() {
    setEnding(true);
    try {
      const summary = await end();
      if (summary) {
        router.replace({ pathname: '/session/[id]', params: { id: summary.session_id } });
      } else {
        router.back();
      }
    } finally {
      setEnding(false);
    }
  }

  const startedAtElapsedMs = startedAt ? new Date(startedAt).getTime() : now ?? 0;
  const chartData = series.map((point) => ({
    x: Math.round((new Date(point.ts).getTime() - startedAtElapsedMs) / 1000),
    fatBurnIndex: point.fatBurnIndex,
    breathingEfficiency: point.breathingEfficiency,
  }));

  return (
    <ScreenContainer>
      <View className="flex-row items-center justify-between pt-2">
        <Text className="text-3xl font-bold text-text">{formatElapsed(startedAt, now)}</Text>
        <ConnectionBadge state={connectionState} />
      </View>

      {error ? <Text className="text-sm text-warning">{error}</Text> : null}

      <Card>
        <View className="flex-row justify-around">
          <ScoreRing
            value={series.length ? series[series.length - 1].fatBurnIndex : null}
            label="Fat-Burn Index"
            color={ChartColors.fatBurnIndex}
          />
          <ScoreRing
            value={series.length ? series[series.length - 1].breathingEfficiency : null}
            label="Breathing Efficiency"
            color={ChartColors.breathingEfficiency}
          />
        </View>
      </Card>

      <Card>
        <Text className="mb-1 text-xs text-textSecondary">
          HR {latestSample?.heartRate ?? '—'} bpm · CO2 {latestSample?.co2Ppm ?? '—'} ppm · VOC{' '}
          {latestSample?.vocIndex ?? '—'}
        </Text>
        <TrendLineChart
          data={chartData}
          series={[
            { key: 'fatBurnIndex', color: ChartColors.fatBurnIndex, label: 'Fat-Burn' },
            { key: 'breathingEfficiency', color: ChartColors.breathingEfficiency, label: 'Breathing' },
          ]}
        />
      </Card>

      <Card>
        <Text className="mb-2 text-sm font-medium text-text">Resistance Level</Text>
        <View className="flex-row flex-wrap gap-2">
          {RESISTANCE_LEVELS.map((level) => (
            <Button
              key={level}
              label={String(level)}
              variant={resistanceLevel === level ? 'primary' : 'secondary'}
              onPress={() => handleResistanceChange(level)}
              className="w-12 px-0 py-3"
            />
          ))}
        </View>
      </Card>

      <Button label="End Session" variant="danger" onPress={handleEnd} loading={ending || status === 'ending'} />
    </ScreenContainer>
  );
}
