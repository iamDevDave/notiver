import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  BellOff,
  Clock,
  Bell,
  Vibrate,
  MessageSquare,
  ExternalLink,
  Layers,
  Globe,
  Copy,
  Volume2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Input } from '../../../../shared/components/atoms/Input';
import { useRuleBuilderStore, type BuilderAction } from '../../store/rule-builder-store';
import type { ActionType } from '../../engine/actions/types';

interface ActionOption {
  type: ActionType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: 'notification' | 'alert' | 'automation';
}

const ACTION_OPTIONS: ActionOption[] = [
  { type: 'dismiss', label: 'Dismiss', description: 'Dismiss the notification', icon: BellOff, category: 'notification' },
  { type: 'delay', label: 'Delay', description: 'Delay notification delivery', icon: Clock, category: 'notification' },
  { type: 'alarm', label: 'Alarm', description: 'Sound an alarm', icon: Bell, category: 'alert' },
  { type: 'vibrate', label: 'Vibrate', description: 'Vibrate the device', icon: Vibrate, category: 'alert' },
  { type: 'reply', label: 'Reply', description: 'Auto-reply to notification', icon: MessageSquare, category: 'automation' },
  { type: 'launch_app', label: 'Launch App', description: 'Open a specific app', icon: ExternalLink, category: 'automation' },
  { type: 'batch', label: 'Batch', description: 'Group similar notifications', icon: Layers, category: 'notification' },
  { type: 'webhook', label: 'Webhook', description: 'Send to a webhook URL', icon: Globe, category: 'automation' },
  { type: 'copy', label: 'Copy', description: 'Copy content to clipboard', icon: Copy, category: 'automation' },
  { type: 'speak', label: 'Speak', description: 'Read notification aloud', icon: Volume2, category: 'alert' },
];

const CATEGORY_LABELS: Record<string, string> = {
  notification: 'Notification',
  alert: 'Alert',
  automation: 'Automation',
};

function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Action Configuration Forms ─────────────────────────────────────────────

/** Dismiss action - no config needed */
function DismissActionConfig() {
  return (
    <View className="mt-sm">
      <Text className="text-text-muted text-caption">
        The notification will be automatically dismissed from the notification shade.
      </Text>
    </View>
  );
}

/** Delay action config */
function DelayActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { delayMinutes?: string };

  return (
    <View className="mt-sm">
      <Input
        label="Delay Duration (minutes)"
        placeholder="e.g., 30"
        value={String(config.delayMinutes ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, delayMinutes: value })}
        keyboardType="numeric"
        helperText="Notification will be re-delivered after this delay"
      />
    </View>
  );
}

/** Alarm action config */
function AlarmActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { durationSeconds?: string; volume?: string };

  return (
    <View className="mt-sm gap-sm">
      <Input
        label="Duration (seconds)"
        placeholder="e.g., 5"
        value={String(config.durationSeconds ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, durationSeconds: value })}
        keyboardType="numeric"
        helperText="How long the alarm should sound"
      />
      <Input
        label="Volume (0-100)"
        placeholder="e.g., 80"
        value={String(config.volume ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, volume: value })}
        keyboardType="numeric"
      />
    </View>
  );
}

/** Vibrate action config */
function VibrateActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { pattern?: string };
  const PATTERNS = [
    { value: 'short', label: 'Short' },
    { value: 'long', label: 'Long' },
    { value: 'double', label: 'Double' },
    { value: 'sos', label: 'SOS' },
  ] as const;

  return (
    <View className="mt-sm">
      <Text className="text-text-secondary text-caption font-medium mb-xs">
        Vibration Pattern
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        {PATTERNS.map((pattern) => {
          const isSelected = config.pattern === pattern.value;
          return (
            <Pressable
              key={pattern.value}
              onPress={() => onUpdate({ ...action.config, pattern: pattern.value })}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Vibration pattern: ${pattern.label}`}
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
                {pattern.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Reply action config */
function ReplyActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { message?: string };

  return (
    <View className="mt-sm">
      <Input
        label="Reply Message"
        placeholder="e.g., I'm busy right now, will reply later"
        value={String(config.message ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, message: value })}
        multiline
        helperText="This message will be sent as an auto-reply"
      />
    </View>
  );
}

/** Launch App action config */
function LaunchAppActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { packageName?: string };

  return (
    <View className="mt-sm">
      <Input
        label="App Package Name"
        placeholder="e.g., com.whatsapp"
        value={String(config.packageName ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, packageName: value })}
        autoCapitalize="none"
        autoCorrect={false}
        helperText="The package name of the app to launch"
      />
    </View>
  );
}

/** Batch action config */
function BatchActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { groupKey?: string; maxCount?: string };

  return (
    <View className="mt-sm gap-sm">
      <Input
        label="Group Key"
        placeholder="e.g., social-messages"
        value={String(config.groupKey ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, groupKey: value })}
        autoCapitalize="none"
        helperText="Notifications with the same key will be grouped together"
      />
      <Input
        label="Max Before Summary"
        placeholder="e.g., 5"
        value={String(config.maxCount ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, maxCount: value })}
        keyboardType="numeric"
        helperText="Number of notifications before showing a summary"
      />
    </View>
  );
}

/** Webhook action config */
function WebhookActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { url?: string; method?: string };
  const METHODS = ['POST', 'GET', 'PUT'] as const;

  return (
    <View className="mt-sm gap-sm">
      <Input
        label="Webhook URL"
        placeholder="https://example.com/webhook"
        value={String(config.url ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, url: value })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <View>
        <Text className="text-text-secondary text-caption font-medium mb-xs">
          HTTP Method
        </Text>
        <View className="flex-row gap-xs">
          {METHODS.map((method) => {
            const isSelected = (config.method ?? 'POST') === method;
            return (
              <Pressable
                key={method}
                onPress={() => onUpdate({ ...action.config, method })}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`HTTP method: ${method}`}
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
                  {method}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Copy action config */
function CopyActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { field?: string };
  const FIELDS = [
    { value: 'title', label: 'Title' },
    { value: 'content', label: 'Content' },
    { value: 'sender', label: 'Sender' },
  ] as const;

  return (
    <View className="mt-sm">
      <Text className="text-text-secondary text-caption font-medium mb-xs">
        Field to Copy
      </Text>
      <View className="flex-row flex-wrap gap-xs">
        {FIELDS.map((field) => {
          const isSelected = (config.field ?? 'content') === field.value;
          return (
            <Pressable
              key={field.value}
              onPress={() => onUpdate({ ...action.config, field: field.value })}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Copy ${field.label}`}
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
      <Text className="text-text-muted text-caption mt-xs">
        The selected field will be copied to the clipboard
      </Text>
    </View>
  );
}

/** Speak action config */
function SpeakActionConfig({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = action.config as { prefix?: string; speakFields?: string };

  return (
    <View className="mt-sm gap-sm">
      <Input
        label="Prefix Text (optional)"
        placeholder="e.g., New message from"
        value={String(config.prefix ?? '')}
        onChangeText={(value) => onUpdate({ ...action.config, prefix: value })}
        helperText="Text spoken before the notification content"
      />
      <View>
        <Text className="text-text-secondary text-caption font-medium mb-xs">
          Fields to Speak
        </Text>
        <View className="flex-row flex-wrap gap-xs">
          {(['title', 'content', 'sender'] as const).map((field) => {
            const currentFields = (config.speakFields ?? 'title,content').split(',');
            const isSelected = currentFields.includes(field);
            return (
              <Pressable
                key={field}
                onPress={() => {
                  const fields = (config.speakFields ?? 'title,content').split(',').filter(Boolean);
                  const updated = isSelected
                    ? fields.filter((f) => f !== field)
                    : [...fields, field];
                  onUpdate({ ...action.config, speakFields: updated.join(',') });
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`Speak ${field}`}
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
                  {field}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Renders the appropriate config form for an action type */
function ActionConfigForm({
  action,
  onUpdate,
}: {
  action: BuilderAction;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  switch (action.type) {
    case 'dismiss':
      return <DismissActionConfig />;
    case 'delay':
      return <DelayActionConfig action={action} onUpdate={onUpdate} />;
    case 'alarm':
      return <AlarmActionConfig action={action} onUpdate={onUpdate} />;
    case 'vibrate':
      return <VibrateActionConfig action={action} onUpdate={onUpdate} />;
    case 'reply':
      return <ReplyActionConfig action={action} onUpdate={onUpdate} />;
    case 'launch_app':
      return <LaunchAppActionConfig action={action} onUpdate={onUpdate} />;
    case 'batch':
      return <BatchActionConfig action={action} onUpdate={onUpdate} />;
    case 'webhook':
      return <WebhookActionConfig action={action} onUpdate={onUpdate} />;
    case 'copy':
      return <CopyActionConfig action={action} onUpdate={onUpdate} />;
    case 'speak':
      return <SpeakActionConfig action={action} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

// ─── Action Summary Helper ──────────────────────────────────────────────────

function getActionSummary(action: BuilderAction): string {
  const config = action.config;
  switch (action.type) {
    case 'dismiss':
      return 'Dismiss notification';
    case 'delay':
      return config.delayMinutes ? `Delay ${config.delayMinutes} minutes` : 'Tap to configure';
    case 'alarm':
      return config.durationSeconds ? `Alarm for ${config.durationSeconds}s` : 'Tap to configure';
    case 'vibrate':
      return config.pattern ? `Vibrate: ${config.pattern}` : 'Tap to configure';
    case 'reply':
      return config.message ? `Reply: "${String(config.message).slice(0, 30)}"` : 'Tap to configure';
    case 'launch_app':
      return config.packageName ? `Launch ${config.packageName}` : 'Tap to configure';
    case 'batch':
      return config.groupKey ? `Group: ${config.groupKey}` : 'Tap to configure';
    case 'webhook':
      return config.url ? `${config.method ?? 'POST'} ${String(config.url).slice(0, 30)}` : 'Tap to configure';
    case 'copy':
      return `Copy ${config.field ?? 'content'}`;
    case 'speak':
      return 'Read aloud';
    default:
      return 'Tap to configure';
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ActionsStep() {
  const { form, addAction, removeAction, updateAction, reorderAction } =
    useRuleBuilderStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleAddAction = (type: ActionType) => {
    const newAction: BuilderAction = {
      id: generateId(),
      type,
      config: getDefaultActionConfig(type),
    };
    addAction(newAction);
    setExpandedId(newAction.id);
    setShowCategoryPicker(false);
  };

  const handleUpdateConfig = (id: string, config: Record<string, unknown>) => {
    updateAction(id, { config });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const groupedActions = {
    notification: ACTION_OPTIONS.filter((a) => a.category === 'notification'),
    alert: ACTION_OPTIONS.filter((a) => a.category === 'alert'),
    automation: ACTION_OPTIONS.filter((a) => a.category === 'automation'),
  };

  return (
    <View className="flex-1 px-lg py-md">
      <Text className="text-text-primary text-md font-bold mb-xs">
        Add Actions
      </Text>
      <Text className="text-text-secondary text-body mb-lg">
        Choose what happens when this rule triggers
      </Text>

      {/* Added actions list */}
      {form.actions.length > 0 ? (
        <View className="mb-lg">
          <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
            Actions ({form.actions.length})
          </Text>
          <View className="gap-sm">
            {form.actions.map((action, index) => {
              const option = ACTION_OPTIONS.find((o) => o.type === action.type);
              const Icon = option?.icon ?? Bell;
              const isExpanded = expandedId === action.id;
              const isFirst = index === 0;
              const isLast = index === form.actions.length - 1;

              return (
                <View
                  key={action.id}
                  className="rounded-cards border border-accent-primary/30 bg-accent-primary/5 overflow-hidden"
                >
                  {/* Header row */}
                  <Pressable
                    onPress={() => toggleExpand(action.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option?.label ?? action.type} action. ${isExpanded ? 'Collapse' : 'Expand'} to configure.`}
                    className="flex-row items-center p-md"
                  >
                    <View className="w-8 h-8 rounded-full bg-accent-primary/20 items-center justify-center mr-sm">
                      <Icon size={16} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary text-body font-medium">
                        {index + 1}. {option?.label ?? action.type}
                      </Text>
                      <Text className="text-text-muted text-caption mt-xs" numberOfLines={1}>
                        {getActionSummary(action)}
                      </Text>
                    </View>

                    {/* Reorder buttons */}
                    <View className="flex-row items-center mr-sm">
                      <Pressable
                        onPress={() => reorderAction(action.id, 'up')}
                        disabled={isFirst}
                        accessibilityRole="button"
                        accessibilityLabel="Move action up"
                        accessibilityState={{ disabled: isFirst }}
                        hitSlop={6}
                        className={`p-1 ${isFirst ? 'opacity-30' : ''}`}
                      >
                        <ChevronUp size={16} color="#A1A1AA" />
                      </Pressable>
                      <Pressable
                        onPress={() => reorderAction(action.id, 'down')}
                        disabled={isLast}
                        accessibilityRole="button"
                        accessibilityLabel="Move action down"
                        accessibilityState={{ disabled: isLast }}
                        hitSlop={6}
                        className={`p-1 ${isLast ? 'opacity-30' : ''}`}
                      >
                        <ChevronDown size={16} color="#A1A1AA" />
                      </Pressable>
                    </View>

                    {/* Remove button */}
                    <Pressable
                      onPress={() => removeAction(action.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${option?.label ?? action.type} action`}
                      hitSlop={8}
                      className="p-1"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </Pressable>

                  {/* Expanded config form */}
                  {isExpanded ? (
                    <View className="px-md pb-md border-t border-accent-primary/20">
                      <ActionConfigForm
                        action={action}
                        onUpdate={(config) => handleUpdateConfig(action.id, config)}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Category picker for adding new action */}
      {showCategoryPicker ? (
        <View className="mb-lg p-md rounded-cards border border-accent-primary/30 bg-surface-card">
          <Text className="text-text-primary text-body font-semibold mb-sm">
            Select Action Type
          </Text>
          {Object.entries(groupedActions).map(([category, actions]) => (
            <View key={category} className="mb-md">
              <Text className="text-text-secondary text-caption font-semibold mb-xs uppercase">
                {CATEGORY_LABELS[category] ?? category}
              </Text>
              <View className="gap-xs">
                {actions.map((option) => {
                  const Icon = option.icon;
                  const isAdded = form.actions.some((a) => a.type === option.type);

                  return (
                    <Pressable
                      key={option.type}
                      onPress={() => handleAddAction(option.type)}
                      disabled={isAdded}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${option.label} action: ${option.description}`}
                      accessibilityState={{ disabled: isAdded }}
                      className={`flex-row items-center p-sm rounded-buttons ${
                        isAdded
                          ? 'bg-surface-card opacity-50'
                          : 'bg-surface-elevated'
                      }`}
                    >
                      <Icon size={16} color={isAdded ? '#71717A' : '#A1A1AA'} />
                      <View className="ml-sm flex-1">
                        <Text
                          className={`text-body font-medium ${
                            isAdded ? 'text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {option.label}
                        </Text>
                        <Text className="text-text-muted text-caption">
                          {option.description}
                        </Text>
                      </View>
                      {isAdded ? (
                        <Text className="text-text-muted text-caption">Added</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => setShowCategoryPicker(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel adding action"
            className="items-center py-sm"
          >
            <Text className="text-text-muted text-caption font-medium">Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Add action button */}
      {!showCategoryPicker ? (
        <Pressable
          onPress={() => setShowCategoryPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Add an action"
          className="flex-row items-center justify-center p-md rounded-buttons border border-dashed border-border bg-surface-elevated/50"
        >
          <Plus size={18} color="#3B82F6" />
          <Text className="text-accent-primary text-body font-medium ml-sm">
            Add Action
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Returns default config for a given action type */
function getDefaultActionConfig(type: ActionType): Record<string, unknown> {
  switch (type) {
    case 'dismiss':
      return {};
    case 'delay':
      return { delayMinutes: '30' };
    case 'alarm':
      return { durationSeconds: '5', volume: '80' };
    case 'vibrate':
      return { pattern: 'short' };
    case 'reply':
      return { message: '' };
    case 'launch_app':
      return { packageName: '' };
    case 'batch':
      return { groupKey: '', maxCount: '5' };
    case 'webhook':
      return { url: '', method: 'POST' };
    case 'copy':
      return { field: 'content' };
    case 'speak':
      return { prefix: '', speakFields: 'title,content' };
    default:
      return {};
  }
}
