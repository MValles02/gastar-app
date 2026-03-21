import { z } from 'zod';

export const createTransactionSchema = z.object({
  accountId: z.string().uuid('ID de cuenta invalido'),
  categoryId: z.string().uuid('ID de categoria invalido'),
  type: z.enum(['income', 'expense', 'transfer'], { message: 'Tipo de transaccion invalido' }),
  amount: z.union([z.string(), z.number()])
    .transform(Number)
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  description: z.string().max(200).optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha invalida'),
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
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha invalida').optional(),
  transferTo: z.string().uuid().nullable().optional(),
}).refine(
  data => data.type !== 'transfer' || data.transferTo !== undefined,
  { message: 'La cuenta destino es requerida para transferencias', path: ['transferTo'] }
).refine(
  data => data.type !== 'transfer' || data.transferTo !== null,
  { message: 'La cuenta destino es requerida para transferencias', path: ['transferTo'] }
).refine(
  data => data.type !== 'transfer' || !data.accountId || data.transferTo !== data.accountId,
  { message: 'La cuenta destino debe ser diferente a la cuenta origen', path: ['transferTo'] }
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
