import { colors } from '@/theme/colors';
import { useResolvedScheme } from '@/stores/themeStore';

export function useTheme() {
  const scheme = useResolvedScheme();
  return { colors: colors[scheme], scheme };
}
