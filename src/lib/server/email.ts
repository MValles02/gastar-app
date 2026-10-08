import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

export type OutboxEntry = { id: number; to: string; subject: string; link: string };

const OUTBOX_MAX = 20;
let nextId = 1;
// ponytail: in-memory dev/E2E outbox, only filled when RESEND_API_KEY is unset in dev
const outbox: OutboxEntry[] = [];

/** Latest dev outbox entry for a recipient, if any. */
export function latestOutbox(to: string): OutboxEntry | undefined {
	return [...outbox].reverse().find((e) => e.to === to);
}

/** Sends an email through Resend. Never throws and never logs recipients, links or tokens. */
export async function sendEmail(msg: {
	to: string;
	subject: string;
	text: string;
	html: string;
	link: string;
}): Promise<void> {
	const key = env.RESEND_API_KEY;
	if (!key) {
		if (dev) {
			outbox.push({ id: nextId++, to: msg.to, subject: msg.subject, link: msg.link });
			if (outbox.length > OUTBOX_MAX) outbox.shift();
		}
		return;
	}
	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				from: `Gastar <${env.EMAIL_FROM}>`,
				to: [msg.to],
				subject: msg.subject,
				text: msg.text,
				html: msg.html
			}),
			signal: AbortSignal.timeout(10_000)
		});
		if (!res.ok) console.error(`email send failed: ${res.status}`);
	} catch {
		console.error('email send failed: network');
	}
}
