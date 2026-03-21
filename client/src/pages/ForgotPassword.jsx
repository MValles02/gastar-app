import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import api from '../services/api.js';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import MessageBanner from '../components/ui/MessageBanner.jsx';
import { getErrorMessage } from '../utils/errors.js';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al enviar el correo'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recuperá tu contraseña"
      subtitle="Te enviamos un enlace seguro para volver a entrar a tu cuenta."
      footer={(
        <Link className="inline-flex items-center gap-1 font-medium text-accent-600 transition-colors hover:text-accent-700" to="/login">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      )}
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 dark:bg-accent-950">
            <Mail className="h-6 w-6 text-accent-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-app">Revisá tu correo</h3>
            <p className="text-sm text-app-muted">
              Si el correo existe, te enviamos un enlace para restablecer tu contraseña.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <MessageBanner message={error} />
          <Input
            label="Correo electrónico"
            type="email"
            inputMode="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Enviar enlace de recuperación
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
