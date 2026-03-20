/**
 * One-time import script: Notion Finance Tracker → GastarApp
 *
 * Prerequisites:
 *   - Add NOTION_API_KEY to your .env file
 *   - Run against the correct DATABASE_URL (production)
 *
 * Usage:
 *   node server/scripts/import-notion.js
 *   (from the project root, so .env is found correctly)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

const USER_EMAIL = 'mateovalles02@gmail.com';

const NOTION_DB = {
  cuentas:        '197aee44-3453-8198-86f1-fb0f4f4e7a1c',
  categorias:     '197aee44-3453-81d8-888c-c06ef338fdcd',
  entradas:       '197aee44-3453-8109-80e4-ffdf8c0c3d04',
  salidas:        '197aee44-3453-8152-8792-dcf6b4ced48b',
  transferencias: '197aee44-3453-81f7-8969-ff935dca9f31',
};

// ---------------------------------------------------------------------------
// Notion API helpers
// ---------------------------------------------------------------------------

async function queryDatabase(databaseId) {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new Error('NOTION_API_KEY is not set in .env');

  const results = [];
  let cursor = undefined;

  do {
    const body = cursor ? { start_cursor: cursor } : {};
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Notion API error for DB ${databaseId}: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

// ---------------------------------------------------------------------------
// Notion property extractors
// ---------------------------------------------------------------------------

function getTitle(props, key) {
  return props[key]?.title?.map(t => t.plain_text).join('').trim() || '';
}

function getNumber(props, key) {
  return props[key]?.number ?? 0;
}

function getDate(props, key) {
  const start = props[key]?.date?.start;
  return start ? new Date(start) : null;
}

function getRelationId(props, key) {
  return props[key]?.relation?.[0]?.id ?? null;
}

function getSelect(props, key) {
  return props[key]?.select?.name ?? null;
}

function getRichText(props, key) {
  return props[key]?.rich_text?.map(t => t.plain_text).join('').trim() || '';
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapAccountType(notionType) {
  switch (notionType) {
    case 'Banco':     return 'checking';
    case 'Billetera': return 'cash';
    case 'Efectivo':  return 'cash';
    default:          return 'cash';
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('--- Gastar Import: Notion → Production ---\n');

  // 1. Find user
  console.log(`Finding user: ${USER_EMAIL}`);
  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);
  console.log(`  Found: ${user.name} (${user.id})`);

  // 2. Safety check — abort if user already has data
  const existingAccounts = await prisma.account.count({ where: { userId: user.id } });
  if (existingAccounts > 0) {
    throw new Error(
      `User already has ${existingAccounts} account(s). ` +
      'Aborting to prevent duplicate data. ' +
      'Delete existing accounts/transactions first if you want to re-import.'
    );
  }

  // 3. Fetch all Notion databases in parallel
  console.log('\nFetching Notion data...');
  const [cuentasRows, categoriasRows, entradasRows, salidasRows, transferenciaRows] =
    await Promise.all([
      queryDatabase(NOTION_DB.cuentas),
      queryDatabase(NOTION_DB.categorias),
      queryDatabase(NOTION_DB.entradas),
      queryDatabase(NOTION_DB.salidas),
      queryDatabase(NOTION_DB.transferencias),
    ]);

  console.log(`  Cuentas:        ${cuentasRows.length}`);
  console.log(`  Categorias:     ${categoriasRows.length}`);
  console.log(`  Entradas:       ${entradasRows.length}`);
  console.log(`  Salidas:        ${salidasRows.length}`);
  console.log(`  Transferencias: ${transferenciaRows.length}`);

  // 4. Create accounts
  console.log('\nCreating accounts...');

  // notionId → gastar UUID
  const notionToAccountId = new Map();
  // gastar UUID → starting balance from Notion
  const accountStartingBalance = new Map();

  const accountsData = cuentasRows.map(row => {
    const id = randomUUID();
    notionToAccountId.set(row.id, id);
    const balanceInicio = getNumber(row.properties, 'Balance inicio');
    accountStartingBalance.set(id, balanceInicio);
    return {
      id,
      userId: user.id,
      name: getTitle(row.properties, 'Nombre'),
      type: mapAccountType(getSelect(row.properties, 'Tipo')),
      balance: balanceInicio,
      currency: 'ARS',
    };
  });

  await prisma.account.createMany({ data: accountsData });
  console.log(`  Created ${accountsData.length} accounts`);

  // 5. Create categories (including fallback)
  console.log('\nCreating categories...');

  const notionToCategoryId = new Map();

  const categoriesData = categoriasRows.map(row => {
    const id = randomUUID();
    notionToCategoryId.set(row.id, id);
    return {
      id,
      userId: user.id,
      name: getTitle(row.properties, 'Nombre'),
      icon: null,
    };
  });

  // Fallback category for incomes with no linked expense and for transfers
  const fallbackCategoryId = randomUUID();
  categoriesData.push({
    id: fallbackCategoryId,
    userId: user.id,
    name: 'Sin categoría',
    icon: null,
  });

  await prisma.category.createMany({ data: categoriesData });
  console.log(`  Created ${categoriesData.length} categories (includes "Sin categoría" fallback)`);

  // 6. Build Salidas lookup map: salida notionId → category notionId
  //    Used to resolve category for incomes linked to an expense.
  const salidaCategoryNotionId = new Map();
  for (const row of salidasRows) {
    const catId = getRelationId(row.properties, 'Categoria');
    salidaCategoryNotionId.set(row.id, catId);
  }

  // 7. Build all transactions
  console.log('\nBuilding transactions...');
  const transactions = [];
  let skipped = 0;

  // Incomes (Entradas)
  for (const row of entradasRows) {
    const accountNotionId = getRelationId(row.properties, 'Conta') ?? getRelationId(row.properties, 'Cuenta');
    const accountId = notionToAccountId.get(accountNotionId);
    if (!accountId) { skipped++; continue; }

    const date = getDate(row.properties, 'Fecha');
    if (!date) { skipped++; continue; }

    // Resolve category: follow Entrada → Salida → Categoria
    let categoryId = fallbackCategoryId;
    const linkedSalidaId = getRelationId(row.properties, 'Salidas');
    if (linkedSalidaId) {
      const catNotionId = salidaCategoryNotionId.get(linkedSalidaId);
      if (catNotionId) {
        categoryId = notionToCategoryId.get(catNotionId) ?? fallbackCategoryId;
      }
    }

    transactions.push({
      id: randomUUID(),
      accountId,
      categoryId,
      type: 'income',
      amount: getNumber(row.properties, 'Cantidad'),
      description: getTitle(row.properties, 'Nombre') || null,
      date,
      transferTo: null,
    });
  }

  // Expenses (Salidas)
  for (const row of salidasRows) {
    const accountNotionId = getRelationId(row.properties, 'Cuenta');
    const accountId = notionToAccountId.get(accountNotionId);
    if (!accountId) { skipped++; continue; }

    const date = getDate(row.properties, 'Fecha');
    if (!date) { skipped++; continue; }

    const catNotionId = getRelationId(row.properties, 'Categoria');
    const categoryId = catNotionId
      ? (notionToCategoryId.get(catNotionId) ?? fallbackCategoryId)
      : fallbackCategoryId;

    const nombre = getTitle(row.properties, 'Nombre');
    const notas  = getRichText(row.properties, 'Notas');
    const description = notas ? `${nombre} — ${notas}` : nombre || null;

    transactions.push({
      id: randomUUID(),
      accountId,
      categoryId,
      type: 'expense',
      amount: getNumber(row.properties, 'Cantidad'),
      description,
      date,
      transferTo: null,
    });
  }

  // Transfers (Transferencias)
  for (const row of transferenciaRows) {
    const fromNotionId = getRelationId(row.properties, 'Desde');
    const toNotionId   = getRelationId(row.properties, 'Hacia');
    const accountId    = notionToAccountId.get(fromNotionId);
    const transferTo   = notionToAccountId.get(toNotionId);
    if (!accountId || !transferTo) { skipped++; continue; }

    const date = getDate(row.properties, 'Fecha');
    if (!date) { skipped++; continue; }

    transactions.push({
      id: randomUUID(),
      accountId,
      categoryId: fallbackCategoryId,
      type: 'transfer',
      amount: getNumber(row.properties, 'Cantidad'),
      description: getTitle(row.properties, 'Nombre') || null,
      date,
      transferTo,
    });
  }

  await prisma.transaction.createMany({ data: transactions });
  console.log(`  Created ${transactions.length} transactions`);
  if (skipped > 0) console.log(`  Skipped ${skipped} rows (missing account or date)`);

  // 8. Recalculate and update account balances
  console.log('\nRecalculating account balances...');

  for (const [accountId, startingBalance] of accountStartingBalance) {
    let balance = startingBalance;

    for (const t of transactions) {
      if (t.accountId === accountId) {
        if (t.type === 'income')    balance += Number(t.amount);
        if (t.type === 'expense')   balance -= Number(t.amount);
        if (t.type === 'transfer')  balance -= Number(t.amount); // outgoing
      }
      if (t.transferTo === accountId) {
        balance += Number(t.amount); // incoming transfer
      }
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { balance },
    });
  }

  console.log(`  Updated ${accountStartingBalance.size} account balances`);

  // 9. Summary
  const incomeCount    = transactions.filter(t => t.type === 'income').length;
  const expenseCount   = transactions.filter(t => t.type === 'expense').length;
  const transferCount  = transactions.filter(t => t.type === 'transfer').length;

  console.log('\n--- Import complete ---');
  console.log(`  Accounts:     ${accountsData.length}`);
  console.log(`  Categories:   ${categoriesData.length}`);
  console.log(`  Transactions: ${transactions.length} (${incomeCount} incomes, ${expenseCount} expenses, ${transferCount} transfers)`);
  if (skipped > 0) console.log(`  Skipped:      ${skipped}`);
}

main()
  .catch(e => {
    console.error('\nImport failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
