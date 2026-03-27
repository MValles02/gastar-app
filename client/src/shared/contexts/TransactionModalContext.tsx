import { createContext, useContext, useMemo, useState } from 'react';
import type { Transaction } from '../types/domain.types.js';

interface TransactionModalContextValue {
  isOpen: boolean;
  editData: Transaction | null;
  refreshKey: number;
  triggerRefresh: () => void;
  openModal: (transaction?: Transaction | null) => void;
  closeModal: () => void;
}

const TransactionModalContext = createContext<TransactionModalContextValue | null>(null);

interface Props {
  children: React.ReactNode;
}

export function TransactionModalProvider({ children }: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const openModal = (transaction: Transaction | null = null) => {
    setEditData(transaction);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditData(null);
  };

  const value = useMemo(
    () => ({ isOpen, editData, refreshKey, triggerRefresh, openModal, closeModal }),
    [isOpen, editData, refreshKey]
  );

  return (
    <TransactionModalContext.Provider value={value}>{children}</TransactionModalContext.Provider>
  );
}

export function useTransactionModal(): TransactionModalContextValue {
  const ctx = useContext(TransactionModalContext);
  if (!ctx) throw new Error('useTransactionModal must be used within TransactionModalProvider');
  return ctx;
}
