import { useCallback, useEffect, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categories.js';
import { useTransactionModal } from '../../../shared/contexts/TransactionModalContext.js';
import { useDialog } from '../../../shared/contexts/DialogContext.js';
import { Page } from '../../../shared/components/layout/Page.js';
import CategoryList from '../components/CategoryList.js';
import CategoryModal from '../components/CategoryModal.js';
import Button from '../../../shared/components/ui/Button.js';
import { ListPageSkeleton } from '../../../shared/components/ui/PageSkeletons.js';
import EmptyState from '../../../shared/components/ui/EmptyState.js';
import PageErrorState from '../../../shared/components/ui/PageErrorState.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import type { Category } from '../../../shared/types/domain.types.js';

function Categories(): JSX.Element {
  const { triggerRefresh } = useTransactionModal();
  const { showAlert, showConfirm } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

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
    void load();
  }, [load]);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
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

  const handleSubmit = async (data: { name: string; icon?: string }) => {
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
