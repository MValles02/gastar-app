import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const variants = {
  error: {
    wrapper: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    icon: AlertCircle,
  },
  success: {
    wrapper: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  info: {
    wrapper: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    icon: Info,
  },
};

export default function MessageBanner({ message, variant = 'error', className }) {
  if (!message) return null;

  const config = variants[variant] ?? variants.error;
  const Icon = config.icon;

  return (
    <div className={clsx('rounded-lg p-3 text-sm', config.wrapper, className)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}
