/**
 * AppInitProvider — initializes all event bus integrations after the database is ready.
 *
 * This provider must be placed INSIDE DatabaseProvider and QueryProvider so that:
 * - The database is ready for repositories
 * - The query client is available for cache invalidation
 *
 * On mount, it calls initializeApp() which wires the full event pipeline:
 *   notification:received → notification:parsed → notification:classified
 *   → rule evaluation → rule:executed → analytics update
 *
 * On unmount, it calls teardownApp() to clean up all subscriptions.
 *
 * @validates Requirements 15.4, 15.7
 */

import React, { useEffect, useRef } from 'react';
import { initializeApp, teardownApp } from '@/src/services/app/app-init';

interface AppInitProviderProps {
  children: React.ReactNode;
}

export function AppInitProvider({ children }: AppInitProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initializeApp();
      initialized.current = true;
    }

    return () => {
      teardownApp();
      initialized.current = false;
    };
  }, []);

  return <>{children}</>;
}
