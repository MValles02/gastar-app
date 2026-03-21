import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

export default function Header({ title }) {
  const { logout } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 md:hidden">
      <h1 className="text-lg font-bold text-accent-600">{title || 'Gastar'}</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={logout}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
