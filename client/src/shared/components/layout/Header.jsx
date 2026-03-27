import { Menu } from 'lucide-react';
import PropTypes from 'prop-types';
import GastarLogo from '../ui/GastarLogo.jsx';

export default function Header({ onMenuOpen }) {
  return (
    <header className="border-b border-border-default/80 bg-canvas-elevated/88 px-4 py-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
            <GastarLogo className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-soft">
              Workspace
            </p>
            <h1 className="text-base font-semibold tracking-tight text-app">Gastar</h1>
          </div>
        </div>

        <button onClick={onMenuOpen} aria-label="Abrir menú" className="interactive-subtle p-2.5">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

Header.propTypes = {
  onMenuOpen: PropTypes.func.isRequired,
};
