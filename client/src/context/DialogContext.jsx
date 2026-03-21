import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import MessageBanner from '../components/ui/MessageBanner.jsx';
import { childrenPropType } from '../utils/propTypes.js';

const DialogContext = createContext(null);

const INITIAL_STATE = {
  open: false,
  variant: 'alert',
  title: '',
  message: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
  destructive: false,
  resolve: null,
};

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(INITIAL_STATE);

  const closeDialog = useCallback((result) => {
    setDialog((current) => {
      current.resolve?.(result);
      return INITIAL_STATE;
    });
  }, []);

  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        variant: 'alert',
        title: options.title ?? 'Aviso',
        message: options.message ?? '',
        confirmLabel: options.confirmLabel ?? 'Aceptar',
        cancelLabel: 'Cancelar',
        destructive: false,
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        open: true,
        variant: 'confirm',
        title: options.title ?? 'Confirmar acción',
        message: options.message ?? '',
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        destructive: Boolean(options.destructive),
        resolve,
      });
    });
  }, []);

  const value = useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal isOpen={dialog.open} onClose={() => closeDialog(false)} title={dialog.title} className="max-w-sm">
        <div className="space-y-5">
          <MessageBanner
            message={dialog.message}
            variant={dialog.variant === 'confirm' && dialog.destructive ? 'error' : 'info'}
          />
          <div className="flex justify-end gap-2">
            {dialog.variant === 'confirm' && (
              <Button type="button" variant="secondary" onClick={() => closeDialog(false)}>
                {dialog.cancelLabel}
              </Button>
            )}
            <Button
              type="button"
              variant={dialog.destructive ? 'danger' : 'primary'}
              onClick={() => closeDialog(true)}
            >
              {dialog.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}

DialogProvider.propTypes = {
  children: childrenPropType,
};
