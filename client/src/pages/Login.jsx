import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import GastarLogo from '../components/ui/GastarLogo.jsx';
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
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-2 flex flex-col items-center gap-2">
          <GastarLogo className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-accent-600">Gastar</h1>
        </div>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">Iniciá sesión en tu cuenta</p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
              <Link to="/forgot-password" className="text-sm text-accent-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No tenes cuenta?{' '}
          <Link to="/register" className="text-accent-600 hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
