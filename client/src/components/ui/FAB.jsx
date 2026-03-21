import { Plus } from 'lucide-react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { classNamePropType } from '../../utils/propTypes.js';

export default function FAB({ onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-hero transition-transform duration-200 hover:scale-105 active:scale-95',
        'bg-accent-600 text-white ring-4 ring-canvas/80 hover:bg-accent-700',
        'bottom-24 right-6 md:bottom-8 md:right-8',
        className
      )}
      aria-label="Agregar transacción"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

FAB.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: classNamePropType,
};
