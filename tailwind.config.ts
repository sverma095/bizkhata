import type { Config } from "tailwindcss";
const config: Config = { darkMode: ["class"], content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"], theme: { extend: { borderRadius: { xl: "1rem", "2xl": "1.5rem" } } }, plugins: [require("tailwindcss-animate")] };
export default config;
