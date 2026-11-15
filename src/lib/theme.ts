export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
	{ value: 'light', label: 'Claro' },
	{ value: 'dark', label: 'Oscuro' },
	{ value: 'system', label: 'Sistema' }
];

export const isTheme = (value: unknown): value is Theme =>
	typeof value === 'string' && (THEMES as readonly string[]).includes(value);

export const THEME_COLORS = { light: '#f6efe1', dark: '#0c0a09' };

/** Browser-chrome colours for the light/dark metas; an explicit choice forces both to it. */
export function themeColors(theme: string | undefined): { light: string; dark: string } {
	if (theme === 'light' || theme === 'dark') {
		const color = THEME_COLORS[theme];
		return { light: color, dark: color };
	}
	return THEME_COLORS;
}

/** Applies `value` to the open page: the root `data-theme` and both theme-color metas. */
export function applyTheme(value: string) {
	if (value === 'light' || value === 'dark') {
		document.documentElement.dataset.theme = value;
	} else {
		delete document.documentElement.dataset.theme;
	}
	const colors = themeColors(value);
	document
		.querySelector('meta[name="theme-color"][media*="light"]')
		?.setAttribute('content', colors.light);
	document
		.querySelector('meta[name="theme-color"][media*="dark"]')
		?.setAttribute('content', colors.dark);
}
