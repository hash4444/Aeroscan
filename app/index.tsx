import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/lib/store/authStore';
import { useDeviceStore } from '@/lib/store/deviceStore';
import { getOrCreateProfile } from '@/lib/supabase/queries';

/**
 * Entry redirect: auth -> onboarding (pairing) -> tabs home, gated on
 * Supabase auth state and whether the user has a paired device.
 */
export default function Index() {
  const session = useAuthStore((s) => s.session);
  const authInitialized = useAuthStore((s) => s.initialized);
  const [deviceResolved, setDeviceResolved] = useState(false);
  const [hasPairedDevice, setHasPairedDevice] = useState(false);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    (async () => {
      await getOrCreateProfile(session.user.id);
      const device = await useDeviceStore.getState().loadPairedDevice(session.user.id);
      if (cancelled) return;
      setHasPairedDevice(device != null);
      setDeviceResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!authInitialized || (session && !deviceResolved)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#F04E14" />
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;
  if (!hasPairedDevice) return <Redirect href="/onboarding/pairing" />;
  return <Redirect href="/(tabs)/home" />;
}
