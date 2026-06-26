import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useDeviceStore } from '@/lib/store/deviceStore';
import { useSettingsStore } from '@/lib/store/settingsStore';

export default function Pairing() {
  const isScanning = useDeviceStore((s) => s.isScanning);
  const discoveredDevices = useDeviceStore((s) => s.discoveredDevices);
  const startScan = useDeviceStore((s) => s.startScan);
  const stopScan = useDeviceStore((s) => s.stopScan);
  const useMockBle = useSettingsStore((s) => s.useMockBle);

  useEffect(() => {
    startScan();
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenContainer>
      <View className="gap-2 pt-4">
        <Text className="text-2xl font-bold text-text">Pair your AeroScan</Text>
        <Text className="text-sm text-textSecondary">
          Power on your mask and keep it nearby. We&apos;ll scan for it over Bluetooth.
        </Text>
        {useMockBle ? (
          <Text className="text-xs text-warning">Mock BLE mode is on — showing a simulated device.</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2 py-2">
        {isScanning ? <ActivityIndicator color="#F04E14" /> : null}
        <Text className="text-sm text-textSecondary">{isScanning ? 'Scanning…' : 'Scan stopped'}</Text>
      </View>

      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerClassName="gap-2"
        ListEmptyComponent={
          !isScanning ? <Text className="text-sm text-textSecondary">No devices found yet.</Text> : null
        }
        renderItem={({ item }) => (
          <Button
            variant="secondary"
            label={item.name ?? item.id}
            onPress={() =>
              router.push({
                pathname: '/onboarding/mask-size',
                params: { deviceId: item.id, deviceName: item.name ?? '' },
              })
            }
          />
        )}
      />

      <Button variant="ghost" label="Rescan" onPress={startScan} disabled={isScanning} />
    </ScreenContainer>
  );
}
