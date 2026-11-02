'use client';

import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';

export default function ReMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
