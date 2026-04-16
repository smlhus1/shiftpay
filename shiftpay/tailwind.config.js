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
        // Inter Tight — body sans (tighter than Inter, less generic)
        inter: ['InterTight_400Regular'],
        'inter-medium': ['InterTight_500Medium'],
        'inter-semibold': ['InterTight_600SemiBold'],
        'inter-bold': ['InterTight_700Bold'],
        // Fraunces — display serif for headings and margin-notes
        display: ['Fraunces_700Bold'],
        fraunces: ['Fraunces_400Regular'],
        'fraunces-italic': ['Fraunces_400Regular_Italic'],
        'fraunces-italic-mid': ['Fraunces_500Medium_Italic'],
        'fraunces-semi': ['Fraunces_600SemiBold'],
        'fraunces-bold': ['Fraunces_700Bold'],
        // JetBrains Mono — tabular-nums for amounts, times, rates
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
