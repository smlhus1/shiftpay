/**
 * Class-name helper. Tiny re-export of clsx with a stable name so Pass 6b
 * can swap in `tailwind-merge` (or wrap clsx with NativeWind's variant
 * resolver) without touching every component.
 *
 * Usage:
 *
 *     <View className={cn("rounded-xl p-4", isActive && "bg-accent")} />
 */

import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export type { ClassValue };
