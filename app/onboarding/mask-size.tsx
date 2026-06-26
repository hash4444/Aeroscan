import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuthStore } from '@/lib/store/authStore';
import { useDeviceStore } from '@/lib/store/deviceStore';
import type { MaskSize } from '@/lib/supabase/types';

const SIZES: { value: MaskSize; label: string }[] = [
  { value: 's', label: 'Small' },
  { value: 'm', label: 'Medium' },
  { value: 'l', label: 'Large' },
];

export default function MaskSizeScreen() {
  const { deviceId, deviceName } = useLocalSearchParams<{ deviceId: string; deviceName?: string }>();
  const session = useAuthStore((s) => s.session);
  const connectAndPair = useDeviceStore((s) => s.connectAndPair);

  const [maskSize, setMaskSize] = useState<MaskSize>('m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!session || !deviceId) return;
    setLoading(true);
    setError(null);
    try {
      await connectAndPair({
        userId: session.user.id,
        device: { id: deviceId, name: deviceName ?? null, rssi: null },
        maskSize,
      });
      router.replace('/(tabs)/home');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-1 justify-center gap-6">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-text">Confirm mask size</Text>
          <Text className="text-sm text-textSecondary">
            Pairing {deviceName || deviceId}. This helps tune the resistance scale for your mask.
          </Text>
        </View>

        <View className="flex-row gap-3">
          {SIZES.map((size) => (
            <Button
              key={size.value}
              label={size.label}
              variant={maskSize === size.value ? 'primary' : 'secondary'}
              onPress={() => setMaskSize(size.value)}
              className="flex-1"
            />
          ))}
        </View>

        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        <Button label="Confirm & Pair" onPress={confirm} loading={loading} />
      </View>
    </ScreenContainer>
  );
}
