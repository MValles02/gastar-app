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
        <label className="field-label">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'field-base',
          error
            ? 'border-danger focus:ring-danger/30'
            : 'border-border-default',
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
        <p className="text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
