import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 100: '#E4EAE8', 700: '#245A50', 900: '#173B35' },
        accent: { 500: '#E8B86D' },
        bg: '#F7F8F7',
        surface: '#FFFFFF',
        ink: '#202824',
        muted: '#69736D',
        line: '#E2E6E3',
        status: {
          available:   { fg: '#2E7D5B', bg: '#E6F4ED' },
          reserved:    { fg: '#8A5A00', bg: '#FBF0DC' },
          occupied:    { fg: '#173B35', bg: '#DCE6E2' },
          cleaning:    { fg: '#5B4A8F', bg: '#EDEAF7' },
          maintenance: { fg: '#B3261E', bg: '#FBEAE8' },
          inactive:    { fg: '#69736D', bg: '#EFF1EF' },
        },
      },
      borderRadius: { input: '8px', card: '12px', modal: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(32,40,36,0.06), 0 1px 3px rgba(32,40,36,0.04)',
        overlay: '0 12px 32px rgba(32,40,36,0.16)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;