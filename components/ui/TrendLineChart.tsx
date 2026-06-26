import { Text, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

export interface TrendSeriesConfig {
  key: string;
  color: string;
  label: string;
}

interface TrendLineChartProps<T extends Record<string, number | null>> {
  title?: string;
  data: ({ x: number } & T)[];
  series: TrendSeriesConfig[];
  height?: number;
}

export function TrendLineChart<T extends Record<string, number | null>>({
  title,
  data,
  series,
  height = 180,
}: TrendLineChartProps<T>) {
  const hasData = data.length > 1;

  return (
    <View>
      {title ? (
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-text">{title}</Text>
          <View className="flex-row gap-3">
            {series.map((s) => (
              <View key={s.key} className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <Text className="text-[11px] text-textSecondary">{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ height }}>
        {hasData ? (
          <CartesianChart
            data={data}
            xKey="x"
            yKeys={series.map((s) => s.key) as unknown as never[]}
            domainPadding={{ left: 8, right: 8, top: 16, bottom: 16 }}
          >
            {({ points }) => (
              <>
                {series.map((s) => (
                  <Line
                    key={s.key}
                    points={points[s.key as keyof typeof points]}
                    color={s.color}
                    strokeWidth={2}
                    curveType="natural"
                    animate={{ type: 'timing', duration: 150 }}
                  />
                ))}
              </>
            )}
          </CartesianChart>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-textSecondary">Not enough data yet</Text>
          </View>
        )}
      </View>
    </View>
  );
}
