const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

/** Escapes LIKE wildcards (and the escape char) so user input matches literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');
