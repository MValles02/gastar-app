import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import api from '../services/api.js';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import MessageBanner from '../components/ui/MessageBanner.jsx';
import { getErrorMessage } from '../utils/errors.js';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { state: { message: 'Contraseña actualizada. Iniciá sesión.' } });
    } catch (err) {
      setError(getErrorMessage(err, 'Error al restablecer la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Enlace inválido"
        subtitle="Este acceso ya no está disponible o fue abierto sin token."
        footer={
          <Link
            className="inline-flex items-center gap-1 font-medium text-accent-600 transition-colors hover:text-accent-700"
            to="/login"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        }
      >
        <p className="text-sm text-app-muted">
          Pedí un nuevo enlace de recuperación para continuar.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Creá una nueva contraseña"
      subtitle="Elegí una clave nueva para volver a entrar con seguridad."
      footer={
        <Link
          className="inline-flex items-center gap-1 font-medium text-accent-600 transition-colors hover:text-accent-700"
          to="/login"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <MessageBanner message={error} />
        <Input
          label="Nueva contraseña"
          type="password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          required
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          icon={Lock}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repetí tu contraseña"
          minLength={6}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Restablecer contraseña
        </Button>
      </form>
    </AuthShell>
  );
}

export default ResetPassword;
