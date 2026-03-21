import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accounts.js';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import AccountCard from '../components/accounts/AccountCard.jsx';
import AccountModal from '../components/accounts/AccountModal.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

function Accounts() {
  const { triggerRefresh } = useTransactionModal();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (account) => {
    setEditing(account);
    setModalOpen(true);
  };

  const handleDelete = async (account) => {
    if (!confirm(`Eliminar la cuenta "${account.name}"?`)) return;
    try {
      await deleteAccount(account.id);
      await load();
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
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
          description="Agrega tu primera cuenta para empezar a registrar transacciones."
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
