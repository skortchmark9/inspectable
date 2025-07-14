import React from 'react';
import { AuthProvider } from './AuthContext';
import { InspectionProvider } from './InspectionContext';
import { BackgroundProcessorProvider } from './BackgroundProcessorContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <InspectionProvider>
        <BackgroundProcessorProvider>
          {children}
        </BackgroundProcessorProvider>
      </InspectionProvider>
    </AuthProvider>
  );
}