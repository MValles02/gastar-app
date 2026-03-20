import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment'], {
    message: 'Tipo de cuenta invalido',
  }),
  currency: z.string().max(10).default('ARS'),
  balance: z.union([z.string(), z.number()]).transform(Number).pipe(z.number()).default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment']).optional(),
  currency: z.string().max(10).optional(),
});
