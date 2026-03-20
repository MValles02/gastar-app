import { z } from 'zod';

export const createTransactionSchema = z.object({
  accountId: z.string().uuid('ID de cuenta inválido'),
  categoryId: z.string().uuid('ID de categoría inválido'),
  type: z.enum(['income', 'expense', 'transfer'], { message: 'Tipo de transacción inválido' }),
  amount: z.union([z.string(), z.number()])
    .transform(Number)
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  description: z.string().max(200).optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha inválida'),
  transferTo: z.string().uuid().optional(),
}).refine(
  data => data.type !== 'transfer' || data.transferTo,
  { message: 'La cuenta destino es requerida para transferencias', path: ['transferTo'] }
).refine(
  data => data.type !== 'transfer' || data.transferTo !== data.accountId,
  { message: 'La cuenta destino debe ser diferente a la cuenta origen', path: ['transferTo'] }
);

export const updateTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  amount: z.union([z.string(), z.number()])
    .transform(Number)
    .pipe(z.number().positive('El monto debe ser mayor a 0'))
    .optional(),
  description: z.string().max(200).optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha inválida').optional(),
  transferTo: z.string().uuid().nullable().optional(),
});

export const transactionQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
