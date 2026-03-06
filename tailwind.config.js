/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafafa', // Slightly warmer off-white for premium feel
        foreground: '#09090b', // Deep rich black-gray (zinc-950)
        primary: {
          DEFAULT: '#000000', // Noir aesthetic fallback
          hover: '#27272a', // Zinc 800
        },
        surface: '#ffffff', // Pure white for cards
        border: '#e4e4e7', // Zinc 200
        muted: {
          DEFAULT: '#f4f4f5', // Zinc 100
          foreground: '#71717a' // Zinc 500
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'], // For headers
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        'premium': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.03)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in-up-delay': 'fade-in-up 0.5s ease-out 0.15s forwards',
      }
    },
  },
  plugins: [],
}
