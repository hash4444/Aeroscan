import { create } from 'zustand';

import { BleConnectionManager } from '@/lib/ble/BleConnectionManager';
import type { AeroScanDeviceInfo, ConnectionState, DiscoveredDevice, SensorSample } from '@/lib/ble/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { listDevices, pairDevice, touchDeviceConnection } from '@/lib/supabase/queries';
import type { DeviceRow, MaskSize } from '@/lib/supabase/types';

type SampleHandler = (sample: SensorSample) => void;

interface DeviceState {
  connectionState: ConnectionState;
  discoveredDevices: DiscoveredDevice[];
  connectedDeviceInfo: AeroScanDeviceInfo | null;
  pairedDevice: DeviceRow | null;
  error: string | null;

  isScanning: boolean;
  startScan: () => void;
  stopScan: () => void;
  connectAndPair: (params: { userId: string; device: DiscoveredDevice; maskSize: MaskSize }) => Promise<DeviceRow>;
  disconnect: () => Promise<void>;
  setResistanceLevel: (level: number) => Promise<void>;
  setPairedDevice: (device: DeviceRow | null) => void;
  loadPairedDevice: (userId: string) => Promise<DeviceRow | null>;

  /** Used by the active session to receive every incoming sample. */
  subscribeSamples: (handler: SampleHandler) => () => void;
}

let manager: BleConnectionManager | null = null;
let stopScanFn: (() => void) | null = null;
const sampleHandlers = new Set<SampleHandler>();

function getManager(mock: boolean): BleConnectionManager {
  if (!manager) {
    manager = new BleConnectionManager(
      {
        onConnectionStateChange: (state) => useDeviceStore.setState({ connectionState: state }),
        onSample: (sample) => sampleHandlers.forEach((handler) => handler(sample)),
        onError: (error) => useDeviceStore.setState({ error: error.message }),
      },
      { mock },
    );
  }
  return manager;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  connectionState: 'disconnected',
  discoveredDevices: [],
  connectedDeviceInfo: null,
  pairedDevice: null,
  error: null,
  isScanning: false,

  startScan: () => {
    const m = getManager(useSettingsStore.getState().useMockBle);
    set({ discoveredDevices: [], isScanning: true, error: null });
    stopScanFn = m.startScan((device) => {
      set((state) => {
        if (state.discoveredDevices.some((d) => d.id === device.id)) return state;
        return { discoveredDevices: [...state.discoveredDevices, device] };
      });
    });
  },

  stopScan: () => {
    stopScanFn?.();
    stopScanFn = null;
    set({ isScanning: false });
  },

  connectAndPair: async ({ userId, device, maskSize }) => {
    const m = getManager(useSettingsStore.getState().useMockBle);
    get().stopScan();

    const info = await m.connect(device.id);
    set({ connectedDeviceInfo: info });

    const row = await pairDevice({
      userId,
      deviceId: info.deviceId,
      name: device.name ?? undefined,
      maskSize,
      firmwareVersion: info.firmwareVersion ?? undefined,
    });
    set({ pairedDevice: row });
    return row;
  },

  disconnect: async () => {
    await manager?.disconnect();
    set({ connectedDeviceInfo: null });
  },

  setResistanceLevel: async (level) => {
    await manager?.setResistanceLevel(level);
  },

  setPairedDevice: (device) => set({ pairedDevice: device }),

  loadPairedDevice: async (userId) => {
    const devices = await listDevices(userId);
    const device = devices[0] ?? null;
    set({ pairedDevice: device });
    return device;
  },

  subscribeSamples: (handler) => {
    sampleHandlers.add(handler);
    return () => sampleHandlers.delete(handler);
  },
}));

export async function reconnectToPairedDevice(pairedDevice: DeviceRow, mock: boolean): Promise<void> {
  const m = getManager(mock);
  const info = await m.connect(pairedDevice.device_id);
  useDeviceStore.setState({ connectedDeviceInfo: info });
  await touchDeviceConnection(pairedDevice.id);
}
