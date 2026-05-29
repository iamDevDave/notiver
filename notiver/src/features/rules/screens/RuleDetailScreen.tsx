import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Zap,
  Trash2,
  Edit3,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
} from 'lucide-react-native';

import { Screen } from '../../../shared/components/templates/Screen';
import { Header } from '../../../shared/components/templates/Header';
import { Badge } from '../../../shared/components/atoms/Badge';
import { Button } from '../../../shared/components/atoms/Button';
import { Card } from '../../../shared/components/molecules/Card';
import { useRule, useRuleExecutions, useToggleRule, useDeleteRule } from '../hooks/useRules';
import { colors } from '../../../theme/tokens';

/** Map trigger types to human-readable labels */
const TRIGGER_LABELS: Record<string, string> = {
  app: 'App Notification',
  keyword: 'Keyword Match',
  contact: 'Contact Message',
  time: 'Time-Based',
  location: 'Location',
  frequency: 'Frequency',
};

/** Map action types to human-readable labels */
const ACTION_LABELS: Record<string, string> = {
  dismiss: 'Dismiss',
  delay: 'Delay',
  alarm: 'Sound Alarm',
  vibrate: 'Vibrate',
  reply: 'Auto Reply',
  launch_app: 'Launch App',
  batch: 'Batch',
  webhook: 'Webhook',
  copy: 'Copy Text',
  speak: 'Speak Aloud',
};

/** Map condition types to human-readable labels */
const CONDITION_LABELS: Record<string, string> = {
  contains: 'Contains',
  not_contains: 'Not Contains',
  regex: 'Regex Match',
  category: 'Category',
  priority: 'Priority',
  time_window: 'Time Window',
};

/** Map execution status to badge variant */
const STATUS_VARIANTS: Record<string, 'important' | 'emergency' | 'promotion'> = {
  success: 'important',
  failed: 'emergency',
  partial: 'promotion',
};

/** Format a date for display */
function formatDate(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format relative time */
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/** Parse JSON safely */
function parseJSON<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * RuleDetailScreen - Shows rule configuration, execution history, and stats.
 * Provides actions to enable/disable, edit, and delete the rule.
 */
export function RuleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rule, isLoading } = useRule(id ?? '');
  const { data: executions } = useRuleExecutions(id ?? '');
  const toggleRule = useToggleRule();
  const deleteRule = useDeleteRule();

  const handleToggle = useCallback(
    (isActive: boolean) => {
      if (!id) return;
      toggleRule.mutate({ id, isActive });
    },
    [id, toggleRule]
  );

  const handleEdit = useCallback(() => {
    // Navigate to rule builder with edit mode (future enhancement)
    router.push('/rule-builder');
  }, [router]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this rule? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRule.mutate(id, {
              onSuccess: () => router.back(),
            });
          },
        },
      ]
    );
  }, [id, deleteRule, router]);

  if (isLoading || !rule) {
    return (
      <Screen>
        <Header title="Rule Detail" showBack onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-body">
            {isLoading ? 'Loading...' : 'Rule not found'}
          </Text>
        </View>
      </Screen>
    );
  }

  const isActive = rule.isActive ?? true;
  const triggerConfig = parseJSON<Record<string, unknown>>(rule.triggerConfig, {});
  const successCount = executions?.filter((e) => e.status === 'success').length ?? 0;
  const failedCount = executions?.filter((e) => e.status === 'failed').length ?? 0;
  const partialCount = executions?.filter((e) => e.status === 'partial').length ?? 0;

  return (
    <Screen>
      <Header
        title="Rule Detail"
        showBack
        onBack={() => router.back()}
        actions={[
          {
            icon: Trash2,
            onPress: handleDelete,
            accessibilityLabel: 'Delete rule',
          },
        ]}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Rule header section */}
        <View className="px-lg py-md">
          <View className="flex-row items-center justify-between mb-sm">
            <View className="flex-row items-center flex-1 mr-md">
              <View className="bg-accent-primary/20 rounded-full p-md mr-md">
                <Zap size={24} color={colors.accent.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary text-md font-bold" numberOfLines={2}>
                  {rule.name}
                </Text>
                {rule.description ? (
                  <Text className="text-text-secondary text-caption mt-xs">
                    {rule.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <Switch
              value={isActive}
              onValueChange={handleToggle}
              trackColor={{
                false: colors.surface.elevated,
                true: colors.accent.primary + '80',
              }}
              thumbColor={isActive ? colors.accent.primary : colors.text.muted}
              accessibilityLabel={`Toggle rule ${isActive ? 'off' : 'on'}`}
            />
          </View>

          <View className="flex-row items-center mt-sm">
            <Badge
              label={isActive ? 'Active' : 'Inactive'}
              variant={isActive ? 'important' : 'default'}
            />
            <Text className="text-text-muted text-caption ml-md">
              Created {formatDate(rule.createdAt)}
            </Text>
          </View>
        </View>

        {/* Stats cards */}
        <View className="flex-row px-lg mb-md gap-sm">
          <View className="flex-1 bg-surface-card rounded-cards border border-border p-md items-center">
            <Activity size={18} color={colors.accent.primary} />
            <Text className="text-text-primary text-md font-bold mt-xs">
              {rule.executionCount ?? 0}
            </Text>
            <Text className="text-text-muted text-caption">Total Runs</Text>
          </View>

          <View className="flex-1 bg-surface-card rounded-cards border border-border p-md items-center">
            <CheckCircle size={18} color={colors.accent.success} />
            <Text className="text-text-primary text-md font-bold mt-xs">
              {successCount}
            </Text>
            <Text className="text-text-muted text-caption">Successful</Text>
          </View>

          <View className="flex-1 bg-surface-card rounded-cards border border-border p-md items-center">
            <Clock size={18} color={colors.text.secondary} />
            <Text className="text-text-primary text-caption font-bold mt-xs" numberOfLines={1}>
              {formatRelativeTime(rule.lastTriggeredAt)}
            </Text>
            <Text className="text-text-muted text-caption">Last Run</Text>
          </View>
        </View>

        {/* Configuration section */}
        <Card
          header={{ title: 'Configuration' }}
          className="mx-lg mb-md"
        >
          {/* Trigger */}
          <View className="mb-md">
            <Text className="text-text-secondary text-caption font-semibold uppercase mb-xs">
              Trigger
            </Text>
            <View className="flex-row items-center">
              <Play size={14} color={colors.accent.primary} />
              <Text className="text-text-primary text-body ml-sm">
                {TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
              </Text>
            </View>
            {Object.keys(triggerConfig).length > 0 ? (
              <Text className="text-text-muted text-caption mt-xs ml-6">
                {formatTriggerConfig(rule.triggerType, triggerConfig)}
              </Text>
            ) : null}
          </View>

          {/* Conditions - parsed from rule_conditions table would be ideal,
              but since we only have the rule record here, show what we can */}
          <View className="mb-md">
            <Text className="text-text-secondary text-caption font-semibold uppercase mb-xs">
              Priority
            </Text>
            <Text className="text-text-primary text-body">
              {rule.priority ?? 0}
            </Text>
          </View>
        </Card>

        {/* Actions section */}
        <View className="px-lg mb-md">
          <View className="flex-row items-center justify-between mb-sm">
            <Text className="text-text-primary text-body font-semibold">
              Actions
            </Text>
            <Button
              label="Edit"
              variant="ghost"
              size="sm"
              leftIcon={Edit3}
              onPress={handleEdit}
            />
          </View>
        </View>

        {/* Execution History */}
        <Card
          header={{
            title: 'Execution History',
            subtitle: executions?.length
              ? `${executions.length} recent executions`
              : 'No executions yet',
          }}
          className="mx-lg mb-md"
        >
          {executions && executions.length > 0 ? (
            <View>
              {executions.slice(0, 10).map((execution) => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}
            </View>
          ) : (
            <View className="py-md items-center">
              <Text className="text-text-muted text-caption">
                This rule hasn't been triggered yet.
              </Text>
            </View>
          )}
        </Card>

        {/* Delete button */}
        <View className="px-lg mt-md">
          <Button
            label="Delete Rule"
            variant="danger"
            size="md"
            leftIcon={Trash2}
            onPress={handleDelete}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Format trigger config into a readable string */
function formatTriggerConfig(
  triggerType: string,
  config: Record<string, unknown>
): string {
  switch (triggerType) {
    case 'app':
      return config.packageName
        ? `App: ${config.appName || config.packageName}`
        : 'Any app';
    case 'keyword':
      return config.keywords
        ? `Keywords: ${(config.keywords as string[]).join(', ')}`
        : config.keyword
          ? `Keyword: ${config.keyword}`
          : 'No keywords set';
    case 'contact':
      return config.contactName
        ? `Contact: ${config.contactName}`
        : 'Any contact';
    case 'time':
      return config.startTime && config.endTime
        ? `Time: ${config.startTime} - ${config.endTime}`
        : 'Any time';
    case 'frequency':
      return config.count
        ? `After ${config.count} notifications in ${config.windowMinutes || 60}min`
        : 'Frequency-based';
    default:
      return JSON.stringify(config);
  }
}

/** Execution history row component */
function ExecutionRow({
  execution,
}: {
  execution: {
    id: string;
    status: string;
    executedAt: Date;
    durationMs: number | null;
    actionsExecuted: string;
    errorDetails: string | null;
  };
}) {
  const statusIcon = () => {
    switch (execution.status) {
      case 'success':
        return <CheckCircle size={14} color={colors.accent.success} />;
      case 'failed':
        return <XCircle size={14} color={colors.accent.danger} />;
      case 'partial':
        return <AlertTriangle size={14} color={colors.accent.warning} />;
      default:
        return <Activity size={14} color={colors.text.muted} />;
    }
  };

  const actions = parseJSON<{ type: string; success: boolean }[]>(
    execution.actionsExecuted,
    []
  );

  return (
    <View className="flex-row items-center py-sm border-b border-border-subtle">
      <View className="mr-sm">{statusIcon()}</View>
      <View className="flex-1">
        <Text className="text-text-primary text-caption font-medium">
          {actions.map((a) => ACTION_LABELS[a.type] || a.type).join(', ') || 'Unknown'}
        </Text>
        <Text className="text-text-muted text-caption">
          {formatRelativeTime(execution.executedAt)}
          {execution.durationMs != null ? ` • ${execution.durationMs}ms` : ''}
        </Text>
        {execution.errorDetails ? (
          <Text className="text-accent-danger text-caption mt-xs" numberOfLines={1}>
            {execution.errorDetails}
          </Text>
        ) : null}
      </View>
      <Badge
        label={execution.status}
        variant={STATUS_VARIANTS[execution.status] || 'default'}
      />
    </View>
  );
}
