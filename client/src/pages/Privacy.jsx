import { Link } from 'react-router-dom';
import GastarLogo from '../components/ui/GastarLogo.jsx';

export default function Privacy() {
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
            <h1 className="text-2xl font-semibold text-app">Política de Privacidad</h1>
            <p className="mt-1 text-app-muted">Última actualización: marzo de 2026</p>
          </div>

          <Section title="1. Información que recopilamos">
            <p>Al usar Gastar, recopilamos la siguiente información:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
              <li>Nombre y dirección de correo electrónico (al registrarte o iniciar sesión con Google)</li>
              <li>Datos financieros que vos ingresás: cuentas, transacciones y categorías</li>
            </ul>
            <p className="mt-2">No recopilamos datos bancarios, números de tarjeta ni credenciales de acceso a entidades financieras.</p>
          </Section>

          <Section title="2. Cómo usamos tu información">
            <p>Usamos tu información exclusivamente para:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
              <li>Identificarte y mantener tu sesión activa</li>
              <li>Almacenar y mostrarte tus datos financieros personales</li>
              <li>Enviarte correos de recuperación de contraseña cuando los solicitás</li>
            </ul>
            <p className="mt-2">No vendemos, compartimos ni cedemos tu información a terceros con fines comerciales.</p>
          </Section>

          <Section title="3. Inicio de sesión con Google">
            <p>
              Si elegís iniciar sesión con Google, recibimos de Google tu nombre y dirección de correo electrónico verificada.
              Esta información se usa únicamente para crear o identificar tu cuenta en Gastar.
              No accedemos a tu cuenta de Google, tus contactos, tu Drive ni ningún otro servicio.
            </p>
          </Section>

          <Section title="4. Almacenamiento y seguridad">
            <p>
              Tus datos se almacenan en servidores ubicados en Sudamérica a través de proveedores de infraestructura en la nube.
              Las contraseñas se almacenan con hash seguro (bcrypt) y nunca en texto plano.
              Las sesiones se gestionan mediante cookies HTTP-only.
            </p>
          </Section>

          <Section title="5. Tus derechos">
            <p>Podés en cualquier momento:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
              <li>Eliminar tu cuenta y todos tus datos contactándonos</li>
              <li>Solicitar una copia de tu información</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, escribinos a{' '}
              <a href="mailto:hola@gastar.app" className="text-accent-600 hover:underline">hola@gastar.app</a>.
            </p>
          </Section>

          <Section title="6. Cambios a esta política">
            <p>
              Podemos actualizar esta política ocasionalmente. Te notificaremos por correo electrónico ante cambios significativos.
              El uso continuado de la aplicación después de la notificación implica aceptación de los cambios.
            </p>
          </Section>

          <Section title="7. Contacto">
            <p>
              Si tenés preguntas sobre esta política, contactanos en{' '}
              <a href="mailto:hola@gastar.app" className="text-accent-600 hover:underline">hola@gastar.app</a>.
            </p>
          </Section>
        </div>

        <div className="mt-6 text-center text-sm text-app-muted">
          <Link to="/terms" className="text-accent-600 hover:underline">Términos y condiciones</Link>
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
