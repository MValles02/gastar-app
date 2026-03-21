import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import MessageBanner from '../components/ui/MessageBanner.jsx';
import { AUTH_REDIRECT_MESSAGE_KEY } from '../services/api.js';
import { getErrorMessage } from '../utils/errors.js';

function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirectMessage = sessionStorage.getItem(AUTH_REDIRECT_MESSAGE_KEY);
    const navigationMessage = location.state?.message;
    setNotice(redirectMessage || navigationMessage || '');
    sessionStorage.removeItem(AUTH_REDIRECT_MESSAGE_KEY);
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Iniciá sesión"
      subtitle="Accedé a tus cuentas, movimientos y reportes desde una sola vista."
      footer={(
        <p>
          No tenés cuenta?{' '}
          <Link className="font-medium text-accent-600 transition-colors hover:text-accent-700" to="/register">
            Registrate
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <MessageBanner message={notice} variant="success" />
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
        <Input
          label="Contraseña"
          type="password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="******"
          required
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-accent-600 transition-colors hover:text-accent-700">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Iniciar sesión
        </Button>
      </form>
    </AuthShell>
  );
}

export default Login;
