import { createPortal } from 'react-dom';
import { useOnboarding } from '../../context/OnboardingContext.jsx';
import OnboardingProgressBar from './OnboardingProgressBar.jsx';
import WelcomeStep from './steps/WelcomeStep.jsx';
import AccountsStep from './steps/AccountsStep.jsx';
import CategoriesStep from './steps/CategoriesStep.jsx';
import TutorialStep from './steps/TutorialStep.jsx';

export default function OnboardingWizard() {
  const { isOpen, currentStep } = useOnboarding();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white dark:bg-gray-950">
      <div className="mx-auto w-full max-w-lg flex-1 flex flex-col px-6 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <OnboardingProgressBar currentStep={currentStep} />
        <div className="flex-1 mt-10">
          {currentStep === 0 && <WelcomeStep />}
          {currentStep === 1 && <AccountsStep />}
          {currentStep === 2 && <CategoriesStep />}
          {currentStep === 3 && <TutorialStep />}
        </div>
      </div>
    </div>,
    document.body
  );
}
