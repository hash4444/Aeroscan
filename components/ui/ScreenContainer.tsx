import type { PropsWithChildren } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenContainerProps extends PropsWithChildren {
  scroll?: boolean;
  className?: ViewProps['className'];
}

export function ScreenContainer({ scroll = true, className, children }: ScreenContainerProps) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Wrapper
        className={className}
        contentContainerClassName={scroll ? 'px-4 pb-10 pt-2 gap-4' : undefined}
        style={!scroll ? { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 16 } : undefined}
      >
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}
