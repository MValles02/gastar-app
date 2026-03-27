import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import GastarLogo from '../components/ui/GastarLogo.jsx';
import LegalLinks from '../components/layout/LegalLinks.jsx';

export default function Terms() {
  return (
    <div className="auth-backdrop min-h-screen px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
            <GastarLogo className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold text-accent-600">Gastar</span>
        </div>

        <div className="auth-shell text-sm text-app">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-app">Terminos del Servicio</h1>
            <p className="mt-1 text-app-muted">Ultima actualizacion: marzo de 2026</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Section title="1. Aceptacion de los terminos">
              <p>
                Al crear una cuenta y usar Gastar, aceptas estos terminos y condiciones de uso.
                Si no estas de acuerdo, no uses la aplicacion.
              </p>
            </Section>

            <Section title="2. Descripcion del servicio">
              <p>
                Gastar es una aplicacion de seguimiento de finanzas personales que te permite registrar ingresos,
                gastos y transferencias entre tus propias cuentas, y visualizar resumenes de tu actividad financiera.
              </p>
            </Section>

            <Section title="3. Uso aceptable">
              <p>Al usar Gastar, te comprometes a:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Usar la aplicacion solo para fines personales y licitos</li>
                <li>No intentar acceder a cuentas de otros usuarios</li>
                <li>No realizar ingenieria inversa ni intentar vulnerar la seguridad del servicio</li>
                <li>Proveer informacion veraz al crear tu cuenta</li>
              </ul>
            </Section>

            <Section title="4. Tu cuenta">
              <p>
                Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad
                que ocurra bajo tu cuenta. Notificanos inmediatamente ante cualquier uso no autorizado.
              </p>
            </Section>

            <Section title="5. Tus datos">
              <p>
                Los datos financieros que ingresas en Gastar son tuyos. No los usamos para ningun fin
                distinto al de mostrartelos a vos. Ver nuestra{' '}
                <Link to="/privacy" className="text-accent-600 hover:underline">Politica de Privacidad</Link>{' '}
                para mas detalles sobre como manejamos tu informacion.
              </p>
            </Section>

            <Section title="6. Disponibilidad del servicio">
              <p>
                Gastar se ofrece &ldquo;tal como esta&rdquo;. No garantizamos disponibilidad ininterrumpida ni ausencia de errores.
                Podemos modificar, suspender o discontinuar el servicio en cualquier momento, notificandote
                con razonable anticipacion cuando sea posible.
              </p>
            </Section>

            <Section title="7. Limitacion de responsabilidad">
              <p>
                Gastar es una herramienta de registro personal. No somos responsables por decisiones financieras
                tomadas en base a la informacion mostrada en la aplicacion. Los datos son tan precisos como
                los que vos ingresas.
              </p>
            </Section>

            <Section title="8. Modificaciones">
              <p>
                Podemos actualizar estos terminos. Te notificaremos por correo ante cambios relevantes.
                El uso continuado implica aceptacion de los terminos actualizados.
              </p>
            </Section>

            <Section title="9. Ley aplicable">
              <p>
                Estos terminos se rigen por las leyes de la Republica Argentina.
              </p>
            </Section>

            <Section title="10. Contacto">
              <p>
                Para cualquier consulta sobre estos terminos, escribinos a{' '}
                <a href="mailto:mateovalles02@gmail.com" className="text-accent-600 hover:underline">mateovalles02@gmail.com</a>.
              </p>
            </Section>
          </div>
        </div>

        <LegalLinks includeBackLink className="mt-6" />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-app">{title}</h2>
      <div className="text-app-muted">{children}</div>
    </div>
  );
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
