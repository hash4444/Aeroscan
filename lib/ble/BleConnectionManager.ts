import {
  AEROSCAN_CHARACTERISTICS,
  AEROSCAN_SERVICE_UUID,
  RECONNECT_BACKOFF_MS,
  SCAN_TIMEOUT_MS,
} from '@/lib/ble/constants';
import { decodeSensorPacket } from '@/lib/ble/decodePacket';
import { MockSensorGenerator } from '@/lib/ble/mockGenerator';
import type {
  AeroScanDeviceInfo,
  BleConnectionEvents,
  ConnectionState,
  DiscoveredDevice,
} from '@/lib/ble/types';

// Lazily typed — the native module isn't loaded until a real (non-mock)
// connection is actually attempted, so this file imports fine in
// environments without the native module compiled in (e.g. plain Expo Go).
type RNBleManager = import('react-native-ble-plx').BleManager;
type RNBleDevice = import('react-native-ble-plx').Device;

export interface BleConnectionManagerOptions {
  /** Debug toggle: generate fake sensor data instead of talking to real BLE hardware. */
  mock?: boolean;
}

/**
 * Owns the single active BLE connection to an AeroScan mask (or, in mock
 * mode, a simulated one) and normalizes both into the same event-driven
 * interface the rest of the app consumes.
 */
export class BleConnectionManager {
  private readonly events: BleConnectionEvents;
  private readonly mock: boolean;

  private state: ConnectionState = 'disconnected';
  private resistanceLevel = 1;

  // Real BLE state
  private nativeManager: RNBleManager | null = null;
  private connectedDevice: RNBleDevice | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private expectingDisconnect = false;

  // Mock BLE state
  private mockGenerator = new MockSensorGenerator();
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private mockDeviceId: string | null = null;

  constructor(events: BleConnectionEvents, options: BleConnectionManagerOptions = {}) {
    this.events = events;
    this.mock = options.mock ?? false;
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.events.onConnectionStateChange?.(state);
  }

  // ---- scanning -----------------------------------------------------------

  /** Scans for nearby AeroScan devices until `stop()` is called or the timeout elapses. */
  startScan(onDiscovered: (device: DiscoveredDevice) => void): () => void {
    this.setState('scanning');

    if (this.mock) {
      const fakeDevices: DiscoveredDevice[] = [
        { id: 'MOCK-AEROSCAN-0001', name: 'AeroScan-0001', rssi: -42 },
      ];
      const timer = setTimeout(() => {
        fakeDevices.forEach(onDiscovered);
      }, 600);
      return () => {
        clearTimeout(timer);
        if (this.state === 'scanning') this.setState('disconnected');
      };
    }

    const manager = this.getNativeManager();
    manager.startDeviceScan([AEROSCAN_SERVICE_UUID], null, (error, device) => {
      if (error) {
        this.events.onError?.(error);
        return;
      }
      if (!device) return;
      onDiscovered({ id: device.id, name: device.name, rssi: device.rssi });
    });

    const timeout = setTimeout(() => this.stopScan(), SCAN_TIMEOUT_MS);
    return () => {
      clearTimeout(timeout);
      this.stopScan();
    };
  }

  private stopScan(): void {
    if (!this.mock) this.nativeManager?.stopDeviceScan();
    if (this.state === 'scanning') this.setState('disconnected');
  }

  // ---- connect / disconnect -------------------------------------------------

  async connect(deviceId: string): Promise<AeroScanDeviceInfo> {
    this.setState('connecting');

    if (this.mock) {
      this.mockDeviceId = deviceId;
      this.mockGenerator.reset();
      this.setState('connected');
      this.startMockStreaming();
      return { deviceId, firmwareVersion: 'mock-1.0.0', batteryPct: 100 };
    }

    try {
      const manager = this.getNativeManager();
      const device = await manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.expectingDisconnect = false;
      this.reconnectAttempt = 0;

      device.onDisconnected(() => this.handleUnexpectedDisconnect(deviceId));

      device.monitorCharacteristicForService(
        AEROSCAN_SERVICE_UUID,
        AEROSCAN_CHARACTERISTICS.SENSOR_STREAM,
        (error, characteristic) => {
          if (error) {
            this.events.onError?.(error);
            return;
          }
          if (!characteristic?.value) return;
          try {
            this.events.onSample?.(decodeSensorPacket(characteristic.value));
          } catch (decodeError) {
            this.events.onError?.(decodeError as Error);
          }
        },
      );

      this.setState('connected');
      // TODO(firmware): once DEVICE_INFO layout is confirmed, parse the
      // real characteristic value instead of returning a stub here.
      return { deviceId, firmwareVersion: null, batteryPct: null };
    } catch (error) {
      this.setState('disconnected');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.expectingDisconnect = true;
    this.clearReconnectTimer();

    if (this.mock) {
      this.stopMockStreaming();
      this.setState('disconnected');
      return;
    }

    if (this.connectedDevice) {
      await this.nativeManager?.cancelDeviceConnection(this.connectedDevice.id).catch(() => undefined);
      this.connectedDevice = null;
    }
    this.setState('disconnected');
  }

  async setResistanceLevel(level: number): Promise<void> {
    this.resistanceLevel = level;

    if (this.mock) return;

    if (!this.connectedDevice) throw new Error('Not connected to a device');
    // TODO(firmware): confirm the CONTROL characteristic command encoding —
    // this assumes a single byte resistance level, base64-encoded.
    const payload = base64FromByte(level);
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      AEROSCAN_SERVICE_UUID,
      AEROSCAN_CHARACTERISTICS.CONTROL,
      payload,
    );
  }

  destroy(): void {
    this.clearReconnectTimer();
    this.stopMockStreaming();
    if (!this.mock) {
      this.nativeManager?.stopDeviceScan();
      if (this.connectedDevice) {
        this.nativeManager?.cancelDeviceConnection(this.connectedDevice.id).catch(() => undefined);
      }
      this.nativeManager?.destroy();
      this.nativeManager = null;
    }
  }

  // ---- mock streaming -------------------------------------------------------

  private startMockStreaming(): void {
    this.stopMockStreaming();
    this.mockInterval = setInterval(() => {
      this.events.onSample?.(this.mockGenerator.next(this.resistanceLevel));
    }, 1_000);
  }

  private stopMockStreaming(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  /** Debug-only: simulate a BLE drop mid-session to exercise reconnect handling. */
  debugSimulateDisconnect(durationMs = 5_000): void {
    if (!this.mock) return;
    this.stopMockStreaming();
    this.setState('reconnecting');
    setTimeout(() => {
      if (this.state === 'reconnecting') {
        this.setState('connected');
        this.startMockStreaming();
      }
    }, durationMs);
  }

  // ---- reconnect logic (real BLE only) --------------------------------------

  private handleUnexpectedDisconnect(deviceId: string): void {
    this.connectedDevice = null;
    if (this.expectingDisconnect) {
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    this.attemptReconnect(deviceId);
  }

  private attemptReconnect(deviceId: string): void {
    if (this.reconnectAttempt >= RECONNECT_BACKOFF_MS.length) {
      this.setState('disconnected');
      this.events.onError?.(new Error('Lost connection to AeroScan device and could not reconnect.'));
      return;
    }

    const delay = RECONNECT_BACKOFF_MS[this.reconnectAttempt];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(deviceId);
      } catch {
        this.attemptReconnect(deviceId);
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }

  // ---- native module access ------------------------------------------------

  private getNativeManager(): RNBleManager {
    let manager = this.nativeManager;
    if (!manager) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require keeps this module importable without the native module compiled in
      const { BleManager } = require('react-native-ble-plx');
      manager = new BleManager() as RNBleManager;
      this.nativeManager = manager;
    }
    return manager;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encodes a single byte (0-255) as base64, matching react-native-ble-plx's write API. */
function base64FromByte(value: number): string {
  const byte = Math.max(0, Math.min(255, Math.round(value)));
  return BASE64_CHARS[byte >> 2] + BASE64_CHARS[(byte & 0b11) << 4] + '==';
}
