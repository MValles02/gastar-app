import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useTransactionModal } from './TransactionModalContext.jsx';
import { getAccounts } from '../services/accounts.js';
import { childrenPropType } from '../utils/propTypes.js';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  const { triggerRefresh } = useTransactionModal();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [createdAccounts, setCreatedAccounts] = useState([]);

  useEffect(() => {
    if (!user) return;

    const key = `onboarding_complete_${user.id}`;
    const done = localStorage.getItem(key);
    if (done === 'true') return;

    getAccounts()
      .then((accounts) => {
        if (accounts.length > 0) {
          // Existing user with data: silently mark complete, don't show wizard
          localStorage.setItem(key, 'true');
        } else {
          setIsOpen(true);
        }
      })
      .catch(() => {
        // If the check fails, don't show the wizard to avoid blocking the app
      });
  }, [user]);

  const openOnboarding = () => {
    setCurrentStep(0);
    setCreatedAccounts([]);
    setIsOpen(true);
  };

  const goToNextStep = () => setCurrentStep((s) => s + 1);
  const goToPrevStep = () => setCurrentStep((s) => s - 1);

  const addCreatedAccount = (account) => {
    setCreatedAccounts((prev) => [...prev, account]);
  };

  const markComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
    }
    setIsOpen(false);
    triggerRefresh();
  };

  const value = useMemo(
    () => ({
      isOpen,
      currentStep,
      createdAccounts,
      openOnboarding,
      goToNextStep,
      goToPrevStep,
      addCreatedAccount,
      markComplete,
    }),
    [isOpen, currentStep, createdAccounts]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}

OnboardingProvider.propTypes = {
  children: childrenPropType,
};
