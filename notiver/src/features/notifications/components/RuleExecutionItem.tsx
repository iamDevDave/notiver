import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react-native';
import { useRuleDetail } from '../hooks/use-notification-detail';
import { Badge } from '@/src/shared/components/atoms/Badge';
import type { ExecutionStatus } from '@/src/database/schema/rule-executions';

interface RuleExecutionItemProps {
  execution: Record<string, unknown>;
}

/**
 * Displays a single rule execution record with status, rule name,
 * actions executed, and timing information.
 */
export function RuleExecutionItem({ execution }: RuleExecutionItemProps) {
  const ruleId = execution.ruleId as string;
  const status = execution.status as ExecutionStatus;
  const actionsExecuted = execution.actionsExecuted as string;
  const errorDetails = execution.errorDetails as string | null;
  const durationMs = execution.durationMs as number | null;
  const executedAt = execution.executedAt as Date;

  const { data: rule } = useRuleDetail(ruleId);

  const actions = parseActions(actionsExecuted);

  return (
    <View className="bg-surface-elevated rounded-buttons p-md">
      {/* Header: Rule name + Status */}
      <View className="flex-row items-center justify-between mb-sm">
        <View className="flex-1 mr-sm">
          <Text className="text-text-primary text-caption font-semibold" numberOfLines={1}>
            {rule?.name ?? 'Unknown Rule'}
          </Text>
        </View>
        <StatusIndicator status={status} />
      </View>

      {/* Actions executed */}
      {actions.length > 0 && (
        <View className="flex-row flex-wrap gap-xs mb-sm">
          {actions.map((action, index) => (
            <ActionBadge key={index} action={action} />
          ))}
        </View>
      )}

      {/* Footer: Timing info */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-xs">
          <Clock size={12} color="#71717A" />
          <Text className="text-text-muted text-xs">
            {formatExecutionTime(executedAt)}
          </Text>
        </View>
        {durationMs !== null && (
          <Text className="text-text-muted text-xs">{durationMs}ms</Text>
        )}
      </View>

      {/* Error details if failed */}
      {errorDetails && (
        <View className="mt-sm p-sm bg-accent-danger/10 rounded-inputs">
          <Text className="text-accent-danger text-xs" numberOfLines={2}>
            {errorDetails}
          </Text>
        </View>
      )}
    </View>
  );
}

function StatusIndicator({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case 'success':
      return (
        <View className="flex-row items-center gap-xs">
          <CheckCircle size={14} color="#10B981" />
          <Text className="text-accent-success text-xs font-medium">Success</Text>
        </View>
      );
    case 'partial':
      return (
        <View className="flex-row items-center gap-xs">
          <AlertTriangle size={14} color="#F59E0B" />
          <Text className="text-accent-warning text-xs font-medium">Partial</Text>
        </View>
      );
    case 'failed':
      return (
        <View className="flex-row items-center gap-xs">
          <XCircle size={14} color="#EF4444" />
          <Text className="text-accent-danger text-xs font-medium">Failed</Text>
        </View>
      );
    default:
      return null;
  }
}

function ActionBadge({ action }: { action: ActionInfo }) {
  return (
    <Badge
      label={action.type}
      variant={action.success ? 'social' : 'emergency'}
    />
  );
}

interface ActionInfo {
  type: string;
  success: boolean;
  error?: string;
}

function parseActions(actionsJson: string): ActionInfo[] {
  try {
    const parsed = JSON.parse(actionsJson);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function formatExecutionTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
