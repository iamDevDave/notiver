import React, { useCallback } from 'react';
import { View, Text, Pressable, Switch, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Zap,
  Plus,
  ChevronRight,
  Clock,
  Activity,
} from 'lucide-react-native';

import { Screen } from '../../../shared/components/templates/Screen';
import { Header } from '../../../shared/components/templates/Header';
import { EmptyState } from '../../../shared/components/templates/EmptyState';
import { Badge } from '../../../shared/components/atoms/Badge';
import { useRules, useToggleRule } from '../hooks/useRules';
import { colors } from '../../../theme/tokens';

type Rule = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: string;
  isActive: boolean | null;
  priority: number | null;
  executionCount: number | null;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Map trigger types to human-readable labels */
const TRIGGER_LABELS: Record<string, string> = {
  app: 'App',
  keyword: 'Keyword',
  contact: 'Contact',
  time: 'Time',
  location: 'Location',
  frequency: 'Frequency',
};

/** Format relative time for last triggered */
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never triggered';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface RuleCardProps {
  rule: Rule;
  onPress: () => void;
  onToggle: (isActive: boolean) => void;
}

function RuleCard({ rule, onPress, onToggle }: RuleCardProps) {
  const isActive = rule.isActive ?? true;

  return (
    <Pressable
      onPress={onPress}
      className="mx-lg mb-sm bg-surface-card rounded-cards border border-border p-lg"
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      accessibilityRole="button"
      accessibilityLabel={`Rule: ${rule.name}`}
    >
      <View className="flex-row items-center justify-between mb-sm">
        <View className="flex-1 flex-row items-center mr-md">
          <View className="bg-accent-primary/20 rounded-full p-sm mr-sm">
            <Zap size={16} color={colors.accent.primary} />
          </View>
          <Text
            className="text-text-primary text-body font-semibold flex-1"
            numberOfLines={1}
          >
            {rule.name}
          </Text>
        </View>

        <Switch
          value={isActive}
          onValueChange={onToggle}
          trackColor={{
            false: colors.surface.elevated,
            true: colors.accent.primary + '80',
          }}
          thumbColor={isActive ? colors.accent.primary : colors.text.muted}
          accessibilityLabel={`Toggle ${rule.name} ${isActive ? 'off' : 'on'}`}
        />
      </View>

      {rule.description ? (
        <Text
          className="text-text-secondary text-caption mb-sm ml-10"
          numberOfLines={2}
        >
          {rule.description}
        </Text>
      ) : null}

      <View className="flex-row items-center ml-10">
        <Badge
          label={TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
          variant="default"
        />

        <View className="flex-row items-center ml-md">
          <Activity size={12} color={colors.text.muted} />
          <Text className="text-text-muted text-caption ml-xs">
            {rule.executionCount ?? 0} runs
          </Text>
        </View>

        <View className="flex-row items-center ml-md">
          <Clock size={12} color={colors.text.muted} />
          <Text className="text-text-muted text-caption ml-xs">
            {formatRelativeTime(rule.lastTriggeredAt)}
          </Text>
        </View>

        <View className="flex-1 items-end">
          <ChevronRight size={16} color={colors.text.muted} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * RuleListScreen - Displays all automation rules with active/inactive toggle.
 * Users can tap a rule to view details or create new rules.
 */
export function RuleListScreen() {
  const router = useRouter();
  const { data: rules, isLoading, refetch } = useRules();
  const toggleRule = useToggleRule();

  const handleRulePress = useCallback(
    (ruleId: string) => {
      router.push(`/rule/${ruleId}`);
    },
    [router]
  );

  const handleToggle = useCallback(
    (ruleId: string, isActive: boolean) => {
      toggleRule.mutate({ id: ruleId, isActive });
    },
    [toggleRule]
  );

  const handleCreateRule = useCallback(() => {
    router.push('/rule-builder');
  }, [router]);

  const renderRule = useCallback(
    ({ item }: { item: Rule }) => (
      <RuleCard
        rule={item}
        onPress={() => handleRulePress(item.id)}
        onToggle={(isActive) => handleToggle(item.id, isActive)}
      />
    ),
    [handleRulePress, handleToggle]
  );

  const keyExtractor = useCallback((item: Rule) => item.id, []);

  if (isLoading) {
    return (
      <Screen>
        <Header title="Rules" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-body">Loading rules...</Text>
        </View>
      </Screen>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <Screen>
        <Header
          title="Rules"
          actions={[
            {
              icon: Plus,
              onPress: handleCreateRule,
              accessibilityLabel: 'Create new rule',
            },
          ]}
        />
        <EmptyState
          icon={Zap}
          title="No Rules Yet"
          description="Create automation rules to manage your notifications automatically."
          actionLabel="Create Rule"
          onAction={handleCreateRule}
        />
      </Screen>
    );
  }

  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <Screen>
      <Header
        title="Rules"
        actions={[
          {
            icon: Plus,
            onPress: handleCreateRule,
            accessibilityLabel: 'Create new rule',
          },
        ]}
      />

      {/* Summary bar */}
      <View className="flex-row items-center px-lg py-sm mb-sm">
        <Text className="text-text-secondary text-caption">
          {rules.length} rule{rules.length !== 1 ? 's' : ''} •{' '}
          {activeCount} active
        </Text>
      </View>

      <FlatList
        data={rules}
        renderItem={renderRule}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </Screen>
  );
}
