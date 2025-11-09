import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D8F6E",
          50: "#ECF8F4",
          100: "#C4EDE1",
          200: "#9CE1CD",
          300: "#74D6BA",
          400: "#4CCBA7",
          500: "#24BF93",
          600: "#1D8F6E",
          700: "#166A52",
          800: "#0F4637",
          900: "#08231B"
        }
      }
    }
  },
  plugins: []
};
export default config;
