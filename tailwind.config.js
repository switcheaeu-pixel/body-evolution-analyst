/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        teal: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        app: {
          bg: '#0f1117',
          surface: '#1a1d27',
          'surface-2': '#21253a',
          border: 'rgba(255,255,255,0.08)',
          primary: '#4f98a3',
          text: '#e2e8f0',
          'text-muted': '#8892a4',
          success: '#6daa45',
          warning: '#e8af34',
          error: '#d163a7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
