'use client';

import { useState } from 'react';
import { OnboardingChoice } from '@/components/onboarding/OnboardingChoice';
import { CreateOrganizationForm } from '@/components/onboarding/CreateOrganizationForm';
import { JoinOrganizationForm } from '@/components/onboarding/JoinOrganizationForm';

type OnboardingStep = 'choice' | 'create' | 'join';

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('choice');

  const handleChoice = (choice: 'create' | 'join') => {
    setStep(choice);
  };

  const handleBack = () => {
    setStep('choice');
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {step === 'choice' && <OnboardingChoice onChoice={handleChoice} />}
      {step === 'create' && <CreateOrganizationForm onBack={handleBack} />}
      {step === 'join' && <JoinOrganizationForm onBack={handleBack} />}
    </div>
  );
}