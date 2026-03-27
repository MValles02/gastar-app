import clsx from 'clsx';
import PropTypes from 'prop-types';
import { childrenPropType, classNamePropType, iconPropType } from '../../utils/propTypes.js';

export function TransactionComposerPanel({ children, className }) {
  return <div className={clsx('panel-muted space-y-4 p-4', className)}>{children}</div>;
}

export function TransactionComposerHint({ children }) {
  return <p className="text-xs text-accent-600">{children}</p>;
}

export function TransactionTypeSwitch({ options, value, onChange, className }) {
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

export function ComposerHintLine({ icon: Icon, children }) {
  return (
    <TransactionComposerHint>
      <span className="inline-flex items-center gap-1">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {children}
      </span>
    </TransactionComposerHint>
  );
}

TransactionComposerPanel.propTypes = {
  children: childrenPropType,
  className: classNamePropType,
};

TransactionComposerHint.propTypes = {
  children: childrenPropType,
};

TransactionTypeSwitch.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: iconPropType,
      tone: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  className: classNamePropType,
};

ComposerHintLine.propTypes = {
  icon: iconPropType,
  children: childrenPropType,
};
