/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#08090c',
          900: '#0d0f14',
          850: '#11141b',
          800: '#161a23',
          700: '#1c212c',
        },
        accent: {
          DEFAULT: '#4f8cff',
          soft: '#6ea4ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glow: '0 0 24px -6px rgba(79,140,255,0.45)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -20px rgba(0,0,0,0.8)',
      },
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
      },
      animation: {
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        fadeUp: 'fadeUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
