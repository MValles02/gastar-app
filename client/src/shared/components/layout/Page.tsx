import clsx from 'clsx';

interface Props {
  children?: React.ReactNode;
  className?: string;
}

export function Page({ children, className }: Props): JSX.Element {
  return <section className={clsx('page-shell', className)}>{children}</section>;
}

export function Section({ children, className }: Props): JSX.Element {
  return <section className={clsx('space-y-4', className)}>{children}</section>;
}
