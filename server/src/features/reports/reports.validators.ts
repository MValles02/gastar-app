import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid start date')
    .optional(),
  to: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid end date')
    .optional(),
});

export const monthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const arrayOrString = z.union([z.string(), z.array(z.string())]).transform((v) => [v].flat());

export const byCategoryQuerySchema = reportQuerySchema.extend({
  accountId: arrayOrString.optional(),
  type: arrayOrString.optional(),
  categoryId: arrayOrString.optional(),
});
