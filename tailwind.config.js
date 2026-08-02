/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 保留现有主品牌色
        primary: '#07C160',
        primaryHover: '#06AD56',
        // 语义色（响应主题 CSS 变量）
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        'input-bg': 'var(--bg-input)',
        background: 'var(--bg-app)',
        borderColor: 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
      },
      backgroundImage: {
        'accent-gradient': 'var(--accent-gradient)',
        'app-bg': 'var(--bg-app)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
}
