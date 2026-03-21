import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import MessageBanner from '../components/ui/MessageBanner.jsx';
import { getErrorMessage } from '../utils/errors.js';

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
      setError(getErrorMessage(err, 'Error al crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Unificá tus movimientos diarios, categorías y reportes en el mismo espacio."
      footer={(
        <p>
          Ya tenés cuenta?{' '}
          <Link className="font-medium text-accent-600 transition-colors hover:text-accent-700" to="/login">
            Iniciá sesión
          </Link>
        </p>
      )}
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
      </form>
    </AuthShell>
  );
}

export default Register;
