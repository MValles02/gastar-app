import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../services/accounts.js';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { Page, PageHeader } from '../components/layout/Page.jsx';
import AccountCard from '../components/accounts/AccountCard.jsx';
import AccountModal from '../components/accounts/AccountModal.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageErrorState from '../components/ui/PageErrorState.jsx';
import { formatCurrency } from '../utils/formatters.js';
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

  const summary = useMemo(() => {
    const totalBalance = accounts.reduce((total, account) => total + Number.parseFloat(account.balance), 0);
    return { totalBalance, count: accounts.length };
  }, [accounts]);

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
    <Page>
      <PageHeader
        eyebrow="Patrimonio"
        title="Cuentas"
        description="Administrá los saldos que alimentan tus movimientos y reportes sin perder de vista el total disponible."
        actions={(
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin cuentas"
          description="Agregá tu primera cuenta para empezar a registrar transacciones."
          actionLabel="Agregar cuenta"
          onAction={handleCreate}
        />
      ) : (
        <div className="space-y-6">
          <div className="metric-strip">
            <div className="metric-card">
              <p className="metric-label">Cuentas activas</p>
              <p className="mt-2 text-2xl font-semibold text-app">{summary.count}</p>
            </div>
            <div className="metric-card md:col-span-2">
              <p className="metric-label">Balance consolidado</p>
              <p className="mt-2 text-2xl font-semibold text-app">{formatCurrency(summary.totalBalance)}</p>
            </div>
          </div>

          <div className="list-surface">
            {accounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <AccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        account={editing}
      />
    </Page>
  );
}

export default Accounts;
