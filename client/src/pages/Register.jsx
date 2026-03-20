import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';

function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-bold text-accent-600">Gastar</h1>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">Crea tu cuenta</p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}
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
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí tu contraseña"
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Crear cuenta
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Ya tenes cuenta?{' '}
          <Link to="/login" className="text-accent-600 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
