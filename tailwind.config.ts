import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
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
      // ─── Typography ────────────────────────────────────────────────────
      // Geist Mono for data/code, Geist for UI, DM Sans for body text
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
        snug: "-0.01em",
        widest: "0.16em",
      },

      // ─── Colors ────────────────────────────────────────────────────────
      colors: {
        // shadcn/radix primitives — still driven by CSS vars
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

        // ── Dashboard surface scale (dark-first)
        // Use: surface-0 (base page) → surface-4 (floating panels)
        surface: {
          "0": "hsl(224 14% 6%)",   // page background
          "1": "hsl(224 13% 9%)",   // sidebar / nav
          "2": "hsl(224 12% 12%)",  // cards
          "3": "hsl(224 11% 16%)",  // elevated cards, dropdowns
          "4": "hsl(224 10% 20%)",  // tooltips, popovers
        },

        // ── Accent — electric indigo (replaces generic blue)
        indigo: {
          "50": "hsl(236 100% 97%)",
          "100": "hsl(236 96%  93%)",
          "200": "hsl(236 92%  85%)",
          "300": "hsl(236 88%  74%)",
          "400": "hsl(236 84%  63%)",
          "500": "hsl(236 80%  54%)",  // primary action
          "600": "hsl(236 76%  46%)",
          "700": "hsl(236 72%  38%)",
          "800": "hsl(236 68%  28%)",
          "900": "hsl(236 64%  18%)",
          glow: "hsl(236 80% 54% / 0.25)",
        },

        // ── Semantic status colors (dashboard-grade)
        success: {
          DEFAULT: "hsl(158 64% 52%)",
          subtle: "hsl(158 64% 52% / 0.12)",
          foreground: "hsl(158 64% 18%)",
        },
        warning: {
          DEFAULT: "hsl(38 92% 56%)",
          subtle: "hsl(38 92% 56% / 0.12)",
          foreground: "hsl(38 92% 18%)",
        },
        danger: {
          DEFAULT: "hsl(4 86% 58%)",
          subtle: "hsl(4 86% 58% / 0.12)",
          foreground: "hsl(4 86% 18%)",
        },
        info: {
          DEFAULT: "hsl(206 92% 56%)",
          subtle: "hsl(206 92% 56% / 0.12)",
          foreground: "hsl(206 92% 18%)",
        },

        // ── Sidebar tokens
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // ── Lexa Brand (New Design)
        lexa: {
          blue: {
            DEFAULT: "#2563EB",
            hover: "#1D4ED8",
            light: "#EFF6FF",
            gradient: "linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)",
          },
          grey: {
            50: "#F9FAFB",
            100: "#F3F4F6",
            200: "#E5E7EB",
            500: "#6B7280",
            900: "#111827",
          }
        },

        // ── Chart palette — perceptually distinct, accessible
        chart: {
          "1": "hsl(236 80% 54%)",  // indigo
          "2": "hsl(158 64% 52%)",  // emerald
          "3": "hsl(38  92% 56%)",  // amber
          "4": "hsl(280 68% 60%)",  // violet
          "5": "hsl(206 92% 56%)",  // sky
        },
      },

      // ─── Spacing & Sizing ──────────────────────────────────────────────
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "sidebar": "16rem",        // standard sidebar width
        "sidebar-collapsed": "4rem",
      },

      // ─── Border Radius ────────────────────────────────────────────────
      borderRadius: {
        none: "0",
        xs: "2px",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },

      // ─── Box Shadow ───────────────────────────────────────────────────
      boxShadow: {
        // Surface elevation system
        "surface-1": "0 1px 2px hsl(224 14% 4% / 0.5)",
        "surface-2": "0 2px 8px hsl(224 14% 4% / 0.4), 0 1px 2px hsl(224 14% 4% / 0.3)",
        "surface-3": "0 8px 24px hsl(224 14% 4% / 0.5), 0 2px 8px hsl(224 14% 4% / 0.3)",
        "surface-4": "0 24px 48px hsl(224 14% 4% / 0.6), 0 8px 16px hsl(224 14% 4% / 0.4)",

        // Glow effects for interactive elements
        "glow-indigo": "0 0 20px hsl(236 80% 54% / 0.35), 0 0 60px hsl(236 80% 54% / 0.15)",
        "glow-success": "0 0 20px hsl(158 64% 52% / 0.35)",
        "glow-danger": "0 0 20px hsl(4 86% 58% / 0.35)",

        // Inset border glow (for focus states)
        "focus-ring": "0 0 0 2px hsl(236 80% 54% / 0.6)",
        "inset-border": "inset 0 0 0 1px hsl(224 12% 20%)",
      },

      // ─── Keyframes & Animations ───────────────────────────────────────
      keyframes: {
        // Radix accordion
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        // Entrance animations
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },

        // Looping / ambient
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          from: { backgroundPosition: "200% center" },
          to: { backgroundPosition: "-200% center" },
        },
        "progress-indeterminate": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.4s cubic-bezier(0.16,1,0.3,1)",
        "fade-down": "fade-down 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16,1,0.3,1)",
        "zoom-in": "zoom-in 0.3s cubic-bezier(0.16,1,0.3,1)",

        "spin-slow": "spin-slow 8s linear infinite",
        "pulse-subtle": "pulse-subtle 2.5s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "progress-indeterminate": "progress-indeterminate 1.5s ease-in-out infinite",
        "count-up": "count-up 0.5s cubic-bezier(0.16,1,0.3,1)",
      },

      // ─── Transitions ──────────────────────────────────────────────────
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.16, 1, 0.3, 1)",   // snappy spring
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",    // material ease
        "bounce-in": "cubic-bezier(0.34, 1.56, 0.64, 1)", // slight overshoot
      },
      transitionDuration: {
        "50": "50ms",
        "150": "150ms",
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
        "600": "600ms",
      },

      // ─── Backdrop Blur ────────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
        "4xl": "72px",
      },
    },
  },
  plugins: [tailwindAnimate, typography],
} satisfies Config;