type Template = { subject: string; text: string; html: string };

// Inline styles: email clients ignore <style> blocks and CSS variables.
const CONTAINER_STYLE = 'font-family:system-ui,sans-serif;max-width:480px';
const BUTTON_STYLE =
	'display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none';

function esc(s: string): string {
	return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(
	name: string,
	body: string,
	links: [label: string, url: string][]
): Template['html'] {
	const buttons = links
		.map(([label, url]) => `<p><a href="${esc(url)}" style="${BUTTON_STYLE}">${esc(label)}</a></p>`)
		.join('');
	return `<div style="${CONTAINER_STYLE}"><p>Hola, ${esc(name)}.</p><p>${body}</p>${buttons}</div>`;
}

export function verifyEmail(name: string, link: string): Template {
	return {
		subject: 'Confirmá tu email',
		text: `Hola, ${name}.\n\nConfirmá tu email para empezar a usar Gastar:\n${link}\n\nEl enlace vence en 24 horas. Si no creaste una cuenta, ignorá este mensaje.`,
		html: layout(
			name,
			'Confirmá tu email para empezar a usar Gastar. El enlace vence en 24 horas. Si no creaste una cuenta, ignorá este mensaje.',
			[['Confirmar email', link]]
		)
	};
}

export function resetPassword(name: string, link: string): Template {
	return {
		subject: 'Restablecé tu contraseña',
		text: `Hola, ${name}.\n\nRestablecé tu contraseña de Gastar:\n${link}\n\nEl enlace vence en 1 hora. Si no lo pediste, ignorá este mensaje.`,
		html: layout(
			name,
			'Restablecé tu contraseña de Gastar. El enlace vence en 1 hora. Si no lo pediste, ignorá este mensaje.',
			[['Restablecer contraseña', link]]
		)
	};
}

export function existingAccount(name: string, loginLink: string, forgotLink: string): Template {
	return {
		subject: 'Ya tenés una cuenta en Gastar',
		text: `Hola, ${name}.\n\nAlguien intentó crear una cuenta con este email, pero ya tenés una.\nIniciá sesión: ${loginLink}\nSi olvidaste tu contraseña: ${forgotLink}`,
		html: layout(name, 'Alguien intentó crear una cuenta con este email, pero ya tenés una.', [
			['Iniciar sesión', loginLink],
			['Olvidé mi contraseña', forgotLink]
		])
	};
}
