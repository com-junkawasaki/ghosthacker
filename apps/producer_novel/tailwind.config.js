/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Configuration
 * @id https://gftd.ai/config/tailwind
 * 
 * Tailwind CSS configuration for Next.js 14
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

