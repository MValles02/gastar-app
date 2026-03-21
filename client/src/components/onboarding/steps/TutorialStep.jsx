import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, CalendarDays, Tag, Wallet } from 'lucide-react';
import PropTypes from 'prop-types';
import Button from '../../ui/Button.jsx';
import { useOnboarding } from '../../../context/OnboardingContext.jsx';
import { iconPropType } from '../../../utils/propTypes.js';

function MockField({ label, value, icon: Icon }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-app-muted">{label}</p>
      <div className="panel-muted flex items-center gap-2 px-3 py-2.5">
        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-app-soft" />}
        <span className="text-sm text-app">{value}</span>
      </div>
    </div>
  );
}

MockField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  icon: iconPropType,
};

export default function TutorialStep() {
  const { goToPrevStep, markComplete } = useOnboarding();

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-app">
        Cómo registrar un movimiento
      </h2>
      <p className="mt-1 text-sm text-app-muted">
        Así se ve el formulario para agregar un nuevo movimiento.
      </p>

      <div className="panel mt-5 space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-app-muted">Tipo</p>
          <div className="flex overflow-hidden rounded-soft border border-border-default">
            {[
              { label: 'Gasto', icon: ArrowDownCircle, active: true, color: 'text-danger' },
              { label: 'Ingreso', icon: ArrowUpCircle, active: false, color: 'text-success' },
              { label: 'Transferencia', icon: ArrowLeftRight, active: false, color: 'text-accent-600 dark:text-accent-300' },
            ].map(({ label, icon: Icon, active, color }) => (
              <div
                key={label}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium ${
                  active
                    ? 'bg-accent-600 text-white'
                    : 'bg-surface-muted text-app-muted'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : color}`} />
                {label}
              </div>
            ))}
          </div>
          <p className="text-xs text-accent-600">
            Elegí entre gasto, ingreso o transferencia entre cuentas
          </p>
        </div>

        <MockField label="Monto" value="$ 1.500,00" />

        <div className="space-y-1">
          <MockField label="Cuenta" value="Banco Nación" icon={Wallet} />
          <p className="text-xs text-accent-600">
            Seleccioná la cuenta afectada
          </p>
        </div>

        <div className="space-y-1">
          <MockField label="Categoría" value="Comida" icon={Tag} />
          <p className="text-xs text-accent-600">
            Elegí la categoría del movimiento
          </p>
        </div>

        <MockField label="Fecha" value="21 de marzo de 2026" icon={CalendarDays} />
      </div>

      <div className="panel-muted mt-6 flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-600 shadow-panel-sm">
          <Plus className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-app-muted">
          Para agregar un movimiento, tocá el botón <strong className="text-app">+</strong> que aparece en la esquina de la pantalla en cualquier momento.
        </p>
      </div>

      <div className="mt-8 flex justify-between gap-3">
        <Button variant="secondary" onClick={goToPrevStep}>
          Atrás
        </Button>
        <Button size="lg" onClick={markComplete}>
          Listo, empezar
        </Button>
      </div>
    </div>
  );
}
