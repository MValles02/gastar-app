import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  size?: Size;
  className?: string;
}

export default function Spinner({ size = 'md', className }: Props): JSX.Element {
  const sizeClass: Record<Size, string> = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div role="status" className={clsx('flex items-center justify-center', className)}>
      <Loader2 className={clsx('animate-spin text-accent-600', sizeClass[size])} />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
