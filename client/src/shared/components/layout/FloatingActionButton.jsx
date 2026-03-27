import { Plus } from 'lucide-react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { classNamePropType } from '../../utils/propTypes.js';

export default function FloatingActionButton({ onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-hero transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none',
        'bg-accent-600 text-white ring-4 ring-canvas/80 hover:bg-accent-700',
        'bottom-6 right-6 md:hidden',
        className
      )}
      aria-label="Agregar transacción"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

FloatingActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  className: classNamePropType,
};
