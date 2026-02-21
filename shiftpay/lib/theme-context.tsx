import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { lightColors, darkColors, type ThemeColors } from "./theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  colors: ThemeColors;
}

const STORAGE_KEY = "shiftpay_theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === "light" || val === "dark" || val === "system") {
          setPreferenceState(val);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  // Resolve theme
  const resolved: ResolvedTheme =
    preference === "system"
      ? (systemScheme === "light" ? "light" : "dark")
      : preference;

  // Sync NativeWind
  useEffect(() => {
    if (!loaded) return;
    colorScheme.set(resolved);
  }, [resolved, loaded]);

  const themeColors = resolved === "dark" ? darkColors : lightColors;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ theme: resolved, preference, setPreference, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
