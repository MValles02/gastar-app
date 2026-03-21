import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/categories.js';
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
import CategoryList from '../components/categories/CategoryList.jsx';
import CategoryModal from '../components/categories/CategoryModal.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

function Categories() {
  const { triggerRefresh } = useTransactionModal();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const handleDelete = async (category) => {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    try {
      await deleteCategory(category.id);
      await load();
      triggerRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
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

  if (loading) return <Spinner className="py-12" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categorías</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Sin categorías"
          description="Creá tu primera categoría para organizar tus transacciones."
          actionLabel="Agregar categoría"
          onAction={handleCreate}
        />
      ) : (
        <CategoryList
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        category={editing}
      />
    </div>
  );
}

export default Categories;
