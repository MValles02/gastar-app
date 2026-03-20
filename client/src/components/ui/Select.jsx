import clsx from 'clsx';

export default function Select({
  label,
  error,
  options = [],
  placeholder,
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
      <select
        className={clsx(
          'block w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
          'dark:bg-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
          error
            ? 'border-red-300 dark:border-red-600'
            : 'border-gray-300 dark:border-gray-600',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
