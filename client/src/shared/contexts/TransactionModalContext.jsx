import { createContext, useContext, useMemo, useState } from 'react';
import { childrenPropType } from '../utils/propTypes.js';

const TransactionModalContext = createContext(null);

export function TransactionModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const openModal = (transaction = null) => {
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

export function useTransactionModal() {
  return useContext(TransactionModalContext);
}

TransactionModalProvider.propTypes = {
  children: childrenPropType,
};
