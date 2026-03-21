import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha desde invalida').optional(),
  to: z.string().refine(val => !isNaN(Date.parse(val)), 'Fecha hasta invalida').optional(),
});
