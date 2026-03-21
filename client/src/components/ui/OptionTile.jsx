import clsx from 'clsx';

export default function OptionTile({
  selected = false,
  onClick,
  title,
  description,
  children,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full rounded-panel border p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200',
        selected
          ? 'border-accent-500 bg-accent-50 shadow-panel-sm dark:bg-accent-950/50'
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
