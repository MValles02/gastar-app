import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50),
  type: z.enum(['income', 'expense'], { message: 'El tipo debe ser ingreso o gasto' }),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
