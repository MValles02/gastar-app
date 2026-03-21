import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, CalendarDays, Tag, Wallet } from 'lucide-react';
import Button from '../../ui/Button.jsx';
import { useOnboarding } from '../../../context/OnboardingContext.jsx';

function MockField({ label, value, icon: Icon }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />}
        <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
      </div>
    </div>
  );
}

export default function TutorialStep() {
  const { goToPrevStep, markComplete } = useOnboarding();

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Cómo registrar un movimiento
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Así se ve el formulario para agregar un nuevo movimiento.
      </p>

      {/* Mock transaction form */}
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 space-y-4">

        {/* Type switcher */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</p>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {[
              { label: 'Gasto', icon: ArrowDownCircle, active: true, color: 'text-red-500' },
              { label: 'Ingreso', icon: ArrowUpCircle, active: false, color: 'text-green-500' },
              { label: 'Transferencia', icon: ArrowLeftRight, active: false, color: 'text-blue-500' },
            ].map(({ label, icon: Icon, active, color }) => (
              <div
                key={label}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium ${
                  active
                    ? 'bg-accent-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : color}`} />
                {label}
              </div>
            ))}
          </div>
          <p className="text-xs text-accent-600 dark:text-accent-400">
            ← Elegí entre gasto, ingreso o transferencia entre cuentas
          </p>
        </div>

        <MockField label="Monto" value="$ 1.500,00" />

        <div className="space-y-1">
          <MockField label="Cuenta" value="Banco Nación" icon={Wallet} />
          <p className="text-xs text-accent-600 dark:text-accent-400">
            ← Seleccioná la cuenta afectada
          </p>
        </div>

        <div className="space-y-1">
          <MockField label="Categoría" value="Comida" icon={Tag} />
          <p className="text-xs text-accent-600 dark:text-accent-400">
            ← Elegí la categoría del movimiento
          </p>
        </div>

        <MockField label="Fecha" value="21 de marzo de 2026" icon={CalendarDays} />
      </div>

      {/* FAB hint */}
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-600 shadow-md">
          <Plus className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Para agregar un movimiento, tocá el botón <strong className="text-gray-900 dark:text-gray-100">+</strong> que aparece en la esquina de la pantalla en cualquier momento.
        </p>
      </div>

      <div className="mt-8 flex justify-between gap-3">
        <Button variant="secondary" onClick={goToPrevStep}>
          Atrás
        </Button>
        <Button size="lg" onClick={markComplete}>
          ¡Listo, empezar!
        </Button>
      </div>
    </div>
  );
}
