import { Plus } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  onClick: () => void;
  className?: string;
}

export default function FloatingActionButton({ onClick, className }: Props): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-hero transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none',
        'bg-accent-600 text-white ring-4 ring-canvas/80 hover:bg-accent-700',
        'bottom-6 right-6 md:hidden',
        className
      )}
      aria-label="Agregar transacción"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
