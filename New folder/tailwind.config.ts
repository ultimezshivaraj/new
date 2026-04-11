import type { Config } from 'tailwindcss'

const config: Config = {
  // Respect the data-theme="dark" attribute used in the original HTML
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Map every CSS variable from admin.html so Tailwind classes work
      colors: {
        bg:      'var(--bg)',
        bg2:     'var(--bg2)',
        bg3:     'var(--bg3)',
        border1: 'var(--border)',
        border2: 'var(--border2)',
        text1:   'var(--text)',
        text2:   'var(--text2)',
        text3:   'var(--text3)',
        text4:   'var(--text4)',
        accent:  'var(--accent-c)',
      },
      fontFamily: {
        sans: ["'DM Sans'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease forwards',
        'fade-in':  'fadeIn 0.2s ease forwards',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100px)', opacity: '0' },
          to:   { transform: 'translateX(0)',      opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
