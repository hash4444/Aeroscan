import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import type { SensorSample } from '@/lib/ble/types';
import { LOCAL_FLUSH_INTERVAL_MS } from '@/lib/ble/constants';
import { breathingEfficiencyScore, fatBurnIndex } from '@/lib/scoring';
import { useDeviceStore } from '@/lib/store/deviceStore';
import { appendReadings, clearBufferedReadings, getBufferedReadings } from '@/lib/storage/sessionBuffer';
import {
  computeSessionSummary,
  createSession,
  endSession as endSessionQuery,
  uploadSensorReadings,
} from '@/lib/supabase/queries';
import type { SessionSummaryRow } from '@/lib/supabase/types';

export interface LiveSeriesPoint {
  ts: string;
  fatBurnIndex: number | null;
  breathingEfficiency: number | null;
  co2Ppm: number | null;
  vocIndex: number | null;
  heartRate: number | null;
}

interface SessionState {
  status: 'idle' | 'active' | 'ending';
  sessionId: string | null;
  startedAt: string | null;
  resistanceLevel: number;
  latestSample: SensorSample | null;
  series: LiveSeriesPoint[];
  error: string | null;

  start: (params: { userId: string; deviceRowId: string | null; resistanceLevel: number }) => Promise<void>;
  end: () => Promise<SessionSummaryRow | null>;
  setResistanceLevel: (level: number) => void;
}

let unsubscribeSamples: (() => void) | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let pendingQueue: SensorSample[] = [];

function stopBackgroundTasks(): void {
  unsubscribeSamples?.();
  unsubscribeSamples = null;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'idle',
  sessionId: null,
  startedAt: null,
  resistanceLevel: 1,
  latestSample: null,
  series: [],
  error: null,

  start: async ({ userId, deviceRowId, resistanceLevel }) => {
    const sessionId = Crypto.randomUUID();
    const startedAt = new Date().toISOString();

    await createSession({ id: sessionId, userId, deviceId: deviceRowId, startedAt, resistanceLevel });

    pendingQueue = [];
    set({
      status: 'active',
      sessionId,
      startedAt,
      resistanceLevel,
      latestSample: null,
      series: [],
      error: null,
    });

    unsubscribeSamples = useDeviceStore.getState().subscribeSamples((sample) => {
      pendingQueue.push(sample);

      const point: LiveSeriesPoint = {
        ts: sample.ts,
        fatBurnIndex: fatBurnIndex(sample, get().resistanceLevel),
        breathingEfficiency: breathingEfficiencyScore(sample),
        co2Ppm: sample.co2Ppm,
        vocIndex: sample.vocIndex,
        heartRate: sample.heartRate,
      };
      set((state) => ({ latestSample: sample, series: [...state.series, point] }));
    });

    flushTimer = setInterval(() => {
      const id = get().sessionId;
      if (!id || pendingQueue.length === 0) return;
      const toFlush = pendingQueue;
      pendingQueue = [];
      appendReadings(id, toFlush).catch((error) => set({ error: (error as Error).message }));
    }, LOCAL_FLUSH_INTERVAL_MS);
  },

  end: async () => {
    const { sessionId } = get();
    if (!sessionId) return null;

    set({ status: 'ending' });
    stopBackgroundTasks();

    try {
      if (pendingQueue.length > 0) {
        await appendReadings(sessionId, pendingQueue);
        pendingQueue = [];
      }

      const allReadings = await getBufferedReadings(sessionId);
      await uploadSensorReadings(
        allReadings.map((sample) => ({
          session_id: sessionId,
          ts: sample.ts,
          co2_ppm: sample.co2Ppm,
          gas_resistance_ohm: sample.gasResistanceOhm,
          voc_index: sample.vocIndex,
          heart_rate: sample.heartRate,
          hrv_ms: sample.hrvMs,
          resp_rate: sample.respRate,
          temp_c: sample.tempC,
          humidity_pct: sample.humidityPct,
        })),
      );

      await endSessionQuery({ sessionId, endedAt: new Date().toISOString(), status: 'completed' });
      const summary = await computeSessionSummary(sessionId);
      await clearBufferedReadings(sessionId);

      set({ status: 'idle', sessionId: null, startedAt: null, latestSample: null, series: [] });
      return summary;
    } catch (error) {
      set({ status: 'idle', error: (error as Error).message });
      throw error;
    }
  },

  setResistanceLevel: (level) => set({ resistanceLevel: level }),
}));
