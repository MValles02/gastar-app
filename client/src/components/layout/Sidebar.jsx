import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOnboarding } from '../../context/OnboardingContext.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import GastarLogo from '../ui/GastarLogo.jsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Panel' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/accounts', icon: Wallet, label: 'Cuentas' },
  { to: '/categories', icon: Tag, label: 'Categorías' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { openOnboarding } = useOnboarding();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <aside
      className={clsx(
        'hidden md:flex h-dvh sticky top-0 flex-col border-r border-border-default bg-canvas-elevated transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={clsx('flex items-center gap-2 border-b border-border-default p-4', collapsed && 'justify-center')}>
        {!collapsed && (
          <>
            <GastarLogo className="h-6 w-6 flex-shrink-0" />
            <span className="text-lg font-semibold tracking-tight text-accent-600">Gastar</span>
          </>
        )}
        <button
          onClick={toggle}
          className={clsx('interactive-subtle p-1.5', !collapsed && 'ml-auto')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-soft px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300'
                  : 'text-app-muted hover:bg-surface-muted hover:text-app',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border-default p-2">
        <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
          <ThemeToggle />
          {!collapsed && (
            <span className="text-sm text-app-muted">
              {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </span>
          )}
        </div>

        {!collapsed && user && (
          <div className="truncate px-3 py-1.5 text-xs text-app-soft">
            {user.name}
          </div>
        )}

        <button
          onClick={openOnboarding}
          className={clsx(
            'flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm text-app-muted transition-colors hover:bg-surface-muted hover:text-app',
            collapsed && 'justify-center px-2'
          )}
        >
          <HelpCircle className="h-5 w-5" />
          {!collapsed && <span>Repetir tutorial</span>}
        </button>

        <button
          onClick={logout}
          className={clsx(
            'flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm text-app-muted transition-colors hover:bg-danger-soft hover:text-danger',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
