import ThemeToggle from '../ui/ThemeToggle.jsx';

export default function Header({ title }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 md:hidden">
      <h1 className="text-lg font-bold text-accent-600">{title || 'Gastar'}</h1>
      <ThemeToggle />
    </header>
  );
}
