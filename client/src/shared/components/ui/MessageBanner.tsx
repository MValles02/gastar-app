import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const variants = {
  error: {
    wrapper: 'border border-danger/15 bg-danger-soft text-danger',
    icon: AlertCircle,
  },
  success: {
    wrapper: 'border border-success/15 bg-success-soft text-success',
    icon: CheckCircle2,
  },
  info: {
    wrapper:
      'border border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-900 dark:bg-accent-950 dark:text-accent-300',
    icon: Info,
  },
};

type Variant = keyof typeof variants;

interface Props {
  message?: string;
  variant?: Variant;
  className?: string;
}

export default function MessageBanner({ message, variant = 'error', className }: Props): JSX.Element | null {
  if (!message) return null;

  const config = variants[variant] ?? variants.error;
  const Icon = config.icon;

  return (
    <div className={clsx('rounded-soft p-3 text-sm', config.wrapper, className)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}
