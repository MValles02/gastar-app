import clsx from 'clsx';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export default function Card({ children, className, ...props }: Props): JSX.Element {
  return (
    <div className={clsx('panel p-6', className)} {...props}>
      {children}
    </div>
  );
}
