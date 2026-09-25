/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FCF7F2",
          deep: "#F4EAE1",
        },
        blush: {
          DEFAULT: "#E39C8E",
          light: "#F6DCD4",
          deep: "#C97C6C",
        },
        skin: {
          DEFAULT: "#8A6E5C",
          light: "#B39A88",
        },
        brush: {
          DEFAULT: "#D8C0AE",
        },
      },
      maxWidth: {
        mobile: "430px",
      },
    },
  },
  plugins: [],
};
