import { randomUUID } from 'node:crypto';
import readline from 'node:readline';
import { hashPassword } from 'better-auth/crypto';
import postgres from 'postgres';

const MIN_PASSWORD_LENGTH = 8;

const [, , rawEmail, rawName] = process.argv;
const email = rawEmail?.trim().toLowerCase();
const name = rawName?.trim();

if (!email || !name) {
	console.error('Usage: node scripts/create-user.js <email> <name>');
	process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

function promptPassword(query) {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		let muted = false;
		const originalWrite = rl._writeToOutput.bind(rl);
		rl._writeToOutput = (str) => {
			if (!muted) originalWrite(str);
		};
		rl.question(query, (answer) => {
			rl.close();
			process.stdout.write('\n');
			resolve(answer);
		});
		muted = true;
	});
}

const password = await promptPassword('Password: ');

if (password.length < MIN_PASSWORD_LENGTH) {
	console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
	process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
	const existing = await sql`select id from "user" where email = ${email}`;
	if (existing.length > 0) {
		console.error(`A user with email ${email} already exists.`);
		process.exitCode = 1;
	} else {
		const userId = randomUUID();
		const passwordHash = await hashPassword(password);

		await sql.begin(async (tx) => {
			await tx`
				insert into "user" (id, name, email, email_verified, created_at, updated_at)
				values (${userId}, ${name}, ${email}, true, now(), now())
			`;
			await tx`
				insert into "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
				values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now())
			`;
		});

		console.log(`User created: ${email}`);
	}
} catch (err) {
	console.error('Failed to create user:', err.message);
	process.exitCode = 1;
} finally {
	await sql.end();
}
