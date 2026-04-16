/**
 * Jest setup for ShiftPay. Runs after jest-expo preset.
 * See research/refactor/pass-0-test-infra.md §1 for the rationale behind each patch.
 */

// Reanimated 4 + worklets require test mocks — the real module's init runs a
// peer-version check against react-native-worklets that fails under the current
// pinned combo (reanimated 4.2.2 expects worklets 0.7.x, installed is 0.8.x).
// Use reanimated's bundled JS mock to short-circuit the whole native init.
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));

// expo-router testing-library exposes its own mocks for navigation.
// Import path varies across expo-router versions; wrapped in try/catch so missing
// module does not block the whole suite.
try {
  require("expo-router/testing-library/mocks");
} catch {
  // expo-router testing-library not installed yet — fine for lib-only tests.
}

// jest-expo ships a partial mock for expo-crypto where getRandomValues returns
// all zeros. That breaks any UUID v4 generator (lib/db.ts), so patch with the
// Node crypto equivalent.
jest.mock("expo-crypto", () => {
  const actual = jest.requireActual("expo-crypto");
  const nodeCrypto = require("crypto");
  return {
    ...actual,
    getRandomValues: (arr: Uint8Array) => {
      nodeCrypto.randomFillSync(arr);
      return arr;
    },
  };
});

// expo-font: components that use useFonts() would throw on native call.
jest.mock("expo-font", () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// NativeWind useColorScheme — only needed if consumed directly from components.
jest.mock("nativewind", () => ({
  useColorScheme: () => ({ colorScheme: "light", setColorScheme: jest.fn() }),
  colorScheme: { set: jest.fn(), get: jest.fn(() => "light") },
  cssInterop: (c: unknown) => c,
  remapProps: (c: unknown) => c,
}));

// Force the JS timezone to Oslo so tests are deterministic across CI/local.
// calculations.ts/dates.ts rely on getDay() and Date parsing to agree with
// the user's actual wall clock.
process.env.TZ = "Europe/Oslo";
