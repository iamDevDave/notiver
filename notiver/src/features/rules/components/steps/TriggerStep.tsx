import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Smartphone,
  Search,
  User,
  Clock,
  MapPin,
  Repeat,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { TriggerType } from '../../../../database/schema/rules';
import { useRuleBuilderStore } from '../../store/rule-builder-store';
import {
  AppTriggerConfig,
  KeywordTriggerConfig,
  ContactTriggerConfig,
  TimeTriggerConfig,
  LocationTriggerConfig,
  FrequencyTriggerConfig,
} from './trigger-configs';

interface TriggerOption {
  type: TriggerType;
  label: string;
  description: string;
  icon: LucideIcon;
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    type: 'app',
    label: 'App',
    description: 'When a notification arrives from a specific app',
    icon: Smartphone,
  },
  {
    type: 'keyword',
    label: 'Keyword',
    description: 'When notification content contains specific words',
    icon: Search,
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'When a notification is from a specific sender',
    icon: User,
  },
  {
    type: 'time',
    label: 'Time',
    description: 'When a notification arrives during a time window',
    icon: Clock,
  },
  {
    type: 'location',
    label: 'Location',
    description: 'When you are at a specific location (coming soon)',
    icon: MapPin,
  },
  {
    type: 'frequency',
    label: 'Frequency',
    description: 'When notifications exceed a frequency threshold',
    icon: Repeat,
  },
];

const TRIGGER_CONFIG_COMPONENTS: Record<TriggerType, React.ComponentType> = {
  app: AppTriggerConfig,
  keyword: KeywordTriggerConfig,
  contact: ContactTriggerConfig,
  time: TimeTriggerConfig,
  location: LocationTriggerConfig,
  frequency: FrequencyTriggerConfig,
};

export function TriggerStep() {
  const { form, setTriggerType } = useRuleBuilderStore();

  const ConfigComponent = form.triggerType
    ? TRIGGER_CONFIG_COMPONENTS[form.triggerType]
    : null;

  return (
    <ScrollView className="flex-1 px-lg py-md" showsVerticalScrollIndicator={false}>
      <Text className="text-text-primary text-md font-bold mb-xs">
        Select a Trigger
      </Text>
      <Text className="text-text-secondary text-body mb-lg">
        Choose what event should activate this rule
      </Text>

      <View className="gap-sm">
        {TRIGGER_OPTIONS.map((option) => {
          const isSelected = form.triggerType === option.type;
          const Icon = option.icon;

          return (
            <Pressable
              key={option.type}
              onPress={() => setTriggerType(option.type)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label}: ${option.description}`}
              className={`flex-row items-center p-lg rounded-cards border ${
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-border bg-surface-card'
              }`}
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-md ${
                  isSelected ? 'bg-accent-primary/20' : 'bg-surface-elevated'
                }`}
              >
                <Icon
                  size={20}
                  color={isSelected ? '#3B82F6' : '#A1A1AA'}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-body font-semibold ${
                    isSelected ? 'text-accent-primary' : 'text-text-primary'
                  }`}
                >
                  {option.label}
                </Text>
                <Text className="text-caption text-text-muted mt-xs">
                  {option.description}
                </Text>
              </View>
              {isSelected ? (
                <View className="w-5 h-5 rounded-full border-2 border-accent-primary items-center justify-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
                </View>
              ) : (
                <View className="w-5 h-5 rounded-full border-2 border-border" />
              )}
            </Pressable>
          );
        })}
      </View>

      {ConfigComponent ? <ConfigComponent /> : null}
    </ScrollView>
  );
}
