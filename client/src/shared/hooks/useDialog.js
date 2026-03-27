import { useContext } from 'react';
import { DialogContext } from '../contexts/DialogContext.jsx';

export function useDialog() {
  const { showAlert, showConfirm } = useContext(DialogContext);

  const confirm = ({ title, message, confirmLabel = 'Confirmar', onConfirm, ...rest }) => {
    return showConfirm({ title, message, confirmLabel, ...rest }).then((result) => {
      if (result && onConfirm) onConfirm();
      return result;
    });
  };

  const alert = (options) => showAlert(options);

  return { confirm, alert, showAlert, showConfirm };
}
