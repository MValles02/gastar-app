const KEY = 'gastar:pending-email';

/** Remembers the address a verification link was sent to, so /verify-email can prefill it. Per-browser convenience only. */
export function rememberPendingEmail(email: string): void {
	try {
		localStorage.setItem(KEY, email);
	} catch {
		// Storage blocked: the field just starts empty.
	}
}

export function readPendingEmail(): string {
	try {
		return localStorage.getItem(KEY) ?? '';
	} catch {
		return '';
	}
}

export function clearPendingEmail(): void {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// Nothing to clear.
	}
}
