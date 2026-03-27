import { Skeleton } from '../ui/Skeleton.js';
import EmptyState from '../ui/EmptyState.js';

interface Props<T> {
  items?: T[];
  renderItem: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  keyExtractor: (item: T) => string;
}

export default function ResourceList<T>({
  items,
  renderItem,
  isLoading = false,
  emptyState,
  keyExtractor,
}: Props<T>): JSX.Element {
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!items?.length)
    return <>{emptyState ?? <EmptyState title="No hay elementos para mostrar" />}</>;

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
