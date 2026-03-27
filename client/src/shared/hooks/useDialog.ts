import { useContext } from 'react';
import { DialogContext } from '../contexts/DialogContext.js';
import type { DialogOptions } from '../contexts/DialogContext.js';

export interface ConfirmOptions extends DialogOptions {
  onConfirm?: () => void;
}

export interface UseDialogReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: DialogOptions) => Promise<boolean>;
  showAlert: (options: DialogOptions) => Promise<boolean>;
  showConfirm: (options: DialogOptions) => Promise<boolean>;
}

export function useDialog(): UseDialogReturn {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  const { showAlert, showConfirm } = ctx;

  const confirm = ({ onConfirm, ...rest }: ConfirmOptions): Promise<boolean> => {
    return showConfirm(rest).then((result) => {
      if (result && onConfirm) onConfirm();
      return result;
    });
  };

  const alert = (options: DialogOptions) => showAlert(options);

  return { confirm, alert, showAlert, showConfirm };
}
