import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

interface HintProps {
  children: React.ReactNode;
}

interface SwitchOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  tone?: string;
}

interface TypeSwitchProps {
  options: SwitchOption[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}

interface HintLineProps {
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function TransactionComposerPanel({ children, className }: PanelProps): JSX.Element {
  return <div className={clsx('panel-muted space-y-4 p-4', className)}>{children}</div>;
}

export function TransactionComposerHint({ children }: HintProps): JSX.Element {
  return <p className="text-xs text-accent-600">{children}</p>;
}

export function TransactionTypeSwitch({ options, value, onChange, className }: TypeSwitchProps): JSX.Element {
  return (
    <div
      className={clsx('flex overflow-hidden rounded-soft border border-border-default', className)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={onChange ? () => onChange(option.value) : undefined}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
              active
                ? 'bg-accent-600 text-white'
                : 'bg-surface-muted text-app-muted hover:bg-surface-strong hover:text-app',
              !onChange && 'cursor-default'
            )}
          >
            {Icon ? (
              <Icon className={clsx('h-3.5 w-3.5', active ? 'text-white' : option.tone)} />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ComposerHintLine({ icon: Icon, children }: HintLineProps): JSX.Element {
  return (
    <TransactionComposerHint>
      <span className="inline-flex items-center gap-1">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {children}
      </span>
    </TransactionComposerHint>
  );
}
