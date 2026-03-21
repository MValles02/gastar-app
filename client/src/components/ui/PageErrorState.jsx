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
    <div className="panel border-danger/20 bg-surface p-6">
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-danger-soft text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-app">{title}</h2>
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
