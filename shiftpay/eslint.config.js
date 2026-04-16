/**
 * ESLint flat config for ShiftPay.
 *
 * Extends `eslint-config-expo/flat` which pins compatible versions of
 * typescript-eslint, react-hooks, and Expo-specific rules. Additional custom
 * rules added here.
 */
const expoConfig = require("eslint-config-expo/flat");
const unusedImports = require("eslint-plugin-unused-imports");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/",
      "android/",
      "ios/",
      ".expo/",
      "dist/",
      "coverage/",
      "__mocks__/",
      "*.config.js",
      "jest-setup.ts",
      "metro.config.js",
      "babel.config.js",
    ],
  },
  {
    // Rules that apply everywhere.
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Delete rather than warn — dead imports are pure noise.
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // TypeScript-specific rules. Scoped so @typescript-eslint plugin (loaded
    // for TS files by eslint-config-expo) is in scope here too.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Type imports are erased; enforce the `type` keyword for clarity and
      // so verbatimModuleSyntax stays happy.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // Prefer `unknown` to `any`; surface intent.
      "@typescript-eslint/no-explicit-any": "warn",

      // TS checks namespace member access more accurately than eslint-plugin-import's
      // resolver (which doesn't see module augmentation in types/*.d.ts). Disable
      // to avoid false positives on `FileSystem.EncodingType` etc.
      "import/namespace": "off",
    },
  },
  {
    // Test files: allow require() for dynamic module loading with jest.resetModules
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
