import Sidebar from './Sidebar.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import Header from './Header.jsx';
import LegalLinks from './LegalLinks.jsx';
import FloatingActionButton from '../ui/FAB.jsx';
import TransactionModal from '../transactions/TransactionModal.jsx';
import OnboardingWizard from '../onboarding/OnboardingWizard.jsx';
import { TransactionModalProvider, useTransactionModal } from '../../context/TransactionModalContext.jsx';
import { OnboardingProvider } from '../../context/OnboardingContext.jsx';
import { childrenPropType } from '../../utils/propTypes.js';

function LayoutInner({ children }) {
  const { openModal } = useTransactionModal();

  return (
    <div className="workspace-shell flex h-dvh overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-soft focus:bg-accent-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-hero"
      >
        Ir al contenido principal
      </a>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main id="main-content" className="workspace-main px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-10 md:pt-10">
          <div className="flex min-h-full flex-col">
            <div className="flex-1">{children}</div>
            <LegalLinks
              variant="app"
              className="mt-8 border-t border-border-default/70 pt-4 md:mt-10 md:justify-end"
            />
          </div>
        </main>
      </div>
      <BottomTabBar />
      <FloatingActionButton onClick={() => openModal()} />
      <TransactionModal />
      <OnboardingWizard />
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <TransactionModalProvider>
      <OnboardingProvider>
        <LayoutInner>{children}</LayoutInner>
      </OnboardingProvider>
    </TransactionModalProvider>
  );
}

LayoutInner.propTypes = {
  children: childrenPropType,
};

AppLayout.propTypes = {
  children: childrenPropType,
};
