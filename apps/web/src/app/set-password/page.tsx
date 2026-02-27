import { Suspense } from 'react';
import SetPasswordContent from './SetPasswordContent';

export const dynamic = 'force-dynamic';

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordContent />
    </Suspense>
  );
}
