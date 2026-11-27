import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_NAME_MAX_LENGTH } from '#lib/constants.ts';
import { es } from '#lib/copy/es.ts';

/** Text-field validators; the limits are in constants.ts and the messages in copy/es.ts. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function userNameError(name: string): string | undefined {
	if (!name) return es.common.fields.nameMissing;
	if (name.length > USER_NAME_MAX_LENGTH) return es.common.fields.nameTooLong;
}

export function isValidPasswordLength(password: string): boolean {
	return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}
