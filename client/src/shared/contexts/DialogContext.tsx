import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Modal from '../components/ui/Modal.js';
import Button from '../components/ui/Button.js';
import MessageBanner from '../components/ui/MessageBanner.js';

export interface DialogOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogContextValue {
  showAlert: (options: DialogOptions) => Promise<boolean>;
  showConfirm: (options: DialogOptions) => Promise<boolean>;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

type DialogVariant = 'alert' | 'confirm';

interface DialogState {
  open: boolean;
  variant: DialogVariant;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  resolve: ((value: boolean) => void) | null;
}

const INITIAL_STATE: DialogState = {
  open: false,
  variant: 'alert',
  title: '',
  message: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
  destructive: false,
  resolve: null,
};

interface Props {
  children: React.ReactNode;
}

export function DialogProvider({ children }: Props): JSX.Element {
  const [dialog, setDialog] = useState<DialogState>(INITIAL_STATE);

  const closeDialog = useCallback((result: boolean) => {
    setDialog((current) => {
      current.resolve?.(result);
      return INITIAL_STATE;
    });
  }, []);

  const showAlert = useCallback((options: DialogOptions): Promise<boolean> => {
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

  const showConfirm = useCallback((options: DialogOptions): Promise<boolean> => {
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
      <Modal
        isOpen={dialog.open}
        onClose={() => closeDialog(false)}
        title={dialog.title}
        className="max-w-sm"
      >
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

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
