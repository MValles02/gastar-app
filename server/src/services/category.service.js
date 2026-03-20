import prisma from '../utils/prisma.js';

const defaultCategories = [
  { name: 'Salario', icon: 'banknote' },
  { name: 'Freelance', icon: 'laptop' },
  { name: 'Inversiones', icon: 'trending-up' },
  { name: 'Otros ingresos', icon: 'plus-circle' },
  { name: 'Comida', icon: 'utensils' },
  { name: 'Transporte', icon: 'car' },
  { name: 'Alquiler', icon: 'home' },
  { name: 'Entretenimiento', icon: 'gamepad-2' },
  { name: 'Salud', icon: 'heart-pulse' },
  { name: 'Educación', icon: 'graduation-cap' },
  { name: 'Ropa', icon: 'shirt' },
  { name: 'Servicios', icon: 'zap' },
  { name: 'Otros gastos', icon: 'minus-circle' },
];

export async function seedDefaultCategories(userId) {
  const data = defaultCategories.map(cat => ({ ...cat, userId }));
  await prisma.category.createMany({ data });
}
