/**
 * Ambient module augmentation for `expo-file-system` (SDK 54).
 *
 * SDK 54 promoted the new class-based API (File, Paths) to the root export.
 * Types for the legacy functional surface (readAsStringAsync, writeAsStringAsync,
 * cacheDirectory, documentDirectory, EncodingType) are still shipped at the root
 * — but the 54.0.x release dropped them from the barrel .d.ts. This shim adds
 * the legacy symbols back, so code that still uses them type-checks.
 *
 * Pass 5 migrates lib/csv.ts to the class-based API, after which this shim
 * can be removed.
 */
declare module "expo-file-system" {
  export const cacheDirectory: string | null;
  export const documentDirectory: string | null;

  export const EncodingType: {
    readonly UTF8: "utf8";
    readonly Base64: "base64";
  };

  export interface LegacyReadOptions {
    encoding?: "utf8" | "base64";
    position?: number;
    length?: number;
  }

  export function readAsStringAsync(fileUri: string, options?: LegacyReadOptions): Promise<string>;

  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: LegacyReadOptions
  ): Promise<void>;

  export function getInfoAsync(
    fileUri: string,
    options?: { md5?: boolean; size?: boolean }
  ): Promise<{
    exists: boolean;
    uri: string;
    size?: number;
    isDirectory: boolean;
    modificationTime?: number;
    md5?: string;
  }>;

  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
}
