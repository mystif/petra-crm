/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tmavé plochy doorSTEP navy (sidebar + box s asistentkou): #0A1B34 / #06111F
        ink: {
          DEFAULT: '#0A1B34',
          soft: '#06111F',
          line: '#1E3150'
        },
        // Měděná paleta doorSTEP (gradient #96581F → #D08B4F, hover #E0A36F)
        gold: {
          DEFAULT: '#D08B4F',
          soft: '#F7EBDF',
          dark: '#96581F',
          hover: '#E0A36F'
        },
        canvas: '#F5F6FA',
        surface: '#FFFFFF',
        line: '#E7E9F1',
        // Akcent aplikace = měděná doorSTEP; dark = čitelný text na světlém
        brand: {
          DEFAULT: '#D08B4F',
          strong: '#B8763C',
          soft: '#F7EBDF',
          dark: '#96581F'
        },
        emerald: { DEFAULT: '#0FA968', soft: '#E3F6EE' },
        amber: { DEFAULT: '#E8920C', soft: '#FCF1DD' },
        rose: { DEFAULT: '#E5484D', soft: '#FBE5E6' },
        sky: { DEFAULT: '#3B8EF0', soft: '#E5F0FD' },
         tx: {
          DEFAULT: '#0A1B34',
          soft: '#6B7180',
          faint: '#9AA0B0'
        }
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
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
