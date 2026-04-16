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
 *
 * Deep path imports are required — Metro does not tree-shake
 * `phosphor-react-native`'s barrel (~9000 icons × 6 weights).
 */

import { CameraIcon } from "phosphor-react-native/src/icons/Camera";
import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CaretUpIcon } from "phosphor-react-native/src/icons/CaretUp";
import { CaretDownIcon } from "phosphor-react-native/src/icons/CaretDown";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { DeviceMobileIcon } from "phosphor-react-native/src/icons/DeviceMobile";
import { DownloadSimpleIcon } from "phosphor-react-native/src/icons/DownloadSimple";
import { EnvelopeIcon } from "phosphor-react-native/src/icons/Envelope";
import { GithubLogoIcon } from "phosphor-react-native/src/icons/GithubLogo";
import { GearIcon } from "phosphor-react-native/src/icons/Gear";
import { MoonIcon } from "phosphor-react-native/src/icons/Moon";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { PlusCircleIcon } from "phosphor-react-native/src/icons/PlusCircle";
import { ScanIcon } from "phosphor-react-native/src/icons/Scan";
import { SlidersIcon } from "phosphor-react-native/src/icons/Sliders";
import { SunIcon } from "phosphor-react-native/src/icons/Sun";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { WalletIcon } from "phosphor-react-native/src/icons/Wallet";
import { type IconProps as PhosphorProps } from "phosphor-react-native";
import { type ComponentType } from "react";

/** Every Ionicons name used in the app, mapped to its Phosphor component. */
const MAP: Record<string, ComponentType<PhosphorProps>> = {
  add: PlusIcon,
  "add-circle-outline": PlusCircleIcon,
  "camera-outline": CameraIcon,
  checkmark: CheckIcon,
  "checkmark-circle": CheckCircleIcon,
  "chevron-back": CaretLeftIcon,
  "chevron-forward": CaretRightIcon,
  "chevron-up": CaretUpIcon,
  "chevron-down": CaretDownIcon,
  "download-outline": DownloadSimpleIcon,
  "logo-github": GithubLogoIcon,
  "mail-outline": EnvelopeIcon,
  "scan-outline": ScanIcon,
  "settings-outline": SlidersIcon,
  "time-outline": ClockIcon,
  "trash-outline": TrashIcon,
  "wallet-outline": WalletIcon,
  // Theme picker icons
  phone: DeviceMobileIcon,
  sun: SunIcon,
  moon: MoonIcon,
  // Alternate mappings for flexibility
  gear: GearIcon,
  sliders: SlidersIcon,
};

export type IconName = keyof typeof MAP | string;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: PhosphorProps["weight"];
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
}

export function Icon({ name, size = 24, color = "#000", weight = "duotone", ...rest }: IconProps) {
  const Component = MAP[name];
  if (!Component) {
    if (__DEV__) console.warn(`Icon: unknown name "${name}" — falling back to Sliders`);
    return <SlidersIcon size={size} color={color} weight={weight} />;
  }
  return <Component size={size} color={color} weight={weight} {...rest} />;
}
