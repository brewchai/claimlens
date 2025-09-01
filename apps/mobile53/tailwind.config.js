/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  // NativeWind preset (recommended)
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
