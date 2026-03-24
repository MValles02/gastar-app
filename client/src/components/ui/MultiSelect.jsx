import clsx from 'clsx';
import PropTypes from 'prop-types';
import { optionShape } from '../../utils/propTypes.js';

export default function MultiSelect({ label, options = [], value = [], onChange }) {
  const toggle = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <p className="field-label">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={clsx(
              'inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs font-medium transition-[background-color,color,border-color] duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-0',
              value.includes(opt.value)
                ? 'bg-accent-600 text-white'
                : 'border border-border-default bg-surface text-app-muted hover:bg-surface-muted hover:text-app'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

MultiSelect.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(optionShape),
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};
