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
          bg: '#0C0A09',
          surface: '#1C1917',
          elevated: '#292524',
        },
        app: {
          bg: '#FAFAF9',
          surface: '#FFFFFF',
          elevated: '#F5F5F4',
          border: '#E7E5E4',
        },
        accent: '#3B82F6',
        'accent-dark': '#1D4ED8',
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
