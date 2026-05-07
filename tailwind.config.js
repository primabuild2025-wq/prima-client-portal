/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#11144C',
        surface: '#000000',
        background: '#11144C',
        text: '#FFFFFF'
      }
    }
  },
  plugins: []
};
