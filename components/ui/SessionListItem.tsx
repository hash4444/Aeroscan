import { Pressable, Text, View } from 'react-native';

interface SessionListItemProps {
  dateLabel: string;
  durationLabel: string;
  resistanceLevel: number | null;
  fatBurnIndex: number | null;
  breathingEfficiency: number | null;
  onPress?: () => void;
}

export function SessionListItem({
  dateLabel,
  durationLabel,
  resistanceLevel,
  fatBurnIndex,
  breathingEfficiency,
  onPress,
}: SessionListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4 active:opacity-70"
    >
      <View className="gap-1">
        <Text className="text-sm font-medium text-text">{dateLabel}</Text>
        <Text className="text-xs text-textSecondary">
          {durationLabel}
          {resistanceLevel != null ? ` · Resistance ${resistanceLevel}` : ''}
        </Text>
      </View>
      <View className="flex-row gap-4">
        <ScorePill label="Fat Burn" value={fatBurnIndex} />
        <ScorePill label="Breathing" value={breathingEfficiency} />
      </View>
    </Pressable>
  );
}

function ScorePill({ label, value }: { label: string; value: number | null }) {
  return (
    <View className="items-center">
      <Text className="text-base font-semibold text-text">{value == null ? '—' : Math.round(value)}</Text>
      <Text className="text-[10px] text-textSecondary">{label}</Text>
    </View>
  );
}
