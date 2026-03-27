/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--color-text)',
        'app-muted': 'var(--color-text-muted)',
        'app-soft': 'var(--color-text-soft)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-strong': 'var(--color-surface-strong)',
        canvas: 'var(--color-bg)',
        'canvas-elevated': 'var(--color-bg-elevated)',
        border: {
          default: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
          950: 'var(--color-accent-950)',
        },
      },
      borderRadius: {
        soft: 'var(--radius-sm)',
        panel: 'var(--radius-md)',
        hero: 'var(--radius-lg)',
      },
      boxShadow: {
        'panel-sm': 'var(--shadow-sm)',
        panel: 'var(--shadow-md)',
        hero: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
