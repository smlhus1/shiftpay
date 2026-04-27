/**
 * Imperative TalkBack / VoiceOver announcement helpers.
 *
 * Why imperative: under React Native's new architecture (Fabric),
 * `accessibilityLiveRegion` does not reliably trigger an announcement
 * when the text inside the live region changes. The cross-platform fix
 * is to call `AccessibilityInfo.announceForAccessibility(message)` at
 * the moment the user-relevant change happens. App.json has
 * `newArchEnabled: true`, so every install runs Fabric — pure imperative
 * is the right shape for us.
 */

import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/** One-shot: announce the message right now (no-op on web). */
export function announce(message: string | null | undefined): void {
  if (!message) return;
  if (Platform.OS === "web") return;
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Announce whenever `message` flips from null/undefined/empty to a
 * non-empty string, OR when the string changes. Use for live regions
 * like loading progress, save-confirmations, and error banners.
 *
 * Pass `null`/`undefined`/`""` to suppress.
 */
export function useAnnounceWhen(message: string | null | undefined): void {
  useEffect(() => {
    if (message) announce(message);
  }, [message]);
}
