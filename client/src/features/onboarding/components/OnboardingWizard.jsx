import { createPortal } from 'react-dom';
import { useOnboarding } from '../../../shared/contexts/OnboardingContext.jsx';
import OnboardingProgressBar from './OnboardingProgressBar.jsx';
import WelcomeStep from '../steps/WelcomeStep.jsx';
import AccountsStep from '../steps/AccountsStep.jsx';
import CategoriesStep from '../steps/CategoriesStep.jsx';
import TutorialStep from '../steps/TutorialStep.jsx';

export default function OnboardingWizard() {
  const { isOpen, currentStep } = useOnboarding();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center px-4 py-6 sm:px-6">
        <div className="panel w-full overflow-hidden shadow-hero">
          <div className="bg-canvas-elevated px-6 pt-6 pb-5 sm:px-8">
            <OnboardingProgressBar currentStep={currentStep} />
          </div>
          <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pt-8">
            {currentStep === 0 && <WelcomeStep />}
            {currentStep === 1 && <AccountsStep />}
            {currentStep === 2 && <CategoriesStep />}
            {currentStep === 3 && <TutorialStep />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
