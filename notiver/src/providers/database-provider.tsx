/**
 * DatabaseProvider — initializes the database (runs seed on first creation).
 * Wraps children and ensures DB is ready before rendering the app tree.
 */

import React, { useEffect, useState } from 'react';
import { initializeDatabase } from '@/src/database';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsReady(true))
      .catch((error) => {
        console.error('Database initialization failed:', error);
        // Still render the app — migrations already ran synchronously,
        // only seed data may be missing.
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
