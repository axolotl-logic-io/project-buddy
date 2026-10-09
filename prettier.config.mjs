/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind 4 has no JS config; the plugin reads the theme from the CSS entry point.
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
