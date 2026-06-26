// Hand-written types mirroring /supabase/migrations. Regenerate with
// `supabase gen types typescript` against a real project once schema
// changes land, and replace this file wholesale.

export type Units = 'metric' | 'imperial';
export type MaskSize = 's' | 'm' | 'l';
export type SessionStatus = 'active' | 'completed' | 'aborted';

export type ProfileRow = {
  user_id: string;
  units: Units;
  created_at: string;
  updated_at: string;
}

export type DeviceRow = {
  id: string;
  user_id: string;
  device_id: string;
  name: string | null;
  mask_size: MaskSize | null;
  firmware_version: string | null;
  paired_at: string;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SessionRow = {
  id: string;
  user_id: string;
  device_id: string | null;
  started_at: string;
  ended_at: string | null;
  resistance_level: number | null;
  status: SessionStatus;
  created_at: string;
}

export type SensorReadingRow = {
  id: number;
  session_id: string;
  ts: string;
  co2_ppm: number | null;
  gas_resistance_ohm: number | null;
  voc_index: number | null;
  heart_rate: number | null;
  hrv_ms: number | null;
  resp_rate: number | null;
  temp_c: number | null;
  humidity_pct: number | null;
  created_at: string;
}

export type SessionSummaryRow = {
  session_id: string;
  avg_fat_burn_index: number | null;
  avg_breathing_efficiency: number | null;
  duration_sec: number | null;
  calories_est: number | null;
  computed_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { user_id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      devices: {
        Row: DeviceRow;
        Insert: Partial<DeviceRow> & { user_id: string; device_id: string };
        Update: Partial<DeviceRow>;
        Relationships: [];
      };
      sessions: {
        Row: SessionRow;
        Insert: Partial<SessionRow> & { id: string; user_id: string };
        Update: Partial<SessionRow>;
        Relationships: [];
      };
      sensor_readings: {
        Row: SensorReadingRow;
        Insert: Omit<SensorReadingRow, 'id' | 'created_at'>;
        Update: Partial<SensorReadingRow>;
        Relationships: [];
      };
      session_summaries: {
        Row: SessionSummaryRow;
        Insert: Partial<SessionSummaryRow> & { session_id: string };
        Update: Partial<SessionSummaryRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
