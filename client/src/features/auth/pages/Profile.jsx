import { useState } from 'react';
import { User, Mail, DollarSign } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import { useDialog } from '../../../shared/contexts/DialogContext.jsx';
import { Page } from '../../../shared/components/layout/Page.jsx';
import { getErrorMessage } from '../../../shared/utils/errors.js';

export default function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMessage, setPrefMessage] = useState('');

  const handleCotizacionPreference = async (value) => {
    if (prefLoading || user?.cotizacionPreference === value) return;
    setPrefLoading(true);
    setPrefMessage('');
    try {
      await updateProfile({ cotizacionPreference: value });
      setPrefMessage('Preferencia guardada');
    } catch (err) {
      setPrefMessage(getErrorMessage(err, 'No se pudo guardar la preferencia'));
    } finally {
      setPrefLoading(false);
      setTimeout(() => setPrefMessage(''), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await showConfirm({
      title: 'Eliminar cuenta',
      message:
        'Esta acción eliminará tu cuenta y todos tus datos de forma permanente. No se puede deshacer.',
      confirmLabel: 'Eliminar cuenta',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await deleteAccount();
    } catch (err) {
      await showAlert({
        title: 'No pudimos eliminar la cuenta',
        message: getErrorMessage(err, 'Error al eliminar la cuenta.'),
      });
    }
  };

  return (
    <Page>
      <div className="space-y-6">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600 dark:bg-accent-950">
              <User className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-app">{user?.name}</p>
              <p className="flex items-center gap-1.5 text-sm text-app-muted">
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 flex-shrink-0 text-app-muted" aria-hidden="true" />
            <p className="text-sm font-medium text-app">Preferencias de moneda</p>
          </div>

          <div>
            <p className="text-sm text-app-muted mb-3">
              Cotización del dólar sugerida al registrar transacciones en USD
            </p>
            <div className="flex gap-2">
              {['blue', 'oficial'].map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={prefLoading}
                  onClick={() => handleCotizacionPreference(option)}
                  className={[
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    user?.cotizacionPreference === option
                      ? 'bg-accent-600 text-white'
                      : 'bg-app-subtle text-app hover:bg-app-subtle/80',
                    prefLoading ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {option === 'blue' ? 'Blue' : 'Oficial'}
                </button>
              ))}
            </div>
            {prefMessage && <p className="mt-2 text-xs text-app-muted">{prefMessage}</p>}
          </div>
        </div>
        <div className="panel p-6 space-y-4 border border-red-200 dark:border-red-900">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Zona de peligro</p>
          <p className="text-sm text-app-muted">
            Eliminar tu cuenta borrará permanentemente todos tus datos: cuentas, transacciones y
            categorías.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Eliminar cuenta
          </button>
        </div>
      </div>
    </Page>
  );
}
