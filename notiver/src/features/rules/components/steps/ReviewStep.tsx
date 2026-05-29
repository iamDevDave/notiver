import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react-native';
import { useRuleBuilderStore } from '../../store/rule-builder-store';
import { Input } from '../../../../shared/components/atoms/Input';
import { generateRuleSummary } from '../../utils/rule-summary';
import { validateRuleForm } from '../../utils/rule-validation';

export function ReviewStep() {
  const { form, setName, setDescription } = useRuleBuilderStore();

  const validation = validateRuleForm(form);
  const summary = generateRuleSummary(form);

  const hasTrigger = form.triggerType !== null;
  const hasActions = form.actions.length > 0;
  const hasName = form.name.trim().length > 0;

  return (
    <View className="flex-1 px-lg py-md">
      <Text className="text-text-primary text-md font-bold mb-xs">
        Review Rule
      </Text>
      <Text className="text-text-secondary text-body mb-lg">
        Give your rule a name and review the configuration
      </Text>

      {/* Rule name input */}
      <View className="mb-md">
        <Input
          label="Rule Name"
          placeholder="e.g., Silence spam notifications"
          value={form.name}
          onChangeText={setName}
          error={!hasName ? 'Rule name is required' : undefined}
        />
      </View>

      {/* Rule description input */}
      <View className="mb-lg">
        <Input
          label="Description (optional)"
          placeholder="Describe what this rule does"
          value={form.description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      {/* Natural language summary */}
      <View className="p-lg rounded-cards border border-accent-primary/30 bg-accent-primary/5 mb-lg">
        <View className="flex-row items-center mb-sm">
          <FileText size={16} color="#3B82F6" />
          <Text className="text-accent-primary text-caption font-semibold uppercase ml-sm">
            Rule Summary
          </Text>
        </View>
        <Text
          className="text-text-primary text-body leading-6"
          accessibilityRole="text"
          accessibilityLabel={`Rule summary: ${summary}`}
        >
          {summary}
        </Text>
      </View>

      {/* Configuration checklist */}
      <View className="p-lg rounded-cards border border-border bg-surface-card mb-lg">
        <Text className="text-text-secondary text-caption font-semibold uppercase mb-md">
          Configuration
        </Text>

        {/* Trigger */}
        <View className="flex-row items-start mb-sm">
          {hasTrigger ? (
            <CheckCircle size={16} color="#10B981" />
          ) : (
            <AlertCircle size={16} color="#EF4444" />
          )}
          <View className="ml-sm flex-1">
            <Text className="text-text-primary text-body font-medium">
              Trigger
            </Text>
            <Text className="text-text-muted text-caption">
              {hasTrigger
                ? `${form.triggerType} trigger configured`
                : 'No trigger selected'}
            </Text>
          </View>
        </View>

        {/* Conditions */}
        <View className="flex-row items-start mb-sm">
          <CheckCircle size={16} color="#10B981" />
          <View className="ml-sm flex-1">
            <Text className="text-text-primary text-body font-medium">
              Conditions
            </Text>
            <Text className="text-text-muted text-caption">
              {form.conditions.length === 0
                ? 'No conditions (always matches)'
                : `${form.conditions.length} condition${form.conditions.length > 1 ? 's' : ''} configured`}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-start">
          {hasActions ? (
            <CheckCircle size={16} color="#10B981" />
          ) : (
            <AlertCircle size={16} color="#EF4444" />
          )}
          <View className="ml-sm flex-1">
            <Text className="text-text-primary text-body font-medium">
              Actions
            </Text>
            <Text className="text-text-muted text-caption">
              {hasActions
                ? `${form.actions.length} action${form.actions.length > 1 ? 's' : ''}: ${form.actions.map((a) => a.type).join(', ')}`
                : 'No actions added (at least one required)'}
            </Text>
          </View>
        </View>
      </View>

      {/* Validation status */}
      {!validation.isValid ? (
        <View className="p-md rounded-buttons bg-accent-danger/10 border border-accent-danger/30">
          <Text className="text-accent-danger text-caption font-medium mb-xs">
            Please fix the following before saving:
          </Text>
          {validation.errors.map((error, index) => (
            <Text key={index} className="text-accent-danger text-caption">
              • {error.message}
            </Text>
          ))}
        </View>
      ) : (
        <View className="p-md rounded-buttons bg-accent-success/10 border border-accent-success/30">
          <Text className="text-accent-success text-caption font-medium">
            ✓ Rule is ready to save
          </Text>
        </View>
      )}
    </View>
  );
}
