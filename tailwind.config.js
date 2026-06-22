/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14172A',
          soft: '#1E2238',
          line: '#2A2F4A'
        },
        canvas: '#F5F6FA',
        surface: '#FFFFFF',
        line: '#E7E9F1',
        brand: {
          DEFAULT: '#5B5BD6',
          strong: '#4B47C9',
          soft: '#ECECFB'
        },
        emerald: { DEFAULT: '#0FA968', soft: '#E3F6EE' },
        amber: { DEFAULT: '#E8920C', soft: '#FCF1DD' },
        rose: { DEFAULT: '#E5484D', soft: '#FBE5E6' },
        sky: { DEFAULT: '#3B8EF0', soft: '#E5F0FD' },
         tx: {
          DEFAULT: '#1A1D2E',
          soft: '#6B7180',
          faint: '#9AA0B0'
        }
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,23,42,.04), 0 4px 16px rgba(20,23,42,.06)',
        lift: '0 8px 30px rgba(20,23,42,.12)',
        glow: '0 0 0 1px rgba(91,91,214,.4), 0 8px 24px rgba(91,91,214,.25)'
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px'
      }
    }
  },
  plugins: []
}
