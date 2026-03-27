import prisma from '../../shared/utils/prisma.js';

function buildDateFilter(from, to) {
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
}

async function buildCategoriesMap(categoryIds) {
  const map = {};
  if (categoryIds.length > 0) {
    const cats = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true },
    });
    for (const c of cats) map[c.id] = c;
  }
  return map;
}

export async function getSummaryReport(userId, { from, to }) {
  const dateFilter = buildDateFilter(from, to);
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, type: true, balance: true, balanceArs: true, currency: true },
    orderBy: { name: 'asc' },
  });
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balanceArs), 0);
  const txWhere = { account: { userId }, ...(dateFilter && { date: dateFilter }) };
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...txWhere, type: 'income' }, _sum: { amountArs: true } }),
    prisma.transaction.aggregate({ where: { ...txWhere, type: 'expense' }, _sum: { amountArs: true } }),
  ]);
  const totalIncome = Number(incomeAgg._sum.amountArs || 0);
  const totalExpenses = Number(expenseAgg._sum.amountArs || 0);
  return { totalBalance, accounts, totalIncome, totalExpenses, netFlow: totalIncome - totalExpenses };
}

export async function getByCategoryReport(userId, { from, to, accountId, type, categoryId }) {
  const dateFilter = buildDateFilter(from, to);
  const accountIds = accountId ?? [];
  const types = type ?? [];
  const categoryIds = categoryId ?? [];
  const txWhere = {
    account: { userId, ...(accountIds.length && { id: { in: accountIds } }) },
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
  const allCategoryIds = [...new Set([...expenseGroups.map((g) => g.categoryId), ...incomeGroups.map((g) => g.categoryId)])];
  const categoriesMap = await buildCategoriesMap(allCategoryIds);
  const mapGroups = (groups) =>
    groups.map((g) => ({
      categoryId: g.categoryId,
      categoryName: categoriesMap[g.categoryId]?.name || 'Sin categoría',
      categoryIcon: categoriesMap[g.categoryId]?.icon || null,
      total: Number(g._sum.amountArs || 0),
    }));
  return { expenses: mapGroups(expenseGroups), incomes: mapGroups(incomeGroups) };
}

export async function getMonthlyReport(userId, { year }) {
  const targetYear = year || new Date().getFullYear();
  const rows = await prisma.$queryRaw`
    SELECT
      EXTRACT(MONTH FROM t.date)::int AS month,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount_ars ELSE 0 END)::float AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount_ars ELSE 0 END)::float AS expenses
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.user_id = ${userId}
      AND EXTRACT(YEAR FROM t.date) = ${targetYear}
    GROUP BY month
    ORDER BY month
  `;
  const dataMap = new Map(rows.map((r) => [r.month, r]));
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const row = dataMap.get(month);
    const income = row ? Number(row.income) : 0;
    const expenses = row ? Number(row.expenses) : 0;
    return { month, income, expenses, netFlow: income - expenses };
  });
  const totals = months.reduce(
    (acc, m) => ({ income: acc.income + m.income, expenses: acc.expenses + m.expenses, netFlow: acc.netFlow + m.netFlow }),
    { income: 0, expenses: 0, netFlow: 0 }
  );
  return { year: targetYear, months, totals };
}

export async function getFrequencyReport(userId, { from, to }) {
  const dateFilter = buildDateFilter(from, to);
  const groups = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { account: { userId }, type: 'expense', ...(dateFilter && { date: dateFilter }) },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  const categoryIds = [...new Set(groups.map((g) => g.categoryId))];
  const categoriesMap = await buildCategoriesMap(categoryIds);
  return groups.map((g) => ({
    categoryId: g.categoryId,
    categoryName: categoriesMap[g.categoryId]?.name || 'Sin categoría',
    categoryIcon: categoriesMap[g.categoryId]?.icon || null,
    count: g._count.id,
  }));
}
