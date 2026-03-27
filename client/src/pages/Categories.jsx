import { useCallback, useEffect, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categories.js';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { Page } from '../components/layout/Page.jsx';
import CategoryList from '../components/categories/CategoryList.jsx';
import CategoryModal from '../components/categories/CategoryModal.jsx';
import Button from '../components/ui/Button.jsx';
import { ListPageSkeleton } from '../components/ui/PageSkeletons.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageErrorState from '../components/ui/PageErrorState.jsx';
import { getErrorMessage } from '../utils/errors.js';

function Categories() {
  const { triggerRefresh } = useTransactionModal();
  const { showAlert, showConfirm } = useDialog();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'No pudimos cargar las categorías.'));
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

  const handleEdit = (category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const handleDelete = async (category) => {
    const confirmed = await showConfirm({
      title: 'Eliminar categoría',
      message: `Se eliminará la categoría "${category.name}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await deleteCategory(category.id);
      await load();
      triggerRefresh();
    } catch (err) {
      await showAlert({
        title: 'No pudimos eliminar la categoría',
        message: getErrorMessage(err, 'Error al eliminar la categoría.'),
      });
    }
  };

  const handleSubmit = async (data) => {
    if (editing) {
      await updateCategory(editing.id, data);
    } else {
      await createCategory(data);
    }

    await load();
    triggerRefresh();
  };

  if (loading) return <ListPageSkeleton metricCount={0} />;
  if (loadError)
    return (
      <PageErrorState
        title="No pudimos cargar las categorías"
        message={loadError}
        onAction={load}
      />
    );

  return (
    <Page>
      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Sin categorías"
          description="Creá tu primera categoría para organizar tus transacciones."
          actionLabel="Agregar categoría"
          onAction={handleCreate}
        />
      ) : (
        <div className="space-y-6">
          <div className="metric-card">
            <p className="metric-label">Categorías activas</p>
            <p className="mt-2 text-2xl font-semibold text-app">{categories.length}</p>
            <p className="mt-1 text-sm text-app-muted">
              Mantené una estructura corta y clara para que reportes y filtros sigan siendo
              legibles.
            </p>
          </div>
          <div className="section-heading">
            <h3 className="section-title">Mis categorías</h3>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>

          <CategoryList categories={categories} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
      )}

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        category={editing}
      />
    </Page>
  );
}

export default Categories;
