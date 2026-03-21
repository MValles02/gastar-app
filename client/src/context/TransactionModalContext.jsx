import { createContext, useContext, useState } from 'react';

const TransactionModalContext = createContext(null);

export function TransactionModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  const openModal = (transaction = null) => {
    setEditData(transaction);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditData(null);
  };

  return (
    <TransactionModalContext.Provider value={{ isOpen, editData, refreshKey, triggerRefresh, openModal, closeModal }}>
      {children}
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  return useContext(TransactionModalContext);
}
