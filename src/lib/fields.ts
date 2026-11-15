/** Text-field limits and their messages, shared by server validation and the forms' maxlength/minlength attributes. */
export const NAME_MAX_LENGTH = 40;
export const DESCRIPTION_MAX_LENGTH = 60;
export const USER_NAME_MAX_LENGTH = 80;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** "La descripción puede tener hasta 60 caracteres." style message. */
export const tooLongMessage = (subject: string, max: number) =>
	`${subject} puede tener hasta ${max} caracteres.`;

export const DESCRIPTION_TOO_LONG_MESSAGE = tooLongMessage(
	'La descripción',
	DESCRIPTION_MAX_LENGTH
);
export const PASSWORD_MIN_MESSAGE = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
