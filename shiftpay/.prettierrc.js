/**
 * Prettier config for ShiftPay. Tailwind class sorter handles NativeWind via
 * `tailwindFunctions`; register any helper you use to tag class strings.
 */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindConfig: "./tailwind.config.js",
  tailwindFunctions: ["cn", "clsx", "classNames"],
};
