import { type ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

/**
 * Fade-in-from-below card. Originally implemented with moti, rewritten in
 * Pass 6b to drop the moti dep (~16 KB minified) — reanimated already
 * ships in this app for PressableScale and the SkeletonCard pulse, so
 * adding a moti layer was redundant.
 *
 * Honours `useReducedMotion` so users with the OS-level reduce-motion
 * preference set get a static View instead of the entrance animation.
 */
export function AnimatedCard({ children, index = 0, className }: AnimatedCardProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <View className={className}>{children}</View>;
  }
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(350)} className={className}>
      {children}
    </Animated.View>
  );
}
