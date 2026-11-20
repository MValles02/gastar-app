import { PASSWORD_MIN_LENGTH } from '#lib/shared/runtime.js';

/** Text-field limits and their messages, shared by server validation and the forms' maxlength/minlength attributes. */
export const NAME_MAX_LENGTH = 40;
export const DESCRIPTION_MAX_LENGTH = 60;
export const USER_NAME_MAX_LENGTH = 80;

export { PASSWORD_MIN_LENGTH };
export const PASSWORD_MAX_LENGTH = 128;

/** "La descripción puede tener hasta 60 caracteres." style message. */
export const tooLongMessage = (subject: string, max: number) =>
	`${subject} puede tener hasta ${max} caracteres.`;

export const DESCRIPTION_TOO_LONG_MESSAGE = tooLongMessage(
	'La descripción',
	DESCRIPTION_MAX_LENGTH
);
export const PASSWORD_MIN_MESSAGE = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INVALID_EMAIL_MESSAGE = 'Email inválido.';

export function userNameError(name: string): string | undefined {
	if (!name) return 'Falta el nombre.';
	if (name.length > USER_NAME_MAX_LENGTH)
		return `Usá un nombre de hasta ${USER_NAME_MAX_LENGTH} caracteres.`;
}

export function isValidPasswordLength(password: string): boolean {
	return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}
