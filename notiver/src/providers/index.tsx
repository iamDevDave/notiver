/**
 * Root AppProviders component.
 * Wraps the application with all required providers in the correct order.
 *
 * Provider order:
 * 1. DatabaseProvider — ensures SQLite is ready
 * 2. QueryProvider — provides TanStack Query client
 * 3. AppInitProvider — wires all event bus integrations (requires DB + QueryClient)
 */

import React from 'react';
import { DatabaseProvider } from './database-provider';
import { QueryProvider } from './query-provider';
import { AppInitProvider } from './app-init-provider';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Combines all application providers into a single wrapper.
 * The AppInitProvider is placed last (innermost) so it runs after
 * the database and query client are both available.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <DatabaseProvider>
      <QueryProvider>
        <AppInitProvider>{children}</AppInitProvider>
      </QueryProvider>
    </DatabaseProvider>
  );
}
