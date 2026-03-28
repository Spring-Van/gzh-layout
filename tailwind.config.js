/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Blue 600
        primaryHover: '#1d4ed8', // Blue 700
        surface: '#ffffff',
        background: '#f8fafc', // Slate 50
        borderColor: '#e2e8f0'
      }
    },
  },
  plugins: [],
}
