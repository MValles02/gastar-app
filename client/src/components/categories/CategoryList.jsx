import { Pencil, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { categoryShape } from '../../utils/propTypes.js';

export default function CategoryList({ categories, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {categories.map(category => (
        <div
          key={category.id}
          className="panel flex items-center justify-between p-3"
        >
          <span className="text-sm font-medium text-app">
            {category.name}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(category)}
              className="interactive-subtle p-1.5"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="rounded-soft p-1.5 text-app-soft transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

CategoryList.propTypes = {
  categories: PropTypes.arrayOf(categoryShape).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
