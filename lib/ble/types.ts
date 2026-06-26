/**
 * TODO(firmware): this is the *decoded* shape the app works with everywhere
 * — BleConnectionManager.parseSensorPacket() is responsible for turning the
 * device's actual binary characteristic payload into this shape. The real
 * byte layout (endianness, field order, fixed vs. variable length, units)
 * is unconfirmed; until then this type doubles as the spec the firmware
 * team should review.
 */
export interface SensorSample {
  ts: string; // ISO timestamp, set by the phone on packet receipt
  co2Ppm: number | null;
  gasResistanceOhm: number | null;
  vocIndex: number | null;
  heartRate: number | null;
  hrvMs: number | null;
  respRate: number | null;
  tempC: number | null;
  humidityPct: number | null;
}

export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export interface DiscoveredDevice {
  id: string; // BLE peripheral id (platform-specific), used to connect()
  name: string | null;
  rssi: number | null;
}

export interface AeroScanDeviceInfo {
  deviceId: string; // hardware serial advertised by the device — maps to devices.device_id
  firmwareVersion: string | null;
  batteryPct: number | null;
}

export interface BleConnectionEvents {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onSample?: (sample: SensorSample) => void;
  onDeviceInfo?: (info: AeroScanDeviceInfo) => void;
  onError?: (error: Error) => void;
}
