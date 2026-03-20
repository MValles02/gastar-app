import prisma from '../utils/prisma.js';

const defaultCategories = [
  { name: 'Salario', type: 'income', icon: 'banknote' },
  { name: 'Freelance', type: 'income', icon: 'laptop' },
  { name: 'Inversiones', type: 'income', icon: 'trending-up' },
  { name: 'Otros ingresos', type: 'income', icon: 'plus-circle' },
  { name: 'Comida', type: 'expense', icon: 'utensils' },
  { name: 'Transporte', type: 'expense', icon: 'car' },
  { name: 'Alquiler', type: 'expense', icon: 'home' },
  { name: 'Entretenimiento', type: 'expense', icon: 'gamepad-2' },
  { name: 'Salud', type: 'expense', icon: 'heart-pulse' },
  { name: 'Educación', type: 'expense', icon: 'graduation-cap' },
  { name: 'Ropa', type: 'expense', icon: 'shirt' },
  { name: 'Servicios', type: 'expense', icon: 'zap' },
  { name: 'Otros gastos', type: 'expense', icon: 'minus-circle' },
];

export async function seedDefaultCategories(userId) {
  const data = defaultCategories.map(cat => ({ ...cat, userId }));
  await prisma.category.createMany({ data });
}
