import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import authRoutes from './features/auth/auth.routes.js';
import accountRoutes from './features/accounts/accounts.routes.js';
import transactionRoutes from './features/transactions/transactions.routes.js';
import categoryRoutes from './features/categories/categories.routes.js';
import reportRoutes from './features/reports/reports.routes.js';
import exchangeRatesRoutes from './features/exchange-rates/exchange-rates.routes.js';
import { authenticate } from './shared/middleware/auth.middleware.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          formAction: ["'self'", 'https://accounts.google.com'],
        },
      },
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/exchange-rates', authenticate, exchangeRatesRoutes);

  if (process.env.NODE_ENV === 'production') {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const clientDist = join(__dirname, '../../client/dist');

    app.use(express.static(clientDist));

    app.get('*', (_req, res) => {
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

export default createApp();
