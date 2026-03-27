import PropTypes from 'prop-types';
import { Skeleton } from '../ui/Skeleton.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function ResourceList({
  items,
  renderItem,
  isLoading = false,
  emptyState,
  keyExtractor,
}) {
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!items?.length)
    return emptyState ?? <EmptyState title="No hay elementos para mostrar" />;

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

ResourceList.propTypes = {
  items: PropTypes.array,
  renderItem: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  emptyState: PropTypes.node,
  keyExtractor: PropTypes.func.isRequired,
};
