import { useQuery } from '@tanstack/react-query';
import {
  notificationRepository,
  aiPredictionRepository,
  ruleExecutionRepository,
  ruleRepository,
} from '@/src/database/repositories';

/**
 * Fetches a single notification with its AI prediction and rule execution history.
 * Combines data from multiple repositories into a single detail view.
 */
export function useNotificationDetail(notificationId: string | undefined) {
  const notificationQuery = useQuery({
    queryKey: ['notification', notificationId],
    queryFn: () => notificationRepository.findById(notificationId!),
    enabled: !!notificationId,
  });

  const predictionQuery = useQuery({
    queryKey: ['notification-prediction', notificationId],
    queryFn: () => aiPredictionRepository.findByNotification(notificationId!),
    enabled: !!notificationId,
  });

  const executionsQuery = useQuery({
    queryKey: ['notification-executions', notificationId],
    queryFn: () => ruleExecutionRepository.findByNotification(notificationId!, { limit: 20 }),
    enabled: !!notificationId,
  });

  return {
    notification: notificationQuery.data ?? null,
    prediction: predictionQuery.data?.[0] ?? null,
    executions: executionsQuery.data ?? [],
    isLoading:
      notificationQuery.isLoading ||
      predictionQuery.isLoading ||
      executionsQuery.isLoading,
    isError: notificationQuery.isError,
    refetch: () => {
      notificationQuery.refetch();
      predictionQuery.refetch();
      executionsQuery.refetch();
    },
  };
}

/**
 * Fetches rule details for a given rule ID.
 * Used to display rule name in execution history.
 */
export function useRuleDetail(ruleId: string | undefined) {
  return useQuery({
    queryKey: ['rule', ruleId],
    queryFn: () => ruleRepository.findById(ruleId!),
    enabled: !!ruleId,
  });
}
