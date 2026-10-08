import { expect, type APIRequestContext } from '@playwright/test';

type Entry = { id: number; to: string; subject: string; link: string };

/** Latest dev outbox entry for an address (null when nothing was sent). */
export async function latestMail(request: APIRequestContext, to: string): Promise<Entry | null> {
	const res = await request.get(`/dev/outbox?to=${encodeURIComponent(to)}`);
	expect(res.status()).toBe(200);
	return res.json();
}

/** Polls until the latest mail for `to` has a subject matching `subjectMatch`. */
export async function waitForLink(
	request: APIRequestContext,
	to: string,
	subjectMatch: RegExp | string = ''
): Promise<Entry> {
	const re = typeof subjectMatch === 'string' ? new RegExp(subjectMatch) : subjectMatch;
	let found: Entry | null = null;
	await expect
		.poll(async () => {
			const mail = await latestMail(request, to);
			found = mail && re.test(mail.subject) ? mail : null;
			return found !== null;
		})
		.toBe(true);
	return found!;
}
