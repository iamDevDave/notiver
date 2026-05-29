import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ruleRepository,
  ruleExecutionRepository,
} from '../../../database/repositories';

/** Query key factory for rules */
export const ruleKeys = {
  all: ['rules'] as const,
  lists: () => [...ruleKeys.all, 'list'] as const,
  detail: (id: string) => [...ruleKeys.all, 'detail', id] as const,
  executions: (ruleId: string) => [...ruleKeys.all, 'executions', ruleId] as const,
};

/** Fetch all rules ordered by priority */
export function useRules() {
  return useQuery({
    queryKey: ruleKeys.lists(),
    queryFn: () =>
      ruleRepository.findAll({ orderBy: 'priority', orderDirection: 'desc' }),
  });
}

/** Fetch a single rule by ID */
export function useRule(id: string) {
  return useQuery({
    queryKey: ruleKeys.detail(id),
    queryFn: () => ruleRepository.findById(id),
    enabled: !!id,
  });
}

/** Fetch execution history for a rule */
export function useRuleExecutions(ruleId: string, limit = 20) {
  return useQuery({
    queryKey: ruleKeys.executions(ruleId),
    queryFn: () => ruleExecutionRepository.findByRule(ruleId, { limit }),
    enabled: !!ruleId,
  });
}

/** Toggle rule active/inactive status */
export function useToggleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return ruleRepository.update(id, { isActive } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ruleKeys.all });
    },
  });
}

/** Delete a rule */
export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return ruleRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ruleKeys.all });
    },
  });
}
