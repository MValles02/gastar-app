import { OAuth2Client } from 'google-auth-library';

function getClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL,
  );
}

export function buildGoogleAuthUrl() {
  const client = getClient();
  return client.generateAuthUrl({
    access_type: 'online',
    scope: ['email', 'profile'],
  });
}

export async function exchangeCodeForProfile(code) {
  const client = getClient();
  const { tokens } = await client.getToken(code);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload.email_verified) {
    const error = new Error('Email not verified by Google');
    error.code = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
  };
}
