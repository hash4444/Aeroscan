import * as SQLite from 'expo-sqlite';

import type { SensorSample } from '@/lib/ble/types';

/**
 * Durable local buffer for in-progress session readings. The live session
 * screen flushes its in-memory packet queue here periodically
 * (LOCAL_FLUSH_INTERVAL_MS) so a BLE drop, app backgrounding, or crash never
 * loses already-received samples — the full buffer is read back and
 * uploaded in one batch write when the session ends.
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('aeroscan-session-buffer.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS buffered_readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          ts TEXT NOT NULL,
          co2_ppm REAL,
          gas_resistance_ohm REAL,
          voc_index REAL,
          heart_rate REAL,
          hrv_ms REAL,
          resp_rate REAL,
          temp_c REAL,
          humidity_pct REAL
        );
        CREATE INDEX IF NOT EXISTS buffered_readings_session_idx ON buffered_readings(session_id);
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function appendReadings(sessionId: string, samples: SensorSample[]): Promise<void> {
  if (samples.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const sample of samples) {
      await db.runAsync(
        `INSERT INTO buffered_readings
           (session_id, ts, co2_ppm, gas_resistance_ohm, voc_index, heart_rate, hrv_ms, resp_rate, temp_c, humidity_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          sample.ts,
          sample.co2Ppm,
          sample.gasResistanceOhm,
          sample.vocIndex,
          sample.heartRate,
          sample.hrvMs,
          sample.respRate,
          sample.tempC,
          sample.humidityPct,
        ],
      );
    }
  });
}

export async function getBufferedReadings(sessionId: string): Promise<SensorSample[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    ts: string;
    co2_ppm: number | null;
    gas_resistance_ohm: number | null;
    voc_index: number | null;
    heart_rate: number | null;
    hrv_ms: number | null;
    resp_rate: number | null;
    temp_c: number | null;
    humidity_pct: number | null;
  }>('SELECT ts, co2_ppm, gas_resistance_ohm, voc_index, heart_rate, hrv_ms, resp_rate, temp_c, humidity_pct FROM buffered_readings WHERE session_id = ? ORDER BY ts ASC', [
    sessionId,
  ]);

  return rows.map((row) => ({
    ts: row.ts,
    co2Ppm: row.co2_ppm,
    gasResistanceOhm: row.gas_resistance_ohm,
    vocIndex: row.voc_index,
    heartRate: row.heart_rate,
    hrvMs: row.hrv_ms,
    respRate: row.resp_rate,
    tempC: row.temp_c,
    humidityPct: row.humidity_pct,
  }));
}

export async function clearBufferedReadings(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM buffered_readings WHERE session_id = ?', [sessionId]);
}
