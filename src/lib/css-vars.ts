/** Svelte attachment: sets measured values as CSS custom properties (inline `style` is off-limits in markup). */
export const cssVars = (vars: Record<string, string>) => (el: HTMLElement) => {
	for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
};
