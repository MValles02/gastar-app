import Sidebar from './Sidebar.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import Header from './Header.jsx';
import FAB from '../ui/FAB.jsx';
import TransactionModal from '../transactions/TransactionModal.jsx';
import { TransactionModalProvider, useTransactionModal } from '../../context/TransactionModalContext.jsx';

function LayoutInner({ children }) {
  const { openModal } = useTransactionModal();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <FAB onClick={() => openModal()} />
      <TransactionModal />
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <TransactionModalProvider>
      <LayoutInner>{children}</LayoutInner>
    </TransactionModalProvider>
  );
}
