/**
 * GATT service/characteristic UUIDs and packet layout for the AeroScan mask.
 *
 * ⚠️ PLACEHOLDER VALUES — TODO(firmware team): confirm and replace every
 * UUID below, and confirm the wire format in `lib/ble/types.ts`'s
 * `RawSensorPacket` comment. Nothing here is a real assigned UUID; they're
 * deliberately zeroed/structured as obvious placeholders so they can't be
 * mistaken for production identifiers. Do not ship to hardware without
 * replacing them.
 */

// TODO(firmware): primary AeroScan GATT service.
export const AEROSCAN_SERVICE_UUID = '00000000-aero-0000-0000-000000000001';

export const AEROSCAN_CHARACTERISTICS = {
  // TODO(firmware): notify characteristic streaming ~1Hz sensor packets
  // (CO2, gas resistance/VOC, PPG-derived HR/HRV, resp rate, temp, humidity).
  SENSOR_STREAM: '00000000-aero-0000-0000-000000000002',

  // TODO(firmware): read/notify characteristic for device info
  // (firmware_version, hardware revision, battery).
  DEVICE_INFO: '00000000-aero-0000-0000-000000000003',

  // TODO(firmware): write characteristic for app -> device commands
  // (set resistance_level, start/stop session marker, request OTA mode).
  CONTROL: '00000000-aero-0000-0000-000000000004',

  // TODO(firmware): OTA/DFU entry point. Confirm whether this is Nordic's
  // standard Secure DFU service or a custom characteristic before wiring up
  // Settings > "Update firmware".
  OTA_CONTROL: '00000000-aero-0000-0000-000000000005',
} as const;

// TODO(firmware): BLE advertised local-name prefix used to filter scan
// results down to AeroScan devices (vs. other nearby BLE peripherals).
export const AEROSCAN_DEVICE_NAME_PREFIX = 'AeroScan-';

// How long to scan for devices before giving up, in ms.
export const SCAN_TIMEOUT_MS = 15_000;

// Reconnect backoff schedule used by BleConnectionManager after an
// unexpected disconnect mid-session.
export const RECONNECT_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 15_000];

// Cadence at which the in-memory packet buffer is flushed to the durable
// local store (SQLite) — independent of when it's uploaded to Supabase.
export const LOCAL_FLUSH_INTERVAL_MS = 15_000;
