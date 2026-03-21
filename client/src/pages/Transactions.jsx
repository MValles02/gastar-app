import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { getTransactions, deleteTransaction } from '../services/transactions.js';
import { getAccounts } from '../services/accounts.js';
import { getCategories } from '../services/categories.js';
import TransactionList from '../components/transactions/TransactionList.jsx';
import TransactionFilters from '../components/transactions/TransactionFilters.jsx';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageErrorState from '../components/ui/PageErrorState.jsx';
import { getErrorMessage } from '../utils/errors.js';

function Transactions() {
  const { openModal, refreshKey } = useTransactionModal();
  const { showAlert, showConfirm } = useDialog();
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, totalPages: 0 });
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
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
    load();
  }, [load, refreshKey]);

  const handleEdit = (tx) => {
    openModal(tx);
  };

  const handleDelete = async (tx) => {
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

  if (loading) return <Spinner className="py-12" />;
  if (loadError) return <PageErrorState title="No pudimos cargar las transacciones" message={loadError} onAction={load} />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transacciones</h1>
      </div>

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
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Transactions;
