import { Link } from 'react-router-dom';
import GastarLogo from '../components/ui/GastarLogo.jsx';

export default function Terms() {
  return (
    <div className="auth-backdrop min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-panel bg-accent-50 dark:bg-accent-950">
            <GastarLogo className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold text-accent-600">Gastar</span>
        </div>

        <div className="auth-shell space-y-6 text-sm text-app">
          <div>
            <h1 className="text-2xl font-semibold text-app">Términos y Condiciones</h1>
            <p className="mt-1 text-app-muted">Última actualización: marzo de 2026</p>
          </div>

          <Section title="1. Aceptación de los términos">
            <p>
              Al crear una cuenta y usar Gastar, aceptás estos términos y condiciones de uso.
              Si no estás de acuerdo, no uses la aplicación.
            </p>
          </Section>

          <Section title="2. Descripción del servicio">
            <p>
              Gastar es una aplicación de seguimiento de finanzas personales que te permite registrar ingresos,
              gastos y transferencias entre tus propias cuentas, y visualizar resúmenes de tu actividad financiera.
            </p>
          </Section>

          <Section title="3. Uso aceptable">
            <p>Al usar Gastar, te comprometés a:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Usar la aplicación solo para fines personales y lícitos</li>
              <li>No intentar acceder a cuentas de otros usuarios</li>
              <li>No realizar ingeniería inversa ni intentar vulnerar la seguridad del servicio</li>
              <li>Proveer información veraz al crear tu cuenta</li>
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
              Los datos financieros que ingresás en Gastar son tuyos. No los usamos para ningún fin
              distinto al de mostrártelos a vos. Ver nuestra{' '}
              <Link to="/privacy" className="text-accent-600 hover:underline">Política de Privacidad</Link>{' '}
              para más detalles sobre cómo manejamos tu información.
            </p>
          </Section>

          <Section title="6. Disponibilidad del servicio">
            <p>
              Gastar se ofrece "tal como está". No garantizamos disponibilidad ininterrumpida ni ausencia de errores.
              Podemos modificar, suspender o discontinuar el servicio en cualquier momento, notificándote
              con razonable anticipación cuando sea posible.
            </p>
          </Section>

          <Section title="7. Limitación de responsabilidad">
            <p>
              Gastar es una herramienta de registro personal. No somos responsables por decisiones financieras
              tomadas en base a la información mostrada en la aplicación. Los datos son tan precisos como
              los que vos ingresás.
            </p>
          </Section>

          <Section title="8. Modificaciones">
            <p>
              Podemos actualizar estos términos. Te notificaremos por correo ante cambios relevantes.
              El uso continuado implica aceptación de los términos actualizados.
            </p>
          </Section>

          <Section title="9. Ley aplicable">
            <p>
              Estos términos se rigen por las leyes de la República Argentina.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              Para cualquier consulta sobre estos términos, escribinos a{' '}
              <a href="mailto:hola@gastar.app" className="text-accent-600 hover:underline">hola@gastar.app</a>.
            </p>
          </Section>
        </div>

        <div className="mt-6 text-center text-sm text-app-muted">
          <Link to="/privacy" className="text-accent-600 hover:underline">Política de privacidad</Link>
          {' · '}
          <Link to="/login" className="text-accent-600 hover:underline">Volver al inicio de sesión</Link>
        </div>
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
