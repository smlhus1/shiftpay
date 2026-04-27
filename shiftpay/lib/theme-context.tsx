import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme } from "nativewind";
import { getString, migrateAsyncStorageKey, setString } from "./storage";
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

function isThemePref(v: string): v is ThemePreference {
  return v === "system" || v === "light" || v === "dark";
}

/**
 * Read the persisted preference synchronously from MMKV. Returns
 * "system" if MMKV is empty (first boot, or pre-migration before the
 * effect-triggered AsyncStorage drain has run).
 */
function readInitialPreference(): ThemePreference {
  const v = getString(STORAGE_KEY);
  return v && isThemePref(v) ? v : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  // Sync MMKV read at component init — no `loaded` flag, no null first
  // render, no theme flash on subsequent boots. The first boot AFTER
  // upgrading from AsyncStorage may briefly render "system" before the
  // migration effect below pulls in the persisted value.
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference);

  useEffect(() => {
    let cancelled = false;
    void migrateAsyncStorageKey<ThemePreference>(STORAGE_KEY, (raw) =>
      isThemePref(raw) ? raw : null
    ).then((migrated) => {
      if (!cancelled && migrated) setPreferenceState(migrated);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    setString(STORAGE_KEY, p);
  }, []);

  // Resolve theme
  const resolved: ResolvedTheme =
    preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;

  // Sync NativeWind whenever the resolved theme changes.
  useEffect(() => {
    colorScheme.set(resolved);
  }, [resolved]);

  const themeColors = resolved === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{ theme: resolved, preference, setPreference, colors: themeColors }}
    >
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
