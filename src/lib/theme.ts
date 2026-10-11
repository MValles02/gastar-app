export const THEME_COLORS = { light: '#f6efe1', dark: '#0c0a09' };

/** Browser-chrome colours for the light/dark metas; an explicit choice forces both to it. */
export function themeColors(theme: string | undefined): { light: string; dark: string } {
	if (theme === 'light' || theme === 'dark') {
		const color = THEME_COLORS[theme];
		return { light: color, dark: color };
	}
	return THEME_COLORS;
}
