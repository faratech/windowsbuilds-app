/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WindowsForum brand blues for product accents
        'windows': {
          '11': '#0f6cbd',
          '10': '#0078d4',
          'server': '#07426f',
          'edge': '#0078d7',
        },
        // Functional build-channel hues (kept distinguishable, slightly muted)
        'build': {
          'insider': '#5b2e91',
          'beta': '#0f6cbd',
          'dev': '#e65100',
          'canary': '#d9214e',
          'stable': '#1f8a5b',
          'release': '#1f8a5b',
        }
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'ripple': 'ripple 600ms linear',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        ripple: {
          to: {
            transform: 'translate(-50%, -50%) scale(40)',
            opacity: '0',
          },
        },
      }
    },
  },
  plugins: [],
}