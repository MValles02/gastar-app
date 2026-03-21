import { AlertTriangle } from 'lucide-react';
import Button from './Button.jsx';
import MessageBanner from './MessageBanner.jsx';

export default function PageErrorState({
  title = 'No pudimos cargar esta pantalla',
  message,
  actionLabel = 'Reintentar',
  onAction,
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-950 dark:bg-gray-900">
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <MessageBanner message={message} />
        </div>
        {onAction && (
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
