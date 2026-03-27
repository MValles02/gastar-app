import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth.js';
import AuthShell from '../components/AuthShell.js';
import Input from '../../../shared/components/ui/Input.js';
import Button from '../../../shared/components/ui/Button.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';

function Register(): JSX.Element {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Unificá tus movimientos diarios, categorías y reportes en el mismo espacio."
      footer={
        <p>
          Ya tenés cuenta?{' '}
          <Link
            className="font-medium text-accent-600 transition-colors hover:text-accent-700"
            to="/login"
          >
            Iniciá sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <MessageBanner message={error} />
        <Input
          label="Nombre"
          type="text"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
        />
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
        <Input
          label="Contraseña"
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
          Crear cuenta
        </Button>
        <div className="relative my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-default" />
          <span className="text-xs text-app-muted">o</span>
          <div className="h-px flex-1 bg-border-default" />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            window.location.href = '/api/auth/google';
          }}
        >
          <GoogleIcon />
          Registrarse con Google
        </Button>
      </form>
    </AuthShell>
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default Register;
