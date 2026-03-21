import { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accounts.js';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import AccountCard from '../components/accounts/AccountCard.jsx';
import AccountModal from '../components/accounts/AccountModal.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageErrorState from '../components/ui/PageErrorState.jsx';
import { getErrorMessage } from '../utils/errors.js';

function Accounts() {
  const { triggerRefresh } = useTransactionModal();
  const { showAlert, showConfirm } = useDialog();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'No pudimos cargar las cuentas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (account) => {
    setEditing(account);
    setModalOpen(true);
  };

  const handleDelete = async (account) => {
    const confirmed = await showConfirm({
      title: 'Eliminar cuenta',
      message: `Se eliminará la cuenta "${account.name}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await deleteAccount(account.id);
      await load();
      triggerRefresh();
    } catch (err) {
      await showAlert({
        title: 'No pudimos eliminar la cuenta',
        message: getErrorMessage(err, 'Error al eliminar la cuenta.'),
      });
    }
  };

  const handleSubmit = async (data) => {
    if (editing) {
      await updateAccount(editing.id, data);
    } else {
      await createAccount(data);
    }

    await load();
    triggerRefresh();
  };

  if (loading) return <Spinner className="py-12" />;
  if (loadError) return <PageErrorState title="No pudimos cargar las cuentas" message={loadError} onAction={load} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cuentas</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin cuentas"
          description="Agregá tu primera cuenta para empezar a registrar transacciones."
          actionLabel="Agregar cuenta"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        account={editing}
      />
    </div>
  );
}

export default Accounts;
