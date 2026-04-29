/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",  // Inclut tous les fichiers HTML et TypeScript
    "./src/index.html",      // Fichier HTML principal
    "./src/app/**/*.{html,ts}",  // Composants dans app/
    "./src/app/pages/**/*.{html,ts}",  // Si vous avez des pages
    "./src/app/shared/**/*.{html,ts}"  // Si vous avez des composants partagés
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
