import clsx from 'clsx';

const colorMap = {
  green: 'bg-success-soft text-success',
  red: 'bg-danger-soft text-danger',
  blue: 'bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
  gray: 'bg-surface-muted text-app-muted',
};

type Color = keyof typeof colorMap;

interface Props {
  children?: React.ReactNode;
  color?: Color;
  className?: string;
}

export default function Badge({ children, color = 'gray', className }: Props): JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em]',
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
