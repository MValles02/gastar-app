import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../shared/hooks/useAuth.js';
import { useTransactionModal } from '../../shared/contexts/TransactionModalContext.js';
import { getAccounts } from '../accounts/services/accounts.js';
import type { Account } from '../../shared/types/domain.types.js';

interface OnboardingContextValue {
  isOpen: boolean;
  currentStep: number;
  createdAccounts: Account[];
  openOnboarding: () => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  addCreatedAccount: (account: Account) => void;
  markComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface Props {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: Props): JSX.Element {
  const { user } = useAuth();
  const { triggerRefresh } = useTransactionModal();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [createdAccounts, setCreatedAccounts] = useState<Account[]>([]);

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

  const addCreatedAccount = (account: Account) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, currentStep, createdAccounts]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
