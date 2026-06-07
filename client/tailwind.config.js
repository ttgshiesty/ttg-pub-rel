/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── OFFICIAL ARC RAIDERS GAME COLORS ───────────────────────────────
        // Source: Official Game Style Guide
        // Primary Base: Black (#000000) and White (#FFFFFF)
        // HUD & Logo Accents:
        //   - Neon Yellow: #FFE600
        //   - Crimson Red: #FF2D2D
        //   - Vibrant Green: #00E600
        //   - Electric Blue: #0080FF
        //   - Pink/Magenta: #FF007F (Epic rarities)

        // Base
        'arc-black': '#000000',
        'arc-white': '#ffffff',

        // HUD & Logo Accents
        'arc-neon-yellow': '#ffe600',
        'arc-crimson': '#ff2d2d',
        'arc-green': '#00e600',
        'arc-blue': '#0080ff',
        'arc-pink': '#ff007f',

        // Backgrounds
        'arc-dark-bg': '#000000',
        'arc-bg-800': '#0a0a0a',
        'arc-light-bg': '#111111',
        'arc-border': '#ffe600',
        'arc-border-hi': '#ffffff',

        // Text
        'arc-muted': '#888888',

        // Accents
        'arc-yellow': '#ffe600',
        'arc-gold': '#ffe600',
        'arc-success': '#00e600',
        'arc-danger': '#ff2d2d',

        // rarity colors (mapped to official game colors)
        'arc-common': '#6c6b6a', // Gray
        'arc-uncommon': '#00e600', // Vibrant Green
        'arc-rare': '#0080ff', // Electric Blue
        'arc-epic': '#ff007f', // Pink/Magenta
        'arc-legendary': '#ffe600', // Neon Yellow
        'arc-exotic': '#ff2d2d', // Crimson Red

        // Skill-tree theme tokens
        gunmetal: '#1a1a2e',
        charcoal: '#16213e',
        'panel-border': '#2a2a4a',
        warning: '#ff2d2d',
        industrial: '#ffe600',
        organic: '#00e600',
        survival: '#ff2d2d',
        critical: '#ff2d2d',
        'text-primary': '#ffffff',
        'text-secondary': '#888888',
        'path-disabled': '#606576',
      },
      fontFamily: {
        // ARC Raiders Official Font Stack
        // Main: Urbanist → Tabs + Headings
        tabs: ['Urbanist', 'sans-serif'],
        heading: ['Urbanist', 'sans-serif'],
        'heading-alt': ['Prompt', 'sans-serif'],
        // Secondary: Barlow → Body text + Inputs
        body: ['Barlow', 'Barlow Condensed', 'sans-serif'],
        display: ['Barlow', 'Barlow Condensed', 'Impact', 'sans-serif'],
        inputs: ['Barlow', 'Barlow Condensed', 'sans-serif'],
        // Quaternary: JetBrains Mono → HUD / Data
        hud: ['JetBrains Mono', 'SF Mono', 'monospace'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
        data: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      fontSize: {
        readable: ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'data-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        'header-glow': [
          '1.5rem',
          { lineHeight: '2rem', letterSpacing: '0.05em', fontWeight: '800' },
        ],
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
