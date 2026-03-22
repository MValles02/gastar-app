import { useId } from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { classNamePropType, iconPropType } from '../../utils/propTypes.js';

export default function Input({
  label,
  error,
  icon: Icon,
  className,
  ...props
}) {
  const errorId = useId();

  return (
    <div className="space-y-1">
      {label && (
        <label className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-app-soft" />
          </div>
        )}
        <input
          className={clsx(
            'field-base',
            error
              ? 'border-danger focus:ring-danger/30'
              : 'border-border-default',
            Icon && 'pl-10',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">{error}</p>
      )}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  icon: iconPropType,
  className: classNamePropType,
};
