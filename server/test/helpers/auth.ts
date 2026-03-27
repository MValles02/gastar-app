export async function registerAndGetSession(baseUrl: string, overrides: Record<string, string> = {}) {
  const payload = {
    name: overrides.name ?? 'Integration User',
    email: overrides.email ?? `integration-${Date.now()}@example.com`,
    password: overrides.password ?? 'secret123',
  };

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return {
    response,
    payload,
    cookie: response.headers.get('set-cookie'),
    body: await response.json(),
  };
}
