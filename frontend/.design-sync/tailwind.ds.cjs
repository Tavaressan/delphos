// Tailwind config for compiling the design-system stylesheet that ships to
// claude.ai/design. Reuses the app's real theme (tokens, fonts, shadows) and
// scans the whole app for a realistic utility surface, then safelists the
// brand token utilities + custom component classes so the design agent can
// use them even where the 7 synced components don't.
const base = require('../tailwind.config.js');

const colorNames = [
  'primary', 'primary-dark', 'primary-light',
  'secondary', 'secondary-dark', 'secondary-light',
  'accent', 'accent-dark', 'accent-light',
  'success', 'success-dark', 'success-light',
  'warning', 'warning-dark', 'warning-light',
  'danger', 'danger-dark', 'danger-light',
  'background', 'surface',
  'text-primary', 'text-secondary', 'border-color',
].join('|');

module.exports = {
  ...base,
  content: [
    // The DS components themselves + representative page compositions (how the
    // app really uses them) — a real but bounded utility surface. Full src/**
    // scanning balloons the sheet with app-specific arbitrary-value classes the
    // design system doesn't need.
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './.design-sync/previews/**/*.{js,ts,jsx,tsx}',
    './.design-sync/ds-entry.tsx',
  ],
  safelist: [
    // Custom component classes defined via @apply in globals.css
    'heading-font', 'font-body', 'font-heading', 'font-mono',
    'btn-primary', 'btn-secondary', 'btn-ghost', 'btn-danger',
    'card-alfabra', 'table-container', 'table-alfabra',
    'input-alfabra', 'label-alfabra',
    'shadow-discrete', 'shadow-card',
    // Brand token color utilities (with the states the DS actually uses).
    // Pattern is ANCHORED (^...$) — an unanchored one also matches
    // placeholder-/via-/to-… and explodes the sheet.
    {
      pattern: new RegExp(`^(bg|text|border|ring)-(${colorNames})$`),
      variants: ['hover', 'focus', 'active', 'disabled', 'dark'],
    },
  ],
};
