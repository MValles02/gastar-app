import { OAuth2Client } from 'google-auth-library';

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }
  return client;
}

export function buildGoogleAuthUrl(): string {
  return getClient().generateAuthUrl({
    access_type: 'online',
    scope: ['email', 'profile'],
  });
}

export async function exchangeCodeForProfile(
  code: string
): Promise<{ email: string; name: string; googleId: string }> {
  const oauth = getClient();
  const { tokens } = await oauth.getToken(code);

  const ticket = await oauth.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('No payload from Google token');
  }

  if (!payload.email_verified) {
    const error = Object.assign(new Error('Email not verified by Google'), {
      code: 'EMAIL_NOT_VERIFIED',
    });
    throw error;
  }

  return {
    googleId: payload.sub,
    email: payload.email!,
    name: payload.given_name ?? payload.name ?? payload.email!.split('@')[0],
  };
}
