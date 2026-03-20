import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function Spinner({ size = 'md', className }) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <Loader2 className={clsx('animate-spin text-accent-600', sizeClass[size])} />
    </div>
  );
}
