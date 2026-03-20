import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import api from '../services/api.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

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
      setError(err.response?.data?.error || 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-accent-600">Gastar</h1>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">Recupera tu contrasena</p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
                <Mail className="h-6 w-6 text-accent-600" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Revisa tu correo
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Si el correo existe, te enviamos un enlace para restablecer tu contrasena.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                  {error}
                </div>
              )}
              <Input
                label="Correo electronico"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
              <Button type="submit" loading={loading} className="w-full">
                Enviar enlace de recuperacion
              </Button>
            </form>
          )}
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

export default ForgotPassword;
