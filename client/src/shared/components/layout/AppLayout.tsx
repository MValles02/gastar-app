import { useState } from 'react';
import Sidebar from './Sidebar.js';
import Header from './Header.js';
import MobileDrawer from './MobileDrawer.js';
import FloatingActionButton from './FloatingActionButton.js';
import TransactionModal from '../../../features/transactions/components/TransactionModal.js';
import OnboardingWizard from '../../../features/onboarding/components/OnboardingWizard.js';
import {
  TransactionModalProvider,
  useTransactionModal,
} from '../../contexts/TransactionModalContext.js';
import { OnboardingProvider } from '../../../features/onboarding/OnboardingContext.js';

interface LayoutInnerProps {
  children: React.ReactNode;
}

function LayoutInner({ children }: LayoutInnerProps): JSX.Element {
  const { openModal } = useTransactionModal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="workspace-shell flex h-dvh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-soft focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-hero"
      >
        Ir al contenido principal
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuOpen={() => setDrawerOpen(true)} />
        <main id="main-content" className="workspace-main px-4 pb-6 pt-5 md:px-8 md:pb-10 md:pt-10">
          {children}
        </main>
      </div>
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <FloatingActionButton onClick={() => openModal()} />
      <TransactionModal />
      <OnboardingWizard />
    </div>
  );
}

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props): JSX.Element {
  return (
    <TransactionModalProvider>
      <OnboardingProvider>
        <LayoutInner>{children}</LayoutInner>
      </OnboardingProvider>
    </TransactionModalProvider>
  );
}
