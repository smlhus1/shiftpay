/**
 * Prettier config for ShiftPay. Tailwind class sorter handles NativeWind via
 * `tailwindFunctions`; register any helper you use to tag class strings.
 */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
  // Windows devs get CRLF on checkout; Linux CI gets LF. "auto" accepts
  // whatever is on disk so format:check is stable across platforms.
  endOfLine: "auto",
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindConfig: "./tailwind.config.js",
  tailwindFunctions: ["cn", "clsx", "classNames"],
};
