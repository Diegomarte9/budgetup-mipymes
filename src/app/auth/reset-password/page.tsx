'use client';

import { useState } from 'react';
import { OtpVerificationForm } from '@/components/forms/OtpVerificationForm';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';

export default function ResetPasswordPage() {
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  return !isOtpVerified ? (
    <OtpVerificationForm onVerified={() => setIsOtpVerified(true)} />
  ) : (
    <ResetPasswordForm />
  );
}