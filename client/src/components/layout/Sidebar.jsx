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
} from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
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
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col h-dvh sticky top-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={clsx('flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 p-4', collapsed && 'justify-center')}>
        {!collapsed && (
          <>
            <GastarLogo className="h-6 w-6 flex-shrink-0" />
            <span className="text-lg font-bold text-accent-600">Gastar</span>
          </>
        )}
        <button
          onClick={toggle}
          className={clsx('rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800', !collapsed && 'ml-auto')}
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1">
        <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
          <ThemeToggle />
          {!collapsed && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </span>
          )}
        </div>

        {!collapsed && user && (
          <div className="px-3 py-1.5 text-xs text-gray-400 truncate">
            {user.name}
          </div>
        )}

        <button
          onClick={logout}
          className={clsx(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors',
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
