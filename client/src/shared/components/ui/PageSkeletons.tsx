import { Skeleton } from './Skeleton.js';

export function DashboardSkeleton(): JSX.Element {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-5">
          <Skeleton className="h-12 w-48" />
          <div className="metric-strip">
            <Skeleton className="h-20 rounded-panel" />
            <Skeleton className="h-20 rounded-panel" />
            <Skeleton className="h-20 rounded-panel" />
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-72 rounded-hero" />
          <Skeleton className="h-72 rounded-hero" />
        </div>
      </div>
    </div>
  );
}

interface ListPageSkeletonProps {
  metricCount?: number;
}

export function ListPageSkeleton({ metricCount = 2 }: ListPageSkeletonProps): JSX.Element {
  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-24 rounded-soft" />
      </div>

      <div className="space-y-6">
        {metricCount > 0 && (
          <div className="metric-strip">
            {Array.from({ length: metricCount }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-panel" />
            ))}
          </div>
        )}

        <div className="list-surface">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="list-row">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-panel" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
