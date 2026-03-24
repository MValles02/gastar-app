import { OAuth2Client } from 'google-auth-library';

let client = null;

function getClient() {
  if (!client) {
    client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );
  }
  return client;
}

export function buildGoogleAuthUrl() {
  return getClient().generateAuthUrl({
    access_type: 'online',
    scope: ['email', 'profile'],
  });
}

export async function exchangeCodeForProfile(code) {
  const oauth = getClient();
  const { tokens } = await oauth.getToken(code);

  const ticket = await oauth.verifyIdToken({
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
    name: payload.given_name || payload.name || payload.email.split('@')[0],
  };
}
