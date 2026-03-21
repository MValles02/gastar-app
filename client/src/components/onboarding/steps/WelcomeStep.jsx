import { Wallet, Tag, ArrowLeftRight } from 'lucide-react';
import Button from '../../ui/Button.jsx';
import GastarLogo from '../../ui/GastarLogo.jsx';
import { useOnboarding } from '../../../context/OnboardingContext.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';

const features = [
  { icon: Wallet, text: 'Crear tus cuentas (banco, efectivo, tarjeta)' },
  { icon: Tag, text: 'Configurar tus categorías de gastos e ingresos' },
  { icon: ArrowLeftRight, text: 'Aprender a registrar movimientos' },
];

export default function WelcomeStep() {
  const { goToNextStep, markComplete } = useOnboarding();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-50 dark:bg-accent-950">
        <GastarLogo className="h-12 w-12" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Bienvenido a Gastar{user?.name ? `, ${user.name}` : ''}
      </h1>
      <p className="mt-3 text-gray-500 dark:text-gray-400">
        En unos pocos pasos vas a configurar tu cuenta para empezar a registrar tus finanzas.
      </p>

      <div className="mt-8 w-full space-y-3 text-left">
        {features.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-100 dark:bg-accent-950">
              <Icon className="h-5 w-5 text-accent-600" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Button size="lg" className="w-full" onClick={goToNextStep}>
          Empezar
        </Button>
        <button
          onClick={markComplete}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  );
}
