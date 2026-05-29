import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { NotificationDetailScreen } from '@/src/features/notifications/screens/NotificationDetailScreen';

export default function NotificationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <NotificationDetailScreen notificationId={id ?? ''} />;
}
