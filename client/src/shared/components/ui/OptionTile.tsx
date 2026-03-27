import clsx from 'clsx';

interface Props {
  selected?: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function OptionTile({
  selected = false,
  onClick,
  title,
  description,
  children,
  className,
}: Props): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        'w-full rounded-panel border p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200',
        selected
          ? 'border-accent-500 bg-surface-muted shadow-panel-sm'
          : 'border-border-default bg-surface hover:border-border-strong hover:bg-surface-muted',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-accent-600 bg-accent-600' : 'border-border-strong bg-surface'
          )}
        >
          <div
            className={clsx(
              'h-2 w-2 rounded-full bg-surface transition-opacity duration-200',
              selected ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app">{title}</p>
          {description ? <p className="mt-1 text-xs text-app-muted">{description}</p> : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </button>
  );
}
