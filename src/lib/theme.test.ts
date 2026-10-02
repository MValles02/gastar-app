import { describe, expect, it } from 'vitest';
import { THEME_COLORS, themeColors } from './theme';

describe('themeColors', () => {
	it('forces both metas to the explicit choice', () => {
		expect(themeColors('light')).toEqual({ light: '#00301c', dark: '#00301c' });
		expect(themeColors('dark')).toEqual({ light: '#06120c', dark: '#06120c' });
	});

	it('keeps both colours for system, undefined and invalid values', () => {
		for (const v of ['system', undefined, 'nope']) expect(themeColors(v)).toEqual(THEME_COLORS);
	});
});
