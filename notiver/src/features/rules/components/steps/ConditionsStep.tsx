import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  XCircle,
  Code,
  Tag,
  Signal,
  Clock,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Input } from '../../../../shared/components/atoms/Input';
import { useRuleBuilderStore, type BuilderCondition } from '../../store/rule-builder-store';
import type { ConditionType } from '../../engine/conditions/types';

interface ConditionOption {
  type: ConditionType;
  label: string;
  description: string;
  icon: LucideIcon;
}

const CONDITION_OPTIONS: ConditionOption[] = [
  { type: 'contains', label: 'Contains', description: 'Text contains a value', icon: Search },
  { type: 'not_contains', label: 'Not Contains', description: 'Text does not contain a value', icon: XCircle },
  { type: 'regex', label: 'Regex', description: 'Text matches a regex pattern', icon: Code },
  { type: 'category', label: 'Category', description: 'Notification is in a category', icon: Tag },
  { type: 'priority', label: 'Priority', description: 'Notification has a priority level', icon: Signal },
  { type: 'time_window', label: 'Time Window', description: 'Within a time range', icon: Clock },
];

const CATEGORY_VALUES = ['important', 'work', 'social', 'spam', 'promotion', 'emergency'] as const;

const PRIORITY_OPERATORS = [
  { value: '==', label: 'Equals' },
  { value: '>=', label: 'At least' },
  { value: '<=', label: 'At most' },
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
] as const;

const FIELD_OPTIONS = [
  { value: 'title', label: 'Title' },
  { value: 'content', label: 'Content' },
  { value: 'sender', label: 'Sender' },
  { value: 'appName', label: 'App Name' },
] as const;

function generateId(): string {
  return `cond_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Configuration form for Contains / Not Contains conditions */
function TextConditionConfig({
  condition,
  onUpdate,
}: {
  condition: BuilderCondition;
  onUpdate: (updates: Partial<BuilderCondition>) => void;
}) {
  return (
    <View className="mt-sm gap-sm">
      {/* Field selector */}
      <View>
        <Text className="text-text-secondary text-caption font-medium mb-xs">
          Field to check
        </Text>
        <View className="flex-row flex-wrap gap-xs">
          {FIELD_OPTIONS.map((field) => {
            const isSelected = (condition.config.field ?? 'content') === field.value;
            return (
              <Pressable
                key={field.value}
                onPress={() =>
                  onUpdate({ config: { ...condition.config, field: field.value } })
                }
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Check ${field.label} field`}
                className={`px-3 py-1.5 rounded-full border ${
                  isSelected
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border bg-surface-elevated'
                }`}
              >
                <Text
                  className={`text-caption font-medium ${
                    isSelected ? 'text-accent-primary' : 'text-text-secondary'
                  }`}
                >
                  {field.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Value input */}
      <Input
        label="Value"
        placeholder="Enter text to match"
        value={condition.config.value}
        onChangeText={(value) =>
          onUpdate({ config: { ...condition.config, value } })
        }
        autoCapitalize="none"
      />
    </View>
  );
}

/** Configuration form for Regex condition */
function RegexConditionConfig({
  condition,
  onUpdate,
}: {
  condition: BuilderCondition;
  onUpdate: (updates: Partial<BuilderCondition>) => void;
}) {
  return (
    <View className="mt-sm gap-sm">
      {/* Field selector */}
      <View>
        <Text className="text-text-secondary text-caption font-medium mb-xs">
          Field to check
        </Text>
        <View className="flex-row flex-wrap gap-xs">
          {FIELD_OPTIONS.map((field) => {
            const isSelected = (condition.config.field ?? 'content') === field.value;
            return (
              <Pressable
                key={field.value}
                onPress={() =>
                  onUpdate({ config: { ...condition.config, field: field.value } })
                }
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Check ${field.label} field`}
                className={`px-3 py-1.5 rounded-full border ${
                  isSelected
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border bg-surface-elevated'
                }`}
              >
                <Text
                  className={`text-caption font-medium ${
                    isSelected ? 'text-accent-primary' : 'text-text-secondary'
                  }`}
                >
                  {field.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Regex pattern input */}
      <Input
        label="Regex Pattern"
        placeholder="e.g., \\d{3}-\\d{4}"
        value={condition.config.value}
        onChangeText={(value) =>
          onUpdate({ config: { ...condition.config, operator: 'regex', value } })
        }
        autoCapitalize="none"
        autoCorrect={false}
        helperText="Enter a valid regular expression pattern"
      />
    </View>
  );
}

/** Configuration form for Category condition */
function CategoryConditionConfig({
  condition,
  onUpdate,
}: {
  condition: BuilderCondition;
  onUpdate: (updates: Partial<BuilderCondition>) => void;
}) {
  return (
    <View className="mt-sm">
      <Text className="text-text-secondary text-caption font-medium mb-xs">
        Select Category
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        {CATEGORY_VALUES.map((category) => {
          const isSelected = condition.config.value === category;
          return (
            <Pressable
              key={category}
              onPress={() =>
                onUpdate({ config: { ...condition.config, operator: '==', value: category } })
              }
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Category: ${category}`}
              className={`px-3 py-1.5 rounded-full border ${
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-border bg-surface-elevated'
              }`}
            >
              <Text
                className={`text-caption font-medium capitalize ${
                  isSelected ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Configuration form for Priority condition */
function PriorityConditionConfig({
  condition,
  onUpdate,
}: {
  condition: BuilderCondition;
  onUpdate: (updates: Partial<BuilderCondition>) => void;
}) {
  return (
    <View className="mt-sm gap-sm">
      {/* Operator selector */}
      <View>
        <Text className="text-text-secondary text-caption font-medium mb-xs">
          Comparison
        </Text>
        <View className="flex-row flex-wrap gap-xs">
          {PRIORITY_OPERATORS.map((op) => {
            const isSelected = condition.config.operator === op.value;
            return (
              <Pressable
                key={op.value}
                onPress={() =>
                  onUpdate({ config: { ...condition.config, operator: op.value } })
                }
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Operator: ${op.label}`}
                className={`px-3 py-1.5 rounded-full border ${
                  isSelected
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border bg-surface-elevated'
                }`}
              >
                <Text
                  className={`text-caption font-medium ${
                    isSelected ? 'text-accent-primary' : 'text-text-secondary'
                  }`}
                >
                  {op.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Priority value input */}
      <Input
        label="Priority Level"
        placeholder="0-5"
        value={condition.config.value}
        onChangeText={(value) =>
          onUpdate({ config: { ...condition.config, value } })
        }
        keyboardType="numeric"
        helperText="0 = lowest, 5 = highest priority"
      />
    </View>
  );
}

/** Configuration form for Time Window condition */
function TimeWindowConditionConfig({
  condition,
  onUpdate,
}: {
  condition: BuilderCondition;
  onUpdate: (updates: Partial<BuilderCondition>) => void;
}) {
  // Value format: "HH:MM-HH:MM" (start-end)
  const parts = condition.config.value.split('-');
  const startTime = parts[0] ?? '';
  const endTime = parts[1] ?? '';

  const updateTimeRange = (start: string, end: string) => {
    onUpdate({
      config: { ...condition.config, operator: 'within', value: `${start}-${end}` },
    });
  };

  return (
    <View className="mt-sm gap-sm">
      <Input
        label="Start Time"
        placeholder="HH:MM (e.g., 09:00)"
        value={startTime}
        onChangeText={(value) => updateTimeRange(value, endTime)}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <Input
        label="End Time"
        placeholder="HH:MM (e.g., 17:00)"
        value={endTime}
        onChangeText={(value) => updateTimeRange(startTime, value)}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <Text className="text-text-muted text-caption">
        Rule will only match notifications received within this time window
      </Text>
    </View>
  );
}

/** Renders the appropriate config form for a condition type */
function ConditionConfigForm({
  condition,
  onUpdate,
}: {
  condition: BuilderCondition;
  onUpdate: (updates: Partial<BuilderCondition>) => void;
}) {
  switch (condition.type) {
    case 'contains':
    case 'not_contains':
      return <TextConditionConfig condition={condition} onUpdate={onUpdate} />;
    case 'regex':
      return <RegexConditionConfig condition={condition} onUpdate={onUpdate} />;
    case 'category':
      return <CategoryConditionConfig condition={condition} onUpdate={onUpdate} />;
    case 'priority':
      return <PriorityConditionConfig condition={condition} onUpdate={onUpdate} />;
    case 'time_window':
      return <TimeWindowConditionConfig condition={condition} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

export function ConditionsStep() {
  const { form, addCondition, removeCondition, updateCondition, reorderCondition } =
    useRuleBuilderStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const handleAddCondition = (type: ConditionType) => {
    const defaultConfig = getDefaultConfig(type);
    const newCondition: BuilderCondition = {
      id: generateId(),
      type,
      config: defaultConfig,
      logicOperator: form.conditions.length > 0 ? 'AND' : 'AND',
    };
    addCondition(newCondition);
    setExpandedId(newCondition.id);
    setShowTypePicker(false);
  };

  const handleUpdate = (id: string, updates: Partial<BuilderCondition>) => {
    updateCondition(id, updates);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View className="flex-1 px-lg py-md">
      <Text className="text-text-primary text-md font-bold mb-xs">
        Add Conditions
      </Text>
      <Text className="text-text-secondary text-body mb-lg">
        Optionally add conditions to narrow when this rule triggers
      </Text>

      {form.conditions.length === 0 && !showTypePicker ? (
        <View className="items-center py-xl">
          <Text className="text-text-muted text-body text-center mb-md">
            No conditions added yet.{'\n'}Conditions are optional — without them,
            the rule triggers for all matching notifications.
          </Text>
        </View>
      ) : (
        <View className="gap-sm mb-lg">
          {form.conditions.map((condition, index) => {
            const option = CONDITION_OPTIONS.find((c) => c.type === condition.type);
            const Icon = option?.icon ?? Search;
            const isExpanded = expandedId === condition.id;
            const isFirst = index === 0;
            const isLast = index === form.conditions.length - 1;

            return (
              <View key={condition.id}>
                {/* Logic operator badge between conditions */}
                {index > 0 ? (
                  <View className="items-center my-sm">
                    <Pressable
                      onPress={() =>
                        handleUpdate(condition.id, {
                          logicOperator:
                            condition.logicOperator === 'AND' ? 'OR' : 'AND',
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Logic operator: ${condition.logicOperator}. Tap to toggle.`}
                      className="px-3 py-1 rounded-full bg-surface-elevated border border-border"
                    >
                      <Text className="text-caption font-bold text-accent-primary">
                        {condition.logicOperator}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Condition card */}
                <View className="rounded-cards border border-border bg-surface-card overflow-hidden">
                  {/* Header row */}
                  <Pressable
                    onPress={() => toggleExpand(condition.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option?.label ?? condition.type} condition. ${isExpanded ? 'Collapse' : 'Expand'} to configure.`}
                    className="flex-row items-center p-md"
                  >
                    <View className="w-8 h-8 rounded-full bg-surface-elevated items-center justify-center mr-sm">
                      <Icon size={16} color="#A1A1AA" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary text-body font-medium">
                        {option?.label ?? condition.type}
                      </Text>
                      <Text className="text-text-muted text-caption mt-xs" numberOfLines={1}>
                        {getConditionSummary(condition)}
                      </Text>
                    </View>

                    {/* Reorder buttons */}
                    <View className="flex-row items-center mr-sm">
                      <Pressable
                        onPress={() => reorderCondition(condition.id, 'up')}
                        disabled={isFirst}
                        accessibilityRole="button"
                        accessibilityLabel="Move condition up"
                        accessibilityState={{ disabled: isFirst }}
                        hitSlop={6}
                        className={`p-1 ${isFirst ? 'opacity-30' : ''}`}
                      >
                        <ChevronUp size={16} color="#A1A1AA" />
                      </Pressable>
                      <Pressable
                        onPress={() => reorderCondition(condition.id, 'down')}
                        disabled={isLast}
                        accessibilityRole="button"
                        accessibilityLabel="Move condition down"
                        accessibilityState={{ disabled: isLast }}
                        hitSlop={6}
                        className={`p-1 ${isLast ? 'opacity-30' : ''}`}
                      >
                        <ChevronDown size={16} color="#A1A1AA" />
                      </Pressable>
                    </View>

                    {/* Remove button */}
                    <Pressable
                      onPress={() => removeCondition(condition.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove condition"
                      hitSlop={8}
                      className="p-1"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </Pressable>

                  {/* Expanded config form */}
                  {isExpanded ? (
                    <View className="px-md pb-md border-t border-border">
                      {/* Type selector */}
                      <View className="mt-sm">
                        <Text className="text-text-secondary text-caption font-medium mb-xs">
                          Condition Type
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          className="mb-sm"
                        >
                          <View className="flex-row gap-xs">
                            {CONDITION_OPTIONS.map((opt) => {
                              const isSelected = condition.type === opt.type;
                              return (
                                <Pressable
                                  key={opt.type}
                                  onPress={() =>
                                    handleUpdate(condition.id, {
                                      type: opt.type,
                                      config: getDefaultConfig(opt.type),
                                    })
                                  }
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected: isSelected }}
                                  accessibilityLabel={`${opt.label}: ${opt.description}`}
                                  className={`px-3 py-1.5 rounded-full border ${
                                    isSelected
                                      ? 'border-accent-primary bg-accent-primary/10'
                                      : 'border-border bg-surface-elevated'
                                  }`}
                                >
                                  <Text
                                    className={`text-caption font-medium ${
                                      isSelected ? 'text-accent-primary' : 'text-text-secondary'
                                    }`}
                                  >
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>

                      {/* Type-specific config form */}
                      <ConditionConfigForm
                        condition={condition}
                        onUpdate={(updates) => handleUpdate(condition.id, updates)}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Type picker for adding new condition */}
      {showTypePicker ? (
        <View className="mb-lg p-md rounded-cards border border-accent-primary/30 bg-surface-card">
          <Text className="text-text-primary text-body font-semibold mb-sm">
            Select Condition Type
          </Text>
          <View className="gap-xs">
            {CONDITION_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Pressable
                  key={option.type}
                  onPress={() => handleAddCondition(option.type)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${option.label} condition: ${option.description}`}
                  className="flex-row items-center p-sm rounded-buttons bg-surface-elevated"
                >
                  <Icon size={16} color="#A1A1AA" />
                  <View className="ml-sm flex-1">
                    <Text className="text-text-primary text-body font-medium">
                      {option.label}
                    </Text>
                    <Text className="text-text-muted text-caption">
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setShowTypePicker(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel adding condition"
            className="mt-sm items-center py-sm"
          >
            <Text className="text-text-muted text-caption font-medium">Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Add condition button */}
      <Pressable
        onPress={() => setShowTypePicker(true)}
        accessibilityRole="button"
        accessibilityLabel="Add a condition"
        className="flex-row items-center justify-center p-md rounded-buttons border border-dashed border-border bg-surface-elevated/50"
      >
        <Plus size={18} color="#3B82F6" />
        <Text className="text-accent-primary text-body font-medium ml-sm">
          Add Condition
        </Text>
      </Pressable>
    </View>
  );
}

/** Returns default config for a given condition type */
function getDefaultConfig(type: ConditionType): BuilderCondition['config'] {
  switch (type) {
    case 'contains':
      return { operator: 'contains', value: '', field: 'content' };
    case 'not_contains':
      return { operator: 'not_contains', value: '', field: 'content' };
    case 'regex':
      return { operator: 'regex', value: '', field: 'content' };
    case 'category':
      return { operator: '==', value: '' };
    case 'priority':
      return { operator: '>=', value: '' };
    case 'time_window':
      return { operator: 'within', value: '-' };
    default:
      return { operator: 'contains', value: '' };
  }
}

/** Returns a human-readable summary of a condition's configuration */
function getConditionSummary(condition: BuilderCondition): string {
  const { type, config } = condition;

  switch (type) {
    case 'contains':
      if (!config.value) return 'Tap to configure';
      return `${config.field ?? 'content'} contains "${config.value}"`;
    case 'not_contains':
      if (!config.value) return 'Tap to configure';
      return `${config.field ?? 'content'} does not contain "${config.value}"`;
    case 'regex':
      if (!config.value) return 'Tap to configure';
      return `${config.field ?? 'content'} matches /${config.value}/`;
    case 'category':
      if (!config.value) return 'Tap to select a category';
      return `Category is ${config.value}`;
    case 'priority':
      if (!config.value) return 'Tap to set priority';
      return `Priority ${config.operator} ${config.value}`;
    case 'time_window': {
      const parts = config.value.split('-');
      if (!parts[0] && !parts[1]) return 'Tap to set time window';
      return `Between ${parts[0] || '??:??'} and ${parts[1] || '??:??'}`;
    }
    default:
      return 'Tap to configure';
  }
}
