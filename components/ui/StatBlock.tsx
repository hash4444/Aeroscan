import { Text, View } from 'react-native';

interface StatBlockProps {
  label: string;
  value: string;
  unit?: string;
}

export function StatBlock({ label, value, unit }: StatBlockProps) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-xs text-textSecondary">{label}</Text>
      <Text className="text-xl font-semibold text-text">
        {value}
        {unit ? <Text className="text-sm font-normal text-textSecondary"> {unit}</Text> : null}
      </Text>
    </View>
  );
}
