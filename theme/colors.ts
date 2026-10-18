export const colors = {
  light: {
    background: '#F4F6F8',
    card: '#FFFFFF',
    textPrimary: '#3D4752',
    textSecondary: '#8A98A6',
    border: '#E4E9ED',
    accent: '#5B7C99',
    currentBg: '#E9F2EC',
    currentText: '#4F7A63',
    overdueBg: '#F7E9E3',
    overdueText: '#A15B3F',
  },
  dark: {
    background: '#16191C',
    card: '#20242A',
    textPrimary: '#E4E8EC',
    textSecondary: '#8D97A3',
    border: '#2B3037',
    accent: '#7FA0BB',
    currentBg: '#20362B',
    currentText: '#8FBFA3',
    overdueBg: '#3A2A22',
    overdueText: '#D99B7B',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = typeof colors.light;
