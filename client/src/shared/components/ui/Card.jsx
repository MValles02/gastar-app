import clsx from 'clsx';
import { childrenPropType, classNamePropType } from '../../utils/propTypes.js';

export default function Card({ children, className, ...props }) {
  return (
    <div className={clsx('panel p-6', className)} {...props}>
      {children}
    </div>
  );
}

Card.propTypes = {
  children: childrenPropType,
  className: classNamePropType,
};
