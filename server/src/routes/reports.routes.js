import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../utils/prisma.js';
import { reportQuerySchema } from '../validators/report.validators.js';

const router = Router();

router.use(authenticate);

function buildDateFilter(from, to) {
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
}

// GET /api/reports/summary?from=&to=
router.get('/summary', async (req, res, next) => {
  try {
    const { from, to } = reportQuerySchema.parse(req.query);
    const dateFilter = buildDateFilter(from, to);

    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      select: { id: true, name: true, type: true, balance: true, balanceArs: true, currency: true },
      orderBy: { name: 'asc' },
    });

    const totalBalance = accounts.reduce((sum, a) => sum + Number.parseFloat(a.balanceArs), 0);

    const txWhere = {
      account: { userId: req.userId },
      ...(dateFilter && { date: dateFilter }),
    };

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...txWhere, type: 'income' },
        _sum: { amountArs: true },
      }),
      prisma.transaction.aggregate({
        where: { ...txWhere, type: 'expense' },
        _sum: { amountArs: true },
      }),
    ]);

    const totalIncome = Number.parseFloat(incomeAgg._sum.amountArs || 0);
    const totalExpenses = Number.parseFloat(expenseAgg._sum.amountArs || 0);

    res.json({
      data: {
        totalBalance,
        accounts,
        totalIncome,
        totalExpenses,
        netFlow: totalIncome - totalExpenses,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /api/reports/by-category?from=&to=
router.get('/by-category', async (req, res, next) => {
  try {
    const { from, to } = reportQuerySchema.parse(req.query);
    const dateFilter = buildDateFilter(from, to);

    const txWhere = {
      account: { userId: req.userId },
      ...(dateFilter && { date: dateFilter }),
    };

    const [expenseGroups, incomeGroups] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...txWhere, type: 'expense' },
        _sum: { amountArs: true },
        orderBy: { _sum: { amountArs: 'desc' } },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...txWhere, type: 'income' },
        _sum: { amountArs: true },
        orderBy: { _sum: { amountArs: 'desc' } },
      }),
    ]);

    const categoryIds = [...new Set([
      ...expenseGroups.map(g => g.categoryId),
      ...incomeGroups.map(g => g.categoryId),
    ])];

    const categoriesMap = {};
    if (categoryIds.length > 0) {
      const cats = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true },
      });
      for (const c of cats) categoriesMap[c.id] = c;
    }

    const mapGroups = (groups) => groups.map(g => ({
      categoryId: g.categoryId,
      categoryName: categoriesMap[g.categoryId]?.name || 'Sin categoría',
      categoryIcon: categoriesMap[g.categoryId]?.icon || null,
      total: Number.parseFloat(g._sum.amountArs || 0),
    }));

    res.json({
      data: {
        expenses: mapGroups(expenseGroups),
        incomes: mapGroups(incomeGroups),
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

export default router;
