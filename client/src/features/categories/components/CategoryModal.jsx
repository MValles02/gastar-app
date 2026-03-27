import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ResourceModal from '../../../shared/components/compound/ResourceModal.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import IconPicker from '../../../shared/components/ui/IconPicker.jsx';
import MessageBanner from '../../../shared/components/ui/MessageBanner.jsx';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { categoryShape } from '../../../shared/utils/propTypes.js';

export default function CategoryModal({ isOpen, onClose, onSubmit, category }) {
  const isEdit = Boolean(category);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nextErrors = {};

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

CategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  category: categoryShape,
};
