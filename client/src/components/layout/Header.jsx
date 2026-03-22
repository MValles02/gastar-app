import { LogOut, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOnboarding } from '../../context/OnboardingContext.jsx';

import ThemeToggle from '../ui/ThemeToggle.jsx';
import GastarLogo from '../ui/GastarLogo.jsx';

const routeTitles = {
  '/': 'Panel',
  '/transactions': 'Transacciones',
  '/accounts': 'Cuentas',
  '/categories': 'Categorías',
  '/reports': 'Reportes',
};

export default function Header() {
  const { logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  const { pathname } = useLocation();
  const title = routeTitles[pathname] ?? 'Gastar';

  return (
    <header className="border-b border-border-default/80 bg-canvas-elevated/88 px-4 py-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
            <GastarLogo className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-soft">Workspace</p>
            <h1 className="text-base font-semibold tracking-tight text-app">{title || 'Gastar'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={openOnboarding}
            className="interactive-subtle p-1.5"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            onClick={logout}
            className="interactive-subtle p-1.5"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

