import { type ReactNode } from "react";
import { Pressable, type ViewStyle, type AccessibilityRole } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Haptic intent for a press.
 *  - "none"      no haptic (default — most buttons should not buzz)
 *  - "selection" toggles, radio groups, segmented controls
 *  - "success"   save / commit confirmations
 *  - "light"     opt-in subtle feedback (rare — pull-to-refresh, etc.)
 *  - "medium"    bigger commit, emphasis on completion
 */
export type HapticKind = "none" | "selection" | "success" | "light" | "medium";

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: ReactNode;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  haptic?: HapticKind;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: Record<string, unknown>;
  hitSlop?: number;
}

function fireHaptic(kind: HapticKind): void {
  switch (kind) {
    case "selection":
      void Haptics.selectionAsync().catch(() => {});
      return;
    case "success":
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    case "light":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    case "medium":
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      return;
    case "none":
      return;
  }
}

export function PressableScale({
  onPress,
  onLongPress,
  children,
  className,
  style,
  disabled,
  haptic = "none",
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
  hitSlop,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 1000, damping: 80 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 1000, damping: 80 });
  };

  const handlePress = () => {
    if (haptic !== "none") fireHaptic(haptic);
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      className={className}
      style={[animatedStyle, ...(Array.isArray(style) ? style : style ? [style] : [])]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={hitSlop}
    >
      {children}
    </AnimatedPressable>
  );
}
