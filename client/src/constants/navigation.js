import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  BarChart3,
} from 'lucide-react';

export const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Panel' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/accounts', icon: Wallet, label: 'Cuentas' },
  { to: '/categories', icon: Tag, label: 'Categorías' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
];
