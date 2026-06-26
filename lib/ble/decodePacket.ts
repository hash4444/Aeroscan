import type { SensorSample } from '@/lib/ble/types';

/**
 * TODO(firmware): decode the real SENSOR_STREAM characteristic payload.
 *
 * `base64Value` is the raw base64 string react-native-ble-plx hands back
 * for a characteristic update — nothing about the byte layout (field order,
 * widths, endianness, scaling) is confirmed yet, so this intentionally does
 * not guess at a format. Wire this up once the firmware team shares the
 * packet spec; until then the app runs entirely on `MockSensorGenerator`.
 */
export function decodeSensorPacket(_base64Value: string): SensorSample {
  throw new Error(
    'decodeSensorPacket is not implemented — AeroScan packet format is not yet finalized. Use mock BLE mode for development.',
  );
}
