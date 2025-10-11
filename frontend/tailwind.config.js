/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': '#000814',
        'secondary-bg': '#001d3d', 
        'tertiary-bg': '#003566',
        'accent': '#ffc300',
        'accent-light': '#ffd60a',
        'text-primary': '#ffd60a',
        'text-secondary': '#003566'
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Montserrat', 'Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'spin-slow': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      screens: {
        'xs': '320px',
        'sm': '640px', 
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px'
      }
    }
  },
  plugins: [],
}
