import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import api from '../services/api.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

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
      setError('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { state: { message: 'Contrasena actualizada. Inicia sesion.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contrasena');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Enlace invalido.</p>
          <Link to="/login" className="mt-2 inline-block text-sm text-accent-600 hover:underline">
            Volver al inicio de sesion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-accent-600">Gastar</h1>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">Crea una nueva contrasena</p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}
            <Input
              label="Nueva contrasena"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              required
            />
            <Input
              label="Confirmar contrasena"
              type="password"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeti tu contrasena"
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Restablecer contrasena
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-accent-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
