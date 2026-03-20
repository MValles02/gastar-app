import dotenv from 'dotenv';
import { fileURLToPath as _fileURLToPath } from 'url';
import { dirname as _dirname, resolve } from 'path';
dotenv.config({ path: resolve(_dirname(_fileURLToPath(import.meta.url)), '../../.env') });
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/accounts.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import reportRoutes from './routes/reports.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const clientDist = join(__dirname, '../../client/dist');

  app.use(express.static(clientDist));

  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
