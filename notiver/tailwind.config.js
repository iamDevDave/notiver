/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#09090B',
          secondary: '#111113',
          tertiary: '#18181B',
        },
        surface: {
          card: '#18181B',
          elevated: '#202024',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          muted: '#71717A',
        },
        accent: {
          primary: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          ai: '#8B5CF6',
        },
        border: {
          DEFAULT: '#27272A',
          subtle: '#1E1E22',
        },
      },
      fontSize: {
        xl: ['32px', { lineHeight: '40px' }],
        lg: ['24px', { lineHeight: '32px' }],
        md: ['20px', { lineHeight: '28px' }],
        body: ['16px', { lineHeight: '24px' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
      borderRadius: {
        cards: '20px',
        buttons: '16px',
        inputs: '16px',
        modals: '24px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px',
      },
    },
  },
  plugins: [],
};
