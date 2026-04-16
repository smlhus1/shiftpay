/**
 * Jest configuration for ShiftPay (Expo SDK 54 / RN 0.81 / TS).
 * See research/refactor/pass-0-test-infra.md for rationale.
 */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [
    "<rootDir>/jest-setup.ts",
    "expo-sqlite-mock/src/setup.ts",
  ],
  moduleNameMapper: {
    // Mirror tsconfig paths so Jest can resolve `@/*` imports.
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-worklets|moti|nativewind|phosphor-react-native|@testing-library/.*)",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/index.ts",
    "!lib/i18n/locales/*.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/android/",
    "/ios/",
    "/\\.expo/",
    "/__tests__/",
    "/__mocks__/",
    "/lib/i18n/locales/",
    "\\.d\\.ts$",
  ],
  // Pass 0 baseline thresholds — intentionally low so CI does not fail before
  // passes 1-7 add more tests. Each subsequent pass tightens these.
  coverageThreshold: {
    global: {
      branches: 3,
      functions: 10,
      lines: 10,
      statements: 10,
    },
    "./lib/calculations.ts": { branches: 85, lines: 90 },
    "./lib/dates.ts": { branches: 80, lines: 90 },
  },
  testTimeout: 10000,
  testPathIgnorePatterns: [
    "/node_modules/",
    "/android/",
    "/ios/",
    "/\\.expo/",
    "/\\.maestro/",
  ],
};
