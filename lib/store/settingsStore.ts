import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Units } from '@/lib/supabase/types';

interface SettingsState {
  units: Units;
  setUnits: (units: Units) => void;
  /** Debug toggle: stream simulated sensor data instead of real BLE hardware. */
  useMockBle: boolean;
  setUseMockBle: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      units: 'metric',
      setUnits: (units) => set({ units }),
      useMockBle: __DEV__,
      setUseMockBle: (value) => set({ useMockBle: value }),
    }),
    {
      name: 'aeroscan-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
