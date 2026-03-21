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
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors text-sm font-semibold leading-none',
                  isPast && 'border-accent-600 bg-accent-600 text-white',
                  isCurrent && 'border-accent-600 bg-white text-accent-600 dark:bg-gray-950',
                  !isPast && !isCurrent && 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-950'
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={clsx(
                  'text-xs font-medium hidden sm:block text-center',
                  isCurrent ? 'text-accent-600' : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'h-0.5 mt-4 flex-1',
                  index < currentStep ? 'bg-accent-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
