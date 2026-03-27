import Modal from '../ui/Modal.js';
import Button from '../ui/Button.js';

interface Props {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  submitLabel?: string;
  children?: React.ReactNode;
}

export default function ResourceModal({
  title,
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  submitLabel = 'Guardar',
  children,
}: Props): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={onSubmit}>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
