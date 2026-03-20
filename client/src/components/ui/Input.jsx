import clsx from 'clsx';

export default function Input({
  label,
  error,
  icon: Icon,
  className,
  ...props
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <input
          className={clsx(
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
            'dark:bg-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
            error
              ? 'border-red-300 dark:border-red-600'
              : 'border-gray-300 dark:border-gray-600',
            Icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
