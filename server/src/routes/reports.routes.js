import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../utils/prisma.js';
import { reportQuerySchema, monthlyQuerySchema, byCategoryQuerySchema } from '../validators/report.validators.js';

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

// GET /api/reports/by-category?from=&to=&accountId[]=&type[]=&categoryId[]=
router.get('/by-category', async (req, res, next) => {
  try {
    const { from, to, accountId, type, categoryId } = byCategoryQuerySchema.parse(req.query);
    const dateFilter = buildDateFilter(from, to);
    const accountIds = accountId ?? [];
    const types = type ?? [];
    const categoryIds = categoryId ?? [];

    const txWhere = {
      account: {
        userId: req.userId,
        ...(accountIds.length && { id: { in: accountIds } }),
      },
      ...(dateFilter && { date: dateFilter }),
      ...(categoryIds.length && { categoryId: { in: categoryIds } }),
    };

    const showExpenses = !types.length || types.includes('expense');
    const showIncomes = !types.length || types.includes('income');

    const [expenseGroups, incomeGroups] = await Promise.all([
      showExpenses
        ? prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { ...txWhere, type: 'expense' },
            _sum: { amountArs: true },
            orderBy: { _sum: { amountArs: 'desc' } },
          })
        : Promise.resolve([]),
      showIncomes
        ? prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { ...txWhere, type: 'income' },
            _sum: { amountArs: true },
            orderBy: { _sum: { amountArs: 'desc' } },
          })
        : Promise.resolve([]),
    ]);

    const categoryIds2 = [...new Set([
      ...expenseGroups.map(g => g.categoryId),
      ...incomeGroups.map(g => g.categoryId),
    ])];

    const categoriesMap = {};
    if (categoryIds2.length > 0) {
      const cats = await prisma.category.findMany({
        where: { id: { in: categoryIds2 } },
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

// GET /api/reports/monthly?year=YYYY
router.get('/monthly', async (req, res, next) => {
  try {
    const { year } = monthlyQuerySchema.parse(req.query);
    const targetYear = year || new Date().getFullYear();

    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(MONTH FROM t.date)::int AS month,
        SUM(CASE WHEN t.type = 'income'  THEN t.amount_ars ELSE 0 END)::float AS income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount_ars ELSE 0 END)::float AS expenses
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = ${req.userId}
        AND EXTRACT(YEAR FROM t.date) = ${targetYear}
      GROUP BY month
      ORDER BY month
    `;

    const dataMap = new Map(rows.map(r => [r.month, r]));
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const row = dataMap.get(month);
      const income = row ? Number(row.income) : 0;
      const expenses = row ? Number(row.expenses) : 0;
      return { month, income, expenses, netFlow: income - expenses };
    });

    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        netFlow: acc.netFlow + m.netFlow,
      }),
      { income: 0, expenses: 0, netFlow: 0 }
    );

    res.json({ data: { year: targetYear, months, totals } });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /api/reports/frequency?from=&to=
router.get('/frequency', async (req, res, next) => {
  try {
    const { from, to } = reportQuerySchema.parse(req.query);
    const dateFilter = buildDateFilter(from, to);

    const groups = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        account: { userId: req.userId },
        ...(dateFilter && { date: dateFilter }),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const categoryIds = [...new Set(groups.map(g => g.categoryId))];
    const categoriesMap = {};
    if (categoryIds.length > 0) {
      const cats = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true },
      });
      for (const c of cats) categoriesMap[c.id] = c;
    }

    const data = groups.map(g => ({
      categoryId: g.categoryId,
      categoryName: categoriesMap[g.categoryId]?.name || 'Sin categoría',
      categoryIcon: categoriesMap[g.categoryId]?.icon || null,
      count: g._count.id,
    }));

    res.json({ data });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

export default router;
