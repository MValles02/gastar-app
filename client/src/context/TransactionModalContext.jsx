import { createContext, useContext, useState } from 'react';

const TransactionModalContext = createContext(null);

export function TransactionModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [onSuccess, setOnSuccess] = useState(null);

  const openModal = (transaction = null, successCallback = null) => {
    setEditData(transaction);
    setOnSuccess(() => successCallback);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditData(null);
  };

  return (
    <TransactionModalContext.Provider value={{ isOpen, editData, onSuccess, openModal, closeModal }}>
      {children}
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  return useContext(TransactionModalContext);
}
