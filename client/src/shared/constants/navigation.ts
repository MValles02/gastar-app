import { LayoutDashboard, ArrowLeftRight, Wallet, Tag, BarChart3, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Panel' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
  { to: '/accounts', icon: Wallet, label: 'Cuentas' },
  { to: '/categories', icon: Tag, label: 'Categorías' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
];
