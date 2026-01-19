/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilitar dark mode con clase
  theme: {
    extend: {
      colors: {
        // Colores para modo claro
        light: {
          bg: {
            primary: '#ffffff',
            secondary: '#f8f9fa',
            tertiary: '#f1f3f5',
            card: '#ffffff',
          },
          text: {
            primary: '#1a1a1a',
            secondary: '#4a4a4a',
            tertiary: '#6a6a6a',
          },
          border: {
            primary: '#e0e0e0',
            secondary: '#d0d0d0',
          }
        }
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}

