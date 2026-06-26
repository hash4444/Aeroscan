import { supabase } from '@/lib/supabase/client';
import type {
  DeviceRow,
  MaskSize,
  ProfileRow,
  SensorReadingRow,
  SessionRow,
  SessionSummaryRow,
  Units,
} from '@/lib/supabase/types';

const READING_BATCH_SIZE = 500;

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  if (data == null) throw new Error('Expected data but got none');
  return data;
}

// ---- profiles -------------------------------------------------------------

export async function getOrCreateProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  return unwrap(await supabase.from('profiles').insert({ user_id: userId }).select('*').single());
}

export async function updateUnits(userId: string, units: Units): Promise<ProfileRow> {
  return unwrap(
    await supabase.from('profiles').update({ units }).eq('user_id', userId).select('*').single(),
  );
}

// ---- devices ----------------------------------------------------------------

export async function listDevices(userId: string): Promise<DeviceRow[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('paired_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function pairDevice(params: {
  userId: string;
  deviceId: string;
  name?: string;
  maskSize: MaskSize;
  firmwareVersion?: string;
}): Promise<DeviceRow> {
  return unwrap(
    await supabase
      .from('devices')
      .upsert(
        {
          user_id: params.userId,
          device_id: params.deviceId,
          name: params.name ?? null,
          mask_size: params.maskSize,
          firmware_version: params.firmwareVersion ?? null,
          paired_at: new Date().toISOString(),
          last_connected_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' },
      )
      .select('*')
      .single(),
  );
}

export async function touchDeviceConnection(deviceRowId: string): Promise<void> {
  const { error } = await supabase
    .from('devices')
    .update({ last_connected_at: new Date().toISOString() })
    .eq('id', deviceRowId);
  if (error) throw new Error(error.message);
}

// ---- sessions -----------------------------------------------------------

export async function createSession(params: {
  id: string;
  userId: string;
  deviceId: string | null;
  startedAt: string;
  resistanceLevel: number | null;
}): Promise<SessionRow> {
  return unwrap(
    await supabase
      .from('sessions')
      .insert({
        id: params.id,
        user_id: params.userId,
        device_id: params.deviceId,
        started_at: params.startedAt,
        resistance_level: params.resistanceLevel,
        status: 'active',
      })
      .select('*')
      .single(),
  );
}

export async function endSession(params: {
  sessionId: string;
  endedAt: string;
  status?: 'completed' | 'aborted';
}): Promise<SessionRow> {
  return unwrap(
    await supabase
      .from('sessions')
      .update({ ended_at: params.endedAt, status: params.status ?? 'completed' })
      .eq('id', params.sessionId)
      .select('*')
      .single(),
  );
}

export async function listRecentSessions(userId: string, limit = 20): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSession(sessionId: string): Promise<SessionRow> {
  return unwrap(await supabase.from('sessions').select('*').eq('id', sessionId).single());
}

// ---- sensor_readings ------------------------------------------------------

export type NewSensorReading = Omit<SensorReadingRow, 'id' | 'created_at'>;

/** Uploads a full session's buffered readings in chunked batch writes. */
export async function uploadSensorReadings(readings: NewSensorReading[]): Promise<void> {
  for (let i = 0; i < readings.length; i += READING_BATCH_SIZE) {
    const chunk = readings.slice(i, i + READING_BATCH_SIZE);
    const { error } = await supabase.from('sensor_readings').insert(chunk);
    if (error) throw new Error(error.message);
  }
}

export async function getSensorReadings(sessionId: string): Promise<SensorReadingRow[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('session_id', sessionId)
    .order('ts', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---- session_summaries ---------------------------------------------------

export async function computeSessionSummary(sessionId: string): Promise<SessionSummaryRow> {
  const { data, error } = await supabase.functions.invoke<{ summary: SessionSummaryRow }>(
    'compute-session-summary',
    { body: { session_id: sessionId } },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('compute-session-summary returned no data');
  return data.summary;
}

export async function getSessionSummary(sessionId: string): Promise<SessionSummaryRow | null> {
  const { data, error } = await supabase
    .from('session_summaries')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Summaries joined to their session's started_at, for trend charts. */
export async function listSummariesSince(
  userId: string,
  sinceIso: string,
): Promise<(SessionSummaryRow & { started_at: string })[]> {
  const { data, error } = await supabase
    .from('session_summaries')
    .select('*, sessions!inner(started_at, user_id)')
    .eq('sessions.user_id', userId)
    .gte('sessions.started_at', sinceIso)
    .order('started_at', { ascending: true, foreignTable: 'sessions' });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const { sessions, ...summary } = row as SessionSummaryRow & { sessions: { started_at: string } };
    return { ...summary, started_at: sessions.started_at };
  });
}
