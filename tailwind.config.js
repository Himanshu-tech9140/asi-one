/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: { 950: '#F8FAFC', 900: '#FFFFFF', 850: '#FFFFFF', 800: '#F1F5F9', 700: '#E2E8F0' },
        accent: { DEFAULT: '#DC2626', soft: '#B91C1C' },
        medical: { navy: '#0F172A', muted: '#64748B', success: '#16A34A', info: '#2563EB' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: { card: '0 2px 8px rgba(15, 23, 42, 0.05)', soft: '0 8px 24px rgba(15, 23, 42, 0.08)' },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        fadeUp: 'fadeUp 0.4s ease-out both',
        slideInLeft: 'slideInLeft 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
