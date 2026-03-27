import { useEffect, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, HelpCircle, User, Sun, Moon, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useOnboarding } from '../../contexts/OnboardingContext.jsx';
import GastarLogo from '../ui/GastarLogo.jsx';
import { navItems } from '../../constants/navigation.js';

export default function MobileDrawer({ isOpen, onClose }) {
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { openOnboarding } = useOnboarding();
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      if (drawerRef.current) {
        const first = drawerRef.current.querySelector('button, [href]');
        if (first) first.focus();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (triggerRef.current?.focus) triggerRef.current.focus();
    };
  }, [isOpen, handleKeyDown]);

  const footerButtonClass =
    'flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm text-app-muted transition-colors hover:bg-surface-muted hover:text-app';

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar menú"
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border-default/80 bg-surface/95 shadow-hero backdrop-blur-sm transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
            <GastarLogo className="h-5 w-5 flex-shrink-0" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-app-soft">
              Workspace
            </p>
            <span className="text-base font-semibold tracking-tight text-app">Gastar</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="interactive-subtle ml-auto p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-panel px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-app shadow-panel-sm'
                    : 'text-app-muted hover:bg-surface-muted/70 hover:text-app'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                  {isActive && <span className="sr-only">(página actual)</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="space-y-1 border-t border-border-default/70 px-3 py-3">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            className={footerButtonClass}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Sun className="h-5 w-5" aria-hidden="true" />
            )}
            <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
          </button>

          {user ? (
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-surface-muted text-app shadow-panel-sm'
                    : 'text-app-muted hover:bg-surface-muted hover:text-app'
                }`
              }
            >
              <User className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{user.name}</span>
            </NavLink>
          ) : null}

          <button
            onClick={() => {
              openOnboarding();
              onClose();
            }}
            className={footerButtonClass}
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
            <span>Repetir tutorial</span>
          </button>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-soft px-3 py-2 text-sm text-app-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}

MobileDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
