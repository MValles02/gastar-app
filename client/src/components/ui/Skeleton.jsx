import clsx from 'clsx';
import PropTypes from 'prop-types';
import { classNamePropType } from '../../utils/propTypes.js';

export function Skeleton({ className }) {
  return (
    <div
      className={clsx('animate-pulse rounded-soft bg-surface-muted', className)}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

Skeleton.propTypes = {
  className: classNamePropType,
};

SkeletonText.propTypes = {
  lines: PropTypes.number,
  className: classNamePropType,
};
