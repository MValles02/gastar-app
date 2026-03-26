import clsx from 'clsx';
import PropTypes from 'prop-types';
import { childrenPropType, classNamePropType } from '../../utils/propTypes.js';

export function Page({ children, className }) {
  return <section className={clsx('page-shell', className)}>{children}</section>;
}

export function Section({ children, className }) {
  return <section className={clsx('space-y-4', className)}>{children}</section>;
}

Page.propTypes = {
  children: childrenPropType,
  className: classNamePropType,
};

Section.propTypes = {
  children: childrenPropType,
  className: classNamePropType,
};
