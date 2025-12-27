import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        syrian: {
          green: "hsl(var(--syrian-green))",
          "green-light": "hsl(var(--syrian-green-light))",
          "green-dark": "hsl(var(--syrian-green-dark))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
        'card-hover': 'var(--card-shadow-hover)',
        'glow': '0 4px 16px -4px hsl(var(--primary) / 0.5)',
        'glow-lg': '0 8px 24px -4px hsl(var(--primary) / 0.6)',
        'glow-xl': '0 16px 48px -8px hsl(var(--primary) / 0.4)',
        'soft': '0 2px 15px -3px hsl(var(--foreground) / 0.08), 0 4px 6px -2px hsl(var(--foreground) / 0.05)',
        'soft-lg': '0 10px 40px -10px hsl(var(--foreground) / 0.12)',
        'inner-glow': 'inset 0 1px 0 0 hsl(0 0% 100% / 0.1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(2deg)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-1deg)" },
          "50%": { transform: "rotate(1deg)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float": "float 5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "wiggle": "wiggle 0.3s ease-in-out",
        "gradient-shift": "gradient-shift 4s ease infinite",
      },
      lineHeight: {
        'relaxed-ar': '1.8',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'var(--mesh-gradient)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
