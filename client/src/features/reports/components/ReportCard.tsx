import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
}

export default function ReportCard({ icon: Icon, title, description, to }: Props): JSX.Element {
  return (
    <Link
      to={to}
      className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-muted"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-soft bg-surface-muted text-accent-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-app">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-app-muted">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-app-muted" />
    </Link>
  );
}
