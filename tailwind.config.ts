import type { Config } from 'tailwindcss'
const designSystem = require('./docs/design-system.json')

const config: Config = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: designSystem.colors.primary,
        secondary: designSystem.colors.secondary,
        gray: designSystem.colors.gray,
        success: designSystem.colors.success,
        warning: designSystem.colors.warning,
        error: designSystem.colors.error,
        background: {
          DEFAULT: designSystem.colors.background.DEFAULT,
          secondary: designSystem.colors.background.secondary,
          tertiary: designSystem.colors.background.tertiary,
        },
        surface: designSystem.colors.surface,
        border: {
          DEFAULT: designSystem.colors.border.DEFAULT,
          light: designSystem.colors.border.light,
          dark: designSystem.colors.border.dark,
        },
        text: designSystem.colors.text,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      },
      fontSize: designSystem.typography.fontSize,
      fontWeight: designSystem.typography.fontWeight,
      lineHeight: designSystem.typography.lineHeight,
      letterSpacing: designSystem.typography.letterSpacing,
      spacing: designSystem.spacing,
      borderRadius: designSystem.borderRadius,
      boxShadow: designSystem.boxShadow,
      screens: designSystem.breakpoints,
      animation: {
        'fade-in': 'fadeIn 250ms ease-out',
        'fade-out': 'fadeOut 250ms ease-in',
        'slide-in': 'slideIn 350ms ease-out',
        'slide-out': 'slideOut 350ms ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
      },
      zIndex: designSystem.zIndex,
    },
  },
  plugins: [],
}
export default config