import clsx from 'clsx';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LegalLinks({
  variant = 'auth',
  includeBackLink = false,
  className,
}) {
  const { user } = useAuth();
  const backLink = user
    ? { to: '/', label: 'Volver a la app' }
    : { to: '/login', label: 'Volver al inicio de sesion' };

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-app-muted',
        className
      )}
    >
      {variant === 'app' ? (
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-app-soft">
          Legal
        </span>
      ) : null}
      <Link className="transition-colors hover:text-accent-600" to="/privacy">
        Politica de privacidad
      </Link>
      <span aria-hidden="true" className="text-app-soft">·</span>
      <Link className="transition-colors hover:text-accent-600" to="/terms">
        Terminos del servicio
      </Link>
      {includeBackLink ? (
        <>
          <span aria-hidden="true" className="text-app-soft">·</span>
          <Link className="transition-colors hover:text-accent-600" to={backLink.to}>
            {backLink.label}
          </Link>
        </>
      ) : null}
    </div>
  );
}

LegalLinks.propTypes = {
  variant: PropTypes.oneOf(['auth', 'app']),
  includeBackLink: PropTypes.bool,
  className: PropTypes.string,
};
