import { z } from 'zod';

export const createAccountSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment'], {
      message: 'Invalid account type',
    }),
    currency: z.enum(['ARS', 'USD', 'EUR'], { message: 'Currency not supported' }).default('ARS'),
    balance: z.union([z.string(), z.number()]).transform(Number).pipe(z.number()).default(0),
    exchangeRate: z.coerce.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.currency !== 'ARS' && data.balance > 0 && !data.exchangeRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exchange rate is required for foreign currency accounts with initial balance',
        path: ['exchangeRate'],
      });
    }
  });

export const updateAccountSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment']).optional(),
    currency: z.enum(['ARS', 'USD', 'EUR'], { message: 'Currency not supported' }).optional(),
    exchangeRate: z.coerce.number().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.currency && data.currency !== 'ARS' && !data.exchangeRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exchange rate is required when changing to foreign currency',
        path: ['exchangeRate'],
      });
    }
  });
