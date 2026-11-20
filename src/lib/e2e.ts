/** True in e2e builds (VITE_E2E=1), which run many test users and requests from one IP. */
export const E2E = import.meta.env.VITE_E2E === '1';

/** Rate-limit max for e2e builds, so suites are not throttled. */
export const E2E_MAX = 50;

/** `normal` in production, `E2E_MAX` in e2e builds. */
export const e2eOr = (normal: number) => (E2E ? E2E_MAX : normal);
