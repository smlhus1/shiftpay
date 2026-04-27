/**
 * Drop-in replacement for `<TextInput>` that wires theme-aware
 * cursorColor + selectionColor. Without these, the cursor renders in the
 * Android system accent (often a clashing blue) instead of ShiftPay's
 * blue accent token, and selection-handle rectangles use the system
 * default which has poor contrast on dark mode.
 *
 * All other TextInput props are forwarded unchanged. Pass `cursorColor`
 * or `selectionColor` explicitly to override the theme defaults.
 */

import { TextInput, type TextInputProps } from "react-native";
import { useThemeColors } from "@/lib/theme-context";

export function ThemedTextInput(props: TextInputProps) {
  const colors = useThemeColors();
  return <TextInput cursorColor={colors.accent} selectionColor={colors.accent} {...props} />;
}
