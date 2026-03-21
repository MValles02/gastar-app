import clsx from 'clsx';
import PropTypes from 'prop-types';
import { childrenPropType, classNamePropType } from '../../utils/propTypes.js';

export function Page({ children, className }) {
  return <section className={clsx('page-shell', className)}>{children}</section>;
}

export function PageHeader({ title, description, actions, className }) {
  return (
    <header className={clsx('page-header', className)}>
      <div className="space-y-1.5">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function Section({ children, className }) {
  return <section className={clsx('space-y-4', className)}>{children}</section>;
}

Page.propTypes = {
  children: childrenPropType,
  className: classNamePropType,
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  className: classNamePropType,
};

Section.propTypes = {
  children: childrenPropType,
  className: classNamePropType,
};
