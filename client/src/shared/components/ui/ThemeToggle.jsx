import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { classNamePropType } from '../../utils/propTypes.js';

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      className={clsx(
        'interactive-subtle border border-border-default bg-surface p-2.5 shadow-panel-sm',
        className
      )}
    >
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

ThemeToggle.propTypes = {
  className: classNamePropType,
};
