/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Reasonal exact palette
        ink:   { DEFAULT: '#181D1F', 600: '#424647', 400: '#7d7d87' },
        coral: { DEFAULT: '#FD956D', light: '#FDDBCE', muted: '#F6E7CF' },
        sage:  { DEFAULT: '#D5E2DA', light: '#E4EED2' },
        sky:   { DEFAULT: '#15aeea', dark: '#037bb5' },
        cream: { DEFAULT: '#EAE4DC', light: '#F8F4EF', dark: '#D9D1C7' },
        plum:  { DEFAULT: '#D7CEF0' },
        blush: { DEFAULT: '#F4E1E1' },
        teal:  { DEFAULT: '#DCEEEF' },
      },
      fontFamily: {
        gabarito: ['Gabarito', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        archivo:  ['Archivo',  '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans:     ['Gabarito', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 4px 22px rgba(116,130,151,0.12)',
        lift: '0 8px 32px rgba(116,130,151,0.18)',
      },
    },
  },
  plugins: [],
}
