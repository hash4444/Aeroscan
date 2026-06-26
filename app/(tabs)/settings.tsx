import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { useDeviceStore } from '@/lib/store/deviceStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { supabase } from '@/lib/supabase/client';
import { updateUnits } from '@/lib/supabase/queries';

export default function Settings() {
  const session = useAuthStore((s) => s.session);
  const units = useSettingsStore((s) => s.units);
  const setUnits = useSettingsStore((s) => s.setUnits);
  const useMockBle = useSettingsStore((s) => s.useMockBle);
  const setUseMockBle = useSettingsStore((s) => s.setUseMockBle);
  const pairedDevice = useDeviceStore((s) => s.pairedDevice);
  const connectionState = useDeviceStore((s) => s.connectionState);

  const [signingOut, setSigningOut] = useState(false);

  async function toggleUnits(value: boolean) {
    const next = value ? 'imperial' : 'metric';
    setUnits(next);
    if (session) await updateUnits(session.user.id, next);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  function handleOtaPress() {
    // TODO(firmware): wire up to AEROSCAN_CHARACTERISTICS.OTA_CONTROL once
    // the firmware team confirms the DFU entry point (see lib/ble/constants.ts).
    Alert.alert('Firmware update', 'OTA updates are not available yet.');
  }

  return (
    <ScreenContainer>
      <Text className="pt-2 text-2xl font-bold text-text">Settings</Text>

      <Card>
        <Text className="mb-3 text-sm font-medium text-text">Mask</Text>
        {pairedDevice ? (
          <View className="gap-2">
            <Row label="Name" value={pairedDevice.name ?? pairedDevice.device_id} />
            <Row label="Size" value={pairedDevice.mask_size?.toUpperCase() ?? '—'} />
            <Row label="Firmware" value={pairedDevice.firmware_version ?? 'Unknown'} />
            <Row label="Status" value={connectionState} />
            <Button variant="ghost" label="Update firmware" onPress={handleOtaPress} className="mt-1" />
            <Button
              variant="secondary"
              label="Re-pair mask"
              onPress={() => router.push('/onboarding/pairing')}
            />
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-sm text-textSecondary">No mask paired yet.</Text>
            <Button label="Pair a mask" onPress={() => router.push('/onboarding/pairing')} />
          </View>
        )}
      </Card>

      <Card>
        <Text className="mb-3 text-sm font-medium text-text">Preferences</Text>
        <View className="flex-row items-center justify-between py-1">
          <Text className="text-sm text-text">Use imperial units</Text>
          <Switch
            value={units === 'imperial'}
            onValueChange={toggleUnits}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
          />
        </View>
        <View className="flex-row items-center justify-between py-1">
          <View className="flex-1 pr-2">
            <Text className="text-sm text-text">Mock BLE mode</Text>
            <Text className="text-xs text-textSecondary">Simulate sensor data without real hardware.</Text>
          </View>
          <Switch
            value={useMockBle}
            onValueChange={setUseMockBle}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.accent }}
          />
        </View>
      </Card>

      <Card>
        <Text className="mb-1 text-sm font-medium text-text">Account</Text>
        <Text className="mb-3 text-xs text-textSecondary">{session?.user.email}</Text>
        <Button variant="danger" label="Sign Out" onPress={handleSignOut} loading={signingOut} />
      </Card>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xs text-textSecondary">{label}</Text>
      <Text className="text-sm text-text">{value}</Text>
    </View>
  );
}
