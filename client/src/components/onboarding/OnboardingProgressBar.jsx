import { Fragment } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

const steps = ['Bienvenida', 'Cuentas', 'Categorías', 'Tutorial'];

export default function OnboardingProgressBar({ currentStep }) {
  return (
    <div className="flex items-start">
      {steps.map((label, index) => {
        const isPast = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <Fragment key={label}>
            <div className="flex w-10 flex-col items-center gap-1.5">
              <div
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold leading-none transition-colors',
                  isPast && 'border-accent-600 bg-accent-600 text-white',
                  isCurrent && 'border-accent-600 bg-surface text-accent-600',
                  !isPast && !isCurrent && 'border-border-strong bg-surface text-app-soft'
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={clsx(
                  'hidden text-center text-xs font-medium sm:block',
                  isCurrent ? 'text-accent-600' : 'text-app-soft'
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'mt-4 h-px flex-1',
                  index < currentStep ? 'bg-accent-600' : 'bg-border-default'
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
