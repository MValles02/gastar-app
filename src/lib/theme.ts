export const THEME_COLORS = { light: '#00301c', dark: '#06120c' };

/** Browser-chrome colours for the light/dark metas; an explicit choice forces both to it. */
export function themeColors(theme: string | undefined): { light: string; dark: string } {
	if (theme === 'light' || theme === 'dark') {
		const color = THEME_COLORS[theme];
		return { light: color, dark: color };
	}
	return THEME_COLORS;
}
