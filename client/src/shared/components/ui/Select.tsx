import { useId } from 'react';
import clsx from 'clsx';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  className?: string;
}

export default function Select({ label, error, options = [], placeholder, className, ...props }: Props): JSX.Element {
  const errorId = useId();

  return (
    <div className="space-y-1">
      {label && <label className="field-label">{label}</label>}
      <select
        className={clsx(
          'field-base',
          error ? 'border-danger focus:ring-danger/30' : 'border-border-default',
          className
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
