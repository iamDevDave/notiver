/**
 * Design system tokens for the Notification Intelligence Platform.
 * Dark-only theme with carefully chosen colors for readability and hierarchy.
 */

export const colors = {
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
    default: '#27272A',
    subtle: '#1E1E22',
  },
} as const;

export const typography = {
  xl: 32,
  lg: 24,
  md: 20,
  body: 16,
  caption: 12,
} as const;

export const radius = {
  cards: 20,
  buttons: 16,
  inputs: 16,
  modals: 24,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Complete theme object for programmatic access */
export const theme = {
  colors,
  typography,
  radius,
  spacing,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Radius = typeof radius;
export type Spacing = typeof spacing;
