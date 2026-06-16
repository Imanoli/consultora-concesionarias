import type { Config } from 'tailwindcss'

// En Tailwind v4 la configuración de tema va en globals.css via @theme.
// Este archivo solo se mantiene por compatibilidad con herramientas que lo esperan.
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}

export default config
