import Sidebar from './Sidebar.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import Header from './Header.jsx';
import FAB from '../ui/FAB.jsx';
import TransactionModal from '../transactions/TransactionModal.jsx';
import OnboardingWizard from '../onboarding/OnboardingWizard.jsx';
import { TransactionModalProvider, useTransactionModal } from '../../context/TransactionModalContext.jsx';
import { OnboardingProvider } from '../../context/OnboardingContext.jsx';

function LayoutInner({ children }) {
  const { openModal } = useTransactionModal();

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-8 md:pt-8">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <FAB onClick={() => openModal()} />
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
