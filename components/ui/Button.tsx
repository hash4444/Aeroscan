import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-accent active:opacity-80', text: 'text-white' },
  secondary: { container: 'bg-surfaceSelected active:opacity-80', text: 'text-text' },
  ghost: { container: 'bg-transparent active:opacity-60', text: 'text-accent' },
  danger: { container: 'bg-transparent border border-border active:opacity-70', text: 'text-text' },
};

export function Button({ label, variant = 'primary', loading, disabled, className, ...rest }: ButtonProps) {
  const styles = variantClasses[variant];
  return (
    <Pressable
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-full px-6 py-4 ${styles.container} ${
        disabled || loading ? 'opacity-50' : ''
      } ${className ?? ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className={`text-base font-semibold ${styles.text}`}>{label}</Text>
      )}
    </Pressable>
  );
}
