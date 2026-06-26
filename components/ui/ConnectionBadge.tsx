import { Text, View } from 'react-native';

import type { ConnectionState } from '@/lib/ble/types';

const LABELS: Record<ConnectionState, string> = {
  disconnected: 'Disconnected',
  scanning: 'Scanning…',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
};

const DOT_CLASSES: Record<ConnectionState, string> = {
  disconnected: 'bg-textSecondary',
  scanning: 'bg-warning',
  connecting: 'bg-warning',
  connected: 'bg-success',
  reconnecting: 'bg-warning',
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full bg-surfaceSelected px-3 py-1.5">
      <View className={`h-2 w-2 rounded-full ${DOT_CLASSES[state]}`} />
      <Text className="text-xs text-text">{LABELS[state]}</Text>
    </View>
  );
}
