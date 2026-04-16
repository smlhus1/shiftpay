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
        // Dark palette — "Kveldsvakt Natt" (primary/default)
        dark: {
          bg: '#1A1614',       // warm coffee black
          surface: '#221D1A',
          elevated: '#2A2422',
        },
        // Light palette — "Kveldsvakt Morgen"
        app: {
          bg: '#F5EFE4',       // cream (was #FAFAF9)
          surface: '#FBF7ED',
          elevated: '#EFE7D5',
          border: 'rgba(26, 22, 20, 0.12)',
        },
        // Accent: burnt sienna family (replaces #3B82F6 blue)
        accent: '#8B3E23',        // deep terracotta (WCAG AA vs cream)
        'accent-dark': '#8B3E23', // alias — keeps `bg-accent-dark dark:bg-accent` usages valid
        'accent-mid': '#C65D3A',  // mid sienna for hover/active
        'accent-soft': '#E8A57C', // aftenhimmel / highlights
        warm: '#F4D58D',          // dempet oker (was #F59E0B)
        marine: '#1E2A3A',        // deep night blue (for shift-tint)
        'dark-border': 'rgba(245, 239, 228, 0.10)',
      },
      fontFamily: {
        // Kept for backward compat during migration. Typography migration
        // (phase 2) will add fraunces/inter-tight/jetbrains-mono families.
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
