/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#102A49',
          50: '#E8EDF3',
          100: '#C9D5E3',
          200: '#93AAC8',
          300: '#5E80AD',
          400: '#3A5E89',
          500: '#1F4068',
          600: '#163354',
          700: '#102A49',
          800: '#0A1D34',
          900: '#061425',
        },
        orange: {
          DEFAULT: '#E67620',
          50: '#FCEFE3',
          100: '#F8DCC3',
          200: '#F1B98C',
          300: '#EC974F',
          400: '#E67620',
          500: '#C85E10',
          600: '#B8460E',
          700: '#92350A',
          800: '#6D2708',
          900: '#4A1B05',
        },
        status: {
          critico: '#C81E3A',
          atencao: '#8A6404',
          saudavel: '#15803D',
        },
        surface: '#F4F5F7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 42, 73, 0.08), 0 1px 2px rgba(16, 42, 73, 0.06)',
        'card-hover': '0 4px 12px rgba(16, 42, 73, 0.12), 0 2px 4px rgba(16, 42, 73, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
