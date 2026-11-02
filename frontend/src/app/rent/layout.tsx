'use client';

import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';

export default function RentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
