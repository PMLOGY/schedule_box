import plugin from 'tailwindcss/plugin';

const glassPlugin = plugin(function ({ addUtilities }) {
  addUtilities({
    '.glass-surface': {
      // Opaque fallback for browsers without backdrop-filter
      background: 'rgba(255, 255, 255, 0.85)',

      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        background: 'var(--glass-bg-light)',
        // HARDCODED px values — CSS variables CANNOT be used in -webkit-backdrop-filter (Safari MDN#25914)
        'backdrop-filter': 'blur(16px)',
        '-webkit-backdrop-filter': 'blur(16px)',
        border: '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },

    '.glass-surface-subtle': {
      background: 'rgba(255, 255, 255, 0.90)',

      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        background: 'var(--glass-bg-subtle-light)',
        'backdrop-filter': 'blur(8px)',
        '-webkit-backdrop-filter': 'blur(8px)',
        border: '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },

    '.glass-surface-heavy': {
      background: 'rgba(255, 255, 255, 0.75)',

      '@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))': {
        background: 'var(--glass-bg-heavy-light)',
        'backdrop-filter': 'blur(24px)',
        '-webkit-backdrop-filter': 'blur(24px)',
        border: '1px solid var(--glass-border-light)',
        'box-shadow': 'var(--glass-shadow-light)',
      },
    },
  });
});

export default glassPlugin;
