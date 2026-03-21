import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  BarChart3,
} from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Panel' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/accounts', icon: Wallet, label: 'Cuentas' },
  { to: '/categories', icon: Tag, label: 'Categorías' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
];

export default function BottomTabBar() {
  return (
    <nav
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-default/80 bg-canvas-elevated/92 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-1.5">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex min-w-[4.2rem] flex-col items-center gap-1 rounded-soft px-2 py-2 text-[0.72rem] font-medium transition-colors',
                isActive
                  ? 'bg-surface text-app shadow-panel-sm'
                  : 'text-app-soft'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
