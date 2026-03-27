import { once } from 'events';
import type { AddressInfo } from 'net';
import app from '../../src/app.js';

export async function startTestServer() {
  const server = app.listen(0);
  await once(server, 'listening');

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
