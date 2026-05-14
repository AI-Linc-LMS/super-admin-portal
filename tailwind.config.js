/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // AI Linc design tokens — single source of truth.
        ink: {
          0: 'rgb(var(--bg-0) / <alpha-value>)',
          1: 'rgb(var(--bg-1) / <alpha-value>)',
          2: 'rgb(var(--bg-2) / <alpha-value>)',
          3: 'rgb(var(--bg-3) / <alpha-value>)',
          4: 'rgb(var(--bg-4) / <alpha-value>)',
        },
        brand: {
          blue: '#2356d6',
          cyan: '#00e0ff',
          gold: '#ffc66d',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-2': 'rgb(var(--line-2) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          dim: 'rgb(var(--fg-dim) / <alpha-value>)',
          mute: 'rgb(var(--fg-mute) / <alpha-value>)',
        },

        // Legacy aliases — kept so existing pages keep compiling.
        // These resolve to brand tones so the look stays cohesive.
        primary: {
          50: '#e8f0fb',
          100: '#cddffa',
          200: '#9bbef5',
          300: '#6a9eef',
          400: '#3a7de7',
          500: '#2356d6',
          600: '#1c4abc',
          700: '#163d9c',
          800: '#0f2f7a',
          900: '#0a2158',
        },
        secondary: {
          50: '#e6fcff',
          100: '#b8f4ff',
          500: '#00e0ff',
          600: '#00b8d4',
          700: '#0091a7',
        },
        accent: {
          50: '#fff7e0',
          100: '#ffe9b0',
          500: '#ffc66d',
          600: '#e6a849',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ff5a6a',
          600: '#e64157',
          700: '#c8303f',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.06)',
          dark: 'rgba(5, 7, 15, 0.5)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        widest2: '0.22em',
        widest3: '0.32em',
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(90deg, #2356d6 0%, #00e0ff 100%)',
        'brand-grad-soft':
          'linear-gradient(135deg, rgba(35,86,214,0.18) 0%, rgba(0,224,255,0.12) 100%)',
        'tri-grad':
          'linear-gradient(120deg, #ffd071 0%, #00e0ff 60%, #2356d6 100%)',
      },
      // Shadows route through CSS vars so they flip per theme.
      // In light mode they become tight Apple-style elevations instead of
      // the bold dark/cyan halos used in dark mode.
      boxShadow: {
        glow: 'var(--shadow-glow)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-gold': 'var(--shadow-glow-gold)',
        glass: 'var(--shadow-card)',
        'glass-inset': 'var(--shadow-glass-inset)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
