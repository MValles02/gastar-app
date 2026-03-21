import { LogOut, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOnboarding } from '../../context/OnboardingContext.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import GastarLogo from '../ui/GastarLogo.jsx';

export default function Header({ title }) {
  const { logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  return (
    <header className="border-b border-border-default bg-canvas-elevated/90 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <GastarLogo className="h-6 w-6" />
        <h1 className="text-lg font-semibold tracking-tight text-accent-600">{title || 'Gastar'}</h1>
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
    </header>
  );
}
