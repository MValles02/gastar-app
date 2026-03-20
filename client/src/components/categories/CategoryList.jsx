import { Pencil, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge.jsx';

export default function CategoryList({ categories, onEdit, onDelete }) {
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const renderGroup = (title, items, badgeColor) => (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map(category => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <Badge color={badgeColor}>{category.type === 'income' ? 'Ingreso' : 'Gasto'}</Badge>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {category.name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(category)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(category)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {incomeCategories.length > 0 && renderGroup('Ingresos', incomeCategories, 'green')}
      {expenseCategories.length > 0 && renderGroup('Gastos', expenseCategories, 'red')}
    </div>
  );
}
