import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return <div className={clsx('animate-pulse rounded-soft bg-surface-muted', className)} />;
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps): JSX.Element {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={clsx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
