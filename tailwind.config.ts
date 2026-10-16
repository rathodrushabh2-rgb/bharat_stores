import type { Config } from "tailwindcss";

// Palette from the approved design: saffron for actions, leaf green for money in, rose for dues.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#FFF1E8", 100: "#FFE8D9", 500: "#E5631C", 600: "#C84B11", 700: "#9A3409" },
        ink: "#1C2230",
        muted: "#5B6472",
        line: "#D9DCD2",
        ground: "#F4F5EF",
        green: { 50: "#E3F4EA", 100: "#CDEBD9", 600: "#1A7F4B", 700: "#145C37" },
        red: { 50: "#FDECEA", 100: "#F9D3CF", 600: "#B42318", 700: "#8F1D14" },
        blue: { 50: "#E6EEFF", 100: "#D3E0FF", 600: "#2B59C3", 700: "#1E428F" },
        purple: { 50: "#F0EAFE", 100: "#E3D8FC", 300: "#CDBDF5", 400: "#A88BEA", 600: "#6D3FD1", 700: "#4B2A99", 800: "#4B2A99" },
        amber: { 50: "#FFF4D6", 100: "#FFE3B3", 600: "#B26B00", 700: "#8A4B00", 800: "#7A4A00" },
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
      },
      borderRadius: { "4xl": "1.75rem" },
    },
  },
  plugins: [],
} satisfies Config;
