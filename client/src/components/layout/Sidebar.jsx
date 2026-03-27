import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, HelpCircle, Plus, User, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOnboarding } from '../../context/OnboardingContext.jsx';
import { useTransactionModal } from '../../context/TransactionModalContext.jsx';
import GastarLogo from '../ui/GastarLogo.jsx';
import { navItems } from '../../constants/navigation.js';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  const { openModal } = useTransactionModal();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <aside className={clsx('hidden h-dvh shrink-0 p-4 pr-0 md:flex', collapsed ? 'w-24' : 'w-72')}>
      <div className="flex h-full flex-1 flex-col rounded-r-hero border border-border-default/80 bg-surface/72 p-3 shadow-panel-sm backdrop-blur-sm">
        <div className={clsx('flex items-center gap-2 px-2 py-2', collapsed && 'justify-center')}>
          {!collapsed && (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
                <GastarLogo className="h-6 w-6 flex-shrink-0" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-app-soft">
                  Workspace
                </p>
                <span className="text-lg font-semibold tracking-tight text-app">Gastar</span>
              </div>
            </>
          )}
          <button
            onClick={toggle}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={clsx('interactive-subtle p-2.5', !collapsed && 'ml-auto')}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-1 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-panel px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-muted text-app shadow-panel-sm'
                    : 'text-app-muted hover:bg-surface-muted/70 hover:text-app',
                  collapsed && 'justify-center px-2'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{label}</span>}
                  {isActive && <span className="sr-only">(página actual)</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-1 pb-2">
          <button
            onClick={() => openModal()}
            aria-label={collapsed ? 'Nueva transacción' : undefined}
            className={clsx(
              'flex w-full items-center gap-3 rounded-soft bg-accent-600 px-3 py-2.5 text-sm font-medium text-white shadow-panel-sm transition-colors hover:bg-accent-700',
              collapsed && 'justify-center px-2'
            )}
          >
            <Plus className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {!collapsed && <span>Nueva transacción</span>}
          </button>
        </div>

        <div className="space-y-1 border-t border-border-default/70 px-1 pt-3">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            className={clsx(
              'flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm text-app-muted transition-colors hover:bg-surface-muted hover:text-app',
              collapsed && 'justify-center px-2'
            )}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Sun className="h-5 w-5" aria-hidden="true" />
            )}
            {!collapsed && <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>}
          </button>

          {user ? (
            <NavLink
              to="/profile"
              aria-label={collapsed ? user.name : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-surface-muted text-app shadow-panel-sm'
                    : 'text-app-muted hover:bg-surface-muted hover:text-app',
                  collapsed && 'justify-center px-2'
                )
              }
            >
              <User className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{user.name}</span>}
            </NavLink>
          ) : null}

          <button
            onClick={openOnboarding}
            aria-label={collapsed ? 'Repetir tutorial' : undefined}
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
            aria-label={collapsed ? 'Cerrar sesión' : undefined}
            className={clsx(
              'flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm text-app-muted transition-colors hover:bg-danger-soft hover:text-danger',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
