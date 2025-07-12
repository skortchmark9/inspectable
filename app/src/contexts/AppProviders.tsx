import React from 'react';
import { AuthProvider } from './AuthContext';
import { InspectionProvider } from './InspectionContext';
import { QueueProvider } from './QueueContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <InspectionProvider>
        <QueueProvider>
          {children}
        </QueueProvider>
      </InspectionProvider>
    </AuthProvider>
  );
}