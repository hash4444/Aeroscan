import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ScoreRingProps {
  /** 0-100 relative score — never a raw clinical value. */
  value: number | null;
  label: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export function ScoreRing({ value, label, color, size = 120, strokeWidth = 10 }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = value == null ? 0 : Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);

  return (
    <View className="items-center" style={{ width: size }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#262629"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            fill="none"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-2xl font-bold text-text">{value == null ? '—' : Math.round(value)}</Text>
        </View>
      </View>
      <Text className="mt-2 text-center text-xs text-textSecondary">{label}</Text>
    </View>
  );
}
