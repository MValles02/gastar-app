import { Pencil, Trash2 } from 'lucide-react';

export default function CategoryList({ categories, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {categories.map(category => (
        <div
          key={category.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {category.name}
          </span>
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
  );
}
