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
        'windows': {
          '11': '#0078D4',
          '10': '#00BCF2',
          'server': '#5E2E91',
          'edge': '#0078D7',
        },
        'build': {
          'insider': '#FFC107',
          'beta': '#17A2B8',
          'dev': '#28A745',
          'canary': '#DC3545',
          'stable': '#28A745',
          'release': '#6F42C1',
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