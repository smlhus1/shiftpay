/**
 * Icon — drop-in wrapper around Phosphor Duotone, matching the Ionicons name API
 * we used throughout the app. Mapping is curated per DESIGN.md §9.2.
 *
 * Why Phosphor Duotone? More geometric character than Ionicons, softer than
 * Lucide, open MIT license. Duotone weight gives the app a distinctive
 * signature feel without being loud.
 *
 * Usage — identical to Ionicons:
 *   <Icon name="camera-outline" size={20} color={colors.accent} />
 *   <Icon name="chevron-forward" size={16} />
 *
 * Add new icons by extending the MAP below.
 */

import {
  Camera,
  Check,
  CheckCircle,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  Clock,
  DeviceMobile,
  DownloadSimple,
  Envelope,
  GithubLogo,
  Gear,
  Moon,
  Plus,
  PlusCircle,
  Scan,
  Sliders,
  Sun,
  Trash,
  Wallet,
  type IconProps as PhosphorProps,
} from "phosphor-react-native";
import { ComponentType } from "react";

/** Every Ionicons name used in the app, mapped to its Phosphor component. */
const MAP: Record<string, ComponentType<PhosphorProps>> = {
  add: Plus,
  "add-circle-outline": PlusCircle,
  "camera-outline": Camera,
  checkmark: Check,
  "checkmark-circle": CheckCircle,
  "chevron-back": CaretLeft,
  "chevron-forward": CaretRight,
  "chevron-up": CaretUp,
  "chevron-down": CaretDown,
  "download-outline": DownloadSimple,
  "logo-github": GithubLogo,
  "mail-outline": Envelope,
  "scan-outline": Scan,
  "settings-outline": Sliders,
  "time-outline": Clock,
  "trash-outline": Trash,
  "wallet-outline": Wallet,
  // Theme picker icons
  phone: DeviceMobile,
  sun: Sun,
  moon: Moon,
  // Alternate mappings for flexibility
  gear: Gear,
  sliders: Sliders,
};

export type IconName = keyof typeof MAP | string;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: PhosphorProps["weight"];
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
}

export function Icon({
  name,
  size = 24,
  color = "#000",
  weight = "duotone",
  ...rest
}: IconProps) {
  const Component = MAP[name];
  if (!Component) {
    if (__DEV__) console.warn(`Icon: unknown name "${name}" — falling back to Sliders`);
    return <Sliders size={size} color={color} weight={weight} />;
  }
  return <Component size={size} color={color} weight={weight} {...rest} />;
}
