import { User, Mail, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Page, PageHeader } from '../components/layout/Page.jsx';

export default function Profile() {
  const { user } = useAuth();

  return (
    <Page>
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Tu información personal y preferencias de la aplicación."
      />

      <div className="space-y-6">
        <div className="panel p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600 dark:bg-accent-950">
              <User className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-app">{user?.name}</p>
              <p className="flex items-center gap-1.5 text-sm text-app-muted">
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center gap-2 text-app-muted">
            <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">Más opciones de perfil próximamente.</p>
          </div>
        </div>
      </div>
    </Page>
  );
}
