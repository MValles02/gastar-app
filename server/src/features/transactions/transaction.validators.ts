import { z } from 'zod';

export const createTransactionSchema = z
  .object({
    accountId: z.string().uuid('Invalid account ID'),
    categoryId: z.string().uuid('Invalid category ID'),
    type: z.enum(['income', 'expense', 'transfer'], { message: 'Invalid transaction type' }),
    amount: z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number().positive('Amount must be greater than 0')),
    exchangeRate: z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number().positive('Exchange rate must be greater than 0'))
      .optional(),
    description: z.string().max(200).optional(),
    date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date'),
    transferTo: z.string().uuid().optional(),
  })
  .refine((data) => data.type !== 'transfer' || data.transferTo, {
    message: 'Destination account is required for transfers',
    path: ['transferTo'],
  })
  .refine((data) => data.type !== 'transfer' || data.transferTo !== data.accountId, {
    message: 'Destination account must be different from source account',
    path: ['transferTo'],
  });

export const updateTransactionSchema = z
  .object({
    accountId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    amount: z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number().positive('Amount must be greater than 0'))
      .optional(),
    exchangeRate: z
      .union([z.string(), z.number()])
      .transform(Number)
      .pipe(z.number().positive('Exchange rate must be greater than 0'))
      .optional(),
    description: z.string().max(200).optional(),
    date: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid date')
      .optional(),
    transferTo: z.string().uuid().nullable().optional(),
  })
  .refine((data) => data.type !== 'transfer' || data.transferTo !== undefined, {
    message: 'Destination account is required for transfers',
    path: ['transferTo'],
  })
  .refine((data) => data.type !== 'transfer' || data.transferTo !== null, {
    message: 'Destination account is required for transfers',
    path: ['transferTo'],
  })
  .refine(
    (data) => data.type !== 'transfer' || !data.accountId || data.transferTo !== data.accountId,
    { message: 'Destination account must be different from source account', path: ['transferTo'] }
  );

export const transactionQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
