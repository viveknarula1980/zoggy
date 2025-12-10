import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
        extend: {
            colors: {
                background: "var(--color-background)",
                "background-secondary": "var(--color-background-secondary)",
                "neon-pink": "var(--color-neon-pink)",
                purple: "var(--color-purple)",
                "accent-glow": "var(--color-accent-glow)",
                light: "var(--color-light)",
                soft: "var(--color-soft)",
            },
            boxShadow: {
                glow: "var(--shadow-glow)",
            },
        },
    },
    plugins: [],
};

export default config;
