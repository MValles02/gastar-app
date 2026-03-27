import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-accent-600 text-white shadow-panel-sm hover:bg-accent-700 focus:ring-accent-400',
  secondary:
    'border border-border-default bg-surface text-app hover:bg-surface-muted focus:ring-accent-400',
  danger: 'bg-danger text-white shadow-panel-sm hover:brightness-95 focus:ring-danger/60',
  ghost: 'text-app-muted hover:bg-surface-muted hover:text-app focus:ring-accent-400',
};

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}: Props): JSX.Element {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-soft font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
