'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from './login-form';

export function LoginContent({ redirectTo, initialError }: { redirectTo: string; initialError: string }) {
  const router = useRouter();
  return <LoginForm initialError={initialError}
    onAuthenticated={() => { router.replace(redirectTo); router.refresh(); }} />;
}
