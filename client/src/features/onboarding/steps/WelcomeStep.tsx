import { Wallet, Tag, ArrowLeftRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Button from '../../../shared/components/ui/Button.js';
import GastarLogo from '../../../shared/components/ui/GastarLogo.js';
import { useOnboarding } from '../OnboardingContext.js';
import { useAuth } from '../../../shared/hooks/useAuth.js';

const features: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Wallet, text: 'Crear tus cuentas principales: banco, efectivo o tarjeta.' },
  { icon: Tag, text: 'Definir categorías limpias para ingresos y gastos.' },
  { icon: ArrowLeftRight, text: 'Aprender a registrar movimientos sin perder contexto.' },
];

export default function WelcomeStep(): JSX.Element {
  const { goToNextStep, markComplete } = useOnboarding();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-hero bg-accent-50 dark:bg-accent-950">
        <GastarLogo className="h-12 w-12" />
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-app">
        Bienvenido a Gastar{user?.name ? `, ${user.name}` : ''}
      </h1>
      <p className="mt-3 max-w-xl text-sm text-app-muted">
        En pocos pasos vas a dejar tu espacio listo para registrar finanzas con una estructura
        consistente.
      </p>

      <div className="mt-8 w-full space-y-3 text-left">
        {features.map(({ icon: Icon, text }) => (
          <div key={text} className="panel-muted flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-soft bg-surface">
              <Icon className="h-5 w-5 text-accent-600" />
            </div>
            <span className="text-sm text-app">{text}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Button size="lg" className="w-full" onClick={goToNextStep}>
          Empezar
        </Button>
        <button
          onClick={markComplete}
          className="text-sm text-app-soft transition-colors hover:text-app"
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  );
}
