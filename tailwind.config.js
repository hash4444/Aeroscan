/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // AeroScan is dark-only — these map directly to constants/theme.ts `Colors.dark`.
        background: '#0A0A0B',
        surface: '#161618',
        surfaceSelected: '#212225',
        border: '#262629',
        text: '#F5F5F6',
        textSecondary: '#9A9DA5',
        accent: '#F04E14',
        accentMuted: '#3A2014',
        success: '#34C97F',
        warning: '#F0B23E',
      },
    },
  },
  plugins: [],
};
