import clsx from 'clsx';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import GastarLogo from '../ui/GastarLogo.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import LegalLinks from './LegalLinks.jsx';
import { backLinkShape, childrenPropType, classNamePropType } from '../../utils/propTypes.js';

export default function AuthShell({ title, subtitle, children, footer, backLink, className }) {
  return (
    <div className="auth-backdrop relative flex min-h-screen items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <div className={clsx('w-full max-w-md', className)}>
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
            <GastarLogo className="h-9 w-9" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-accent-600">Gastar</h1>
            <p className="text-sm text-app-muted">{subtitle}</p>
          </div>
        </div>

        <div className="auth-shell">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-app">{title}</h2>
          </div>
          {children}
        </div>

        {(footer || backLink) && (
          <div className="mt-5 text-center text-sm text-app-muted">
            {footer}
            {!footer && backLink ? (
              <Link
                className="font-medium text-accent-600 transition-colors hover:text-accent-700"
                to={backLink.to}
              >
                {backLink.label}
              </Link>
            ) : null}
          </div>
        )}

        <LegalLinks className="mt-4" />
      </div>
    </div>
  );
}

AuthShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  children: childrenPropType,
  footer: PropTypes.node,
  backLink: backLinkShape,
  className: classNamePropType,
};
