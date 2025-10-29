import { Suspense } from 'react';
import { LoginForm } from '@/components/forms/LoginForm';

function LoginFormWrapper() {
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginFormWrapper />
    </Suspense>
  );
}