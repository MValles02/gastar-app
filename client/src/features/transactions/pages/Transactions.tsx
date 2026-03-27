import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { getTransactions, deleteTransaction } from '../services/transactions.js';
import { getAccounts } from '../../accounts/services/accounts.js';
import { getCategories } from '../../categories/services/categories.js';
import { Page } from '../../../shared/components/layout/Page.js';
import TransactionList from '../components/TransactionList.js';
import TransactionFilters from '../components/TransactionFilters.js';
import { useTransactionModal } from '../../../shared/contexts/TransactionModalContext.js';
import { useDialog } from '../../../shared/contexts/DialogContext.js';
import Button from '../../../shared/components/ui/Button.js';
import { ListPageSkeleton } from '../../../shared/components/ui/PageSkeletons.js';
import EmptyState from '../../../shared/components/ui/EmptyState.js';
import PageErrorState from '../../../shared/components/ui/PageErrorState.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import type { TransactionFilters as TFilters, TransactionListResponse, TransactionWithRelations } from '../services/transactions.js';
import type { Account, Category } from '../../../shared/types/domain.types.js';

function Transactions(): JSX.Element {
  const { openModal, refreshKey } = useTransactionModal();
  const { showAlert, showConfirm } = useDialog();
  const [data, setData] = useState<TransactionListResponse>({ transactions: [], total: 0, page: 1, totalPages: 0 });
  const [filters, setFilters] = useState<TFilters>({ page: 1, limit: 20 });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const [transactions, accountOptions, categoryOptions] = await Promise.all([
        getTransactions(filters),
        getAccounts(),
        getCategories(),
      ]);

      setData(transactions);
      setAccounts(accountOptions);
      setCategories(categoryOptions);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'No pudimos cargar las transacciones.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleEdit = (tx: TransactionWithRelations) => {
    openModal(tx);
  };

  const handleDelete = async (tx: TransactionWithRelations) => {
    const confirmed = await showConfirm({
      title: 'Eliminar transacción',
      message: 'Se eliminará esta transacción. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await deleteTransaction(tx.id);
      await load();
    } catch (err) {
      await showAlert({
        title: 'No pudimos eliminar la transacción',
        message: getErrorMessage(err, 'Error al eliminar la transacción.'),
      });
    }
  };

  if (loading) return <ListPageSkeleton metricCount={0} />;
  if (loadError)
    return (
      <PageErrorState
        title="No pudimos cargar las transacciones"
        message={loadError}
        onAction={load}
      />
    );

  return (
    <Page>
      <div className="space-y-6">
        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          accounts={accounts}
          categories={categories}
        />

        {data.transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Sin transacciones"
            description="Usá el botón + para registrar tu primera transacción."
          />
        ) : (
          <>
            <TransactionList
              transactions={data.transactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {data.totalPages > 1 ? (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Anterior
                </Button>
                <span className="text-sm text-app-muted">
                  Página {data.page} de {data.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Page>
  );
}

export default Transactions;
