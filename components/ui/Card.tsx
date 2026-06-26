import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends PropsWithChildren {
  className?: ViewProps['className'];
}

export function Card({ className, children }: CardProps) {
  return (
    <View className={`rounded-2xl bg-surface p-4 border border-border ${className ?? ''}`}>
      {children}
    </View>
  );
}
