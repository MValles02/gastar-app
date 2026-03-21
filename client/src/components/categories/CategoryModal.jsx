import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import IconPicker from '../ui/IconPicker.jsx';
import MessageBanner from '../ui/MessageBanner.jsx';
import { getErrorMessage } from '../../utils/errors.js';
import { categoryShape } from '../../utils/propTypes.js';

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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <MessageBanner message={error} />
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Comida, Salario"
          error={errors.name}
        />
        <IconPicker value={icon} onChange={setIcon} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

CategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  category: categoryShape,
};
