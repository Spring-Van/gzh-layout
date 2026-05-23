/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#07C160', // WeChat Green
        primaryHover: '#06AD56', // WeChat Green Dark
        surface: '#ffffff',
        background: '#f8fafc', // Slate 50
        borderColor: '#e2e8f0'
      }
    },
  },
  plugins: [],
}
