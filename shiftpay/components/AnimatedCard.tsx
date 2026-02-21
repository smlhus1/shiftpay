import { type ReactNode } from "react";
import { MotiView } from "moti";

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function AnimatedCard({ children, index = 0, className }: AnimatedCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: "timing",
        duration: 350,
        delay: index * 80,
      }}
      className={className}
    >
      {children}
    </MotiView>
  );
}
