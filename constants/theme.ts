import '@/global.css';

import { Platform } from 'react-native';

/**
 * AeroScan brand palette — dark, data-forward (Oura/WHOOP register), near-black
 * background with a single warm accent. Avoid clinical/medical color cues
 * (no red/green "vital sign" framing) per the non-diagnostic product constraint.
 */
export const Colors = {
  light: {
    text: '#0A0A0B',
    textSecondary: '#5B5F66',
    background: '#F7F7F8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFEFF1',
    border: '#E2E2E5',
    accent: '#F04E14',
    accentMuted: '#F8D9C9',
    success: '#2BB673',
    warning: '#E8A23A',
  },
  dark: {
    text: '#F5F5F6',
    textSecondary: '#9A9DA5',
    background: '#0A0A0B',
    backgroundElement: '#161618',
    backgroundSelected: '#212225',
    border: '#262629',
    accent: '#F04E14',
    accentMuted: '#3A2014',
    success: '#34C97F',
    warning: '#F0B23E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Fixed colors for sensor/score series in charts — stable across light/dark. */
export const ChartColors = {
  co2: '#5B8DEF',
  voc: '#B673E8',
  heartRate: '#F04E14',
  hrv: '#34C97F',
  respRate: '#F0B23E',
  fatBurnIndex: '#F04E14',
  breathingEfficiency: '#5B8DEF',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
