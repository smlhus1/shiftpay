/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          elevated: '#334155',
        },
        app: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          elevated: '#F1F5F9',
          border: '#E2E8F0',
        },
        accent: '#38BDF8',
        'accent-dark': '#0284C7',
        warm: '#F59E0B',
        'dark-border': 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        display: ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
