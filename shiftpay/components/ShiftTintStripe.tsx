/**
 * ShiftTintStripe — 3px vertical line on the left edge of the app, colored
 * by time of day. Signature element from DESIGN.md §11.
 *
 *   06:00–11:59 → myk oker     (tidlig)
 *   12:00–15:59 → cream        (mellom, usynlig på lys bg)
 *   16:00–21:59 → burnt sienna (kveld)
 *   22:00–05:59 → dyp marine   (natt)
 *
 * The color is computed once at mount. It's subtle — most users won't
 * register it consciously, but it grounds the app in Kari's workday.
 */

import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme-context";

type ShiftPhase = "morning" | "midday" | "evening" | "night";

function currentPhase(now = new Date()): ShiftPhase {
  const h = now.getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 16) return "midday";
  if (h < 22) return "evening";
  return "night";
}

export function ShiftTintStripe() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const phase = useMemo(currentPhase, []);

  const tint = useMemo(() => {
    switch (phase) {
      case "morning":
        return colors.warm; // dempet oker
      case "evening":
        return colors.accentMuted; // burnt sienna
      case "night":
        return colors.marine; // dyp marine
      case "midday":
      default:
        return "transparent"; // skip mid-day — lys på lys = usynlig
    }
  }, [phase, colors]);

  if (tint === "transparent") return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.stripe, { backgroundColor: tint, top: insets.top, bottom: insets.bottom }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  stripe: {
    position: "absolute",
    left: 0,
    width: 3,
    zIndex: 100,
  },
});
