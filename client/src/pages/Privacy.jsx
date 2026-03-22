import GastarLogo from '../components/ui/GastarLogo.jsx';
import LegalLinks from '../components/layout/LegalLinks.jsx';

export default function Privacy() {
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
            <h1 className="text-2xl font-semibold text-app">Politica de Privacidad</h1>
            <p className="mt-1 text-app-muted">Ultima actualizacion: marzo de 2026</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Section title="1. Informacion que recopilamos">
              <p>Al usar Gastar, recopilamos la siguiente informacion:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
                <li>Nombre y direccion de correo electronico al registrarte o iniciar sesion con Google</li>
                <li>Datos financieros que vos ingresas: cuentas, transacciones y categorias</li>
              </ul>
              <p className="mt-2">No recopilamos datos bancarios, numeros de tarjeta ni credenciales de acceso a entidades financieras.</p>
            </Section>

            <Section title="2. Como usamos tu informacion">
              <p>Usamos tu informacion exclusivamente para:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
                <li>Identificarte y mantener tu sesion activa</li>
                <li>Almacenar y mostrarte tus datos financieros personales</li>
                <li>Enviarte correos de recuperacion de contraseña cuando los solicitas</li>
              </ul>
              <p className="mt-2">No vendemos, compartimos ni cedemos tu informacion a terceros con fines comerciales.</p>
            </Section>

            <Section title="3. Inicio de sesion con Google">
              <p>
                Si elegis iniciar sesion con Google, recibimos de Google tu nombre y direccion de correo electronico verificada.
                Esta informacion se usa unicamente para crear o identificar tu cuenta en Gastar.
                No accedemos a tu cuenta de Google, tus contactos, tu Drive ni ningun otro servicio.
              </p>
            </Section>

            <Section title="4. Almacenamiento y seguridad">
              <p>
                Tus datos se almacenan en servidores ubicados en Sudamerica a traves de proveedores de infraestructura en la nube.
                Las contraseñas se almacenan con hash seguro (bcrypt) y nunca en texto plano.
                Las sesiones se gestionan mediante cookies HTTP-only.
              </p>
            </Section>

            <Section title="5. Tus derechos">
              <p>Podes en cualquier momento:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-app-muted">
                <li>Eliminar tu cuenta y todos tus datos contactandonos</li>
                <li>Solicitar una copia de tu informacion</li>
              </ul>
              <p className="mt-2">
                Para ejercer estos derechos, escribinos a{' '}
                <a href="mailto:hola@gastar.app" className="text-accent-600 hover:underline">mateovalles02@gmail.com</a>.
              </p>
            </Section>

            <Section title="6. Cambios a esta politica">
              <p>
                Podemos actualizar esta politica ocasionalmente. Te notificaremos por correo electronico ante cambios significativos.
                El uso continuado de la aplicacion despues de la notificacion implica aceptacion de los cambios.
              </p>
            </Section>

            <Section title="7. Contacto">
              <p>
                Si tenes preguntas sobre esta politica, contactanos en{' '}
                <a href="mailto:hola@gastar.app" className="text-accent-600 hover:underline">hola@gastar.app</a>.
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
