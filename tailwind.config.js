/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  // PrimeNG toggles dark mode by adding `.my-app-dark` to <html>; align Tailwind's
  // `dark:` variant with that selector instead of the OS `prefers-color-scheme`.
  darkMode: ['selector', '.my-app-dark'],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-primeui')],
};
