import { type ReactNode } from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: ReactNode;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  haptic?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  accessibilityRole?: "button" | "link" | "radio";
  accessibilityLabel?: string;
  accessibilityState?: Record<string, unknown>;
  hitSlop?: number;
}

export function PressableScale({
  onPress,
  onLongPress,
  children,
  className,
  style,
  disabled,
  haptic = true,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
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
    if (haptic) Haptics.impactAsync(hapticStyle);
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
