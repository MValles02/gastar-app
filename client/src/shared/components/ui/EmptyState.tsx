import Button from './Button.js';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props): JSX.Element {
  return (
    <div className="panel flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 dark:bg-accent-950">
          <Icon className="h-8 w-8 text-accent-600" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-app">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-app-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
