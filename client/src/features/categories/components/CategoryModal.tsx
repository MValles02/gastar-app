import { useEffect, useState } from 'react';
import ResourceModal from '../../../shared/components/compound/ResourceModal.js';
import Input from '../../../shared/components/ui/Input.js';
import IconPicker from '../../../shared/components/ui/IconPicker.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import type { Category } from '../../../shared/types/domain.types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; icon?: string }) => Promise<void>;
  category?: Category | null;
}

export default function CategoryModal({ isOpen, onClose, onSubmit, category }: Props): JSX.Element {
  const isEdit = Boolean(category);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon || '');
    } else {
      setName('');
      setIcon('');
    }

    setError('');
    setErrors({});
  }, [category, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nextErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextErrors.name = 'Ingresá un nombre para la categoría';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await onSubmit({ name, icon: icon || undefined });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar la categoría'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResourceModal
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <MessageBanner message={error} />
      <Input
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Comida, Salario"
        error={errors.name}
      />
      <IconPicker value={icon} onChange={setIcon} />
    </ResourceModal>
  );
}
