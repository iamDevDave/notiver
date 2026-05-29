import React from 'react';
import { View, Text } from 'react-native';
import { Repeat } from 'lucide-react-native';
import { Input } from '../../../../../shared/components/atoms/Input';
import { useRuleBuilderStore } from '../../../store/rule-builder-store';

export function FrequencyTriggerConfig() {
  const { form, setTriggerConfig } = useRuleBuilderStore();
  const config = form.triggerConfig as {
    count?: string;
    windowMinutes?: string;
  };

  const handleCountChange = (value: string) => {
    setTriggerConfig({ ...config, count: value });
  };

  const handleWindowChange = (value: string) => {
    setTriggerConfig({ ...config, windowMinutes: value });
  };

  return (
    <View className="mt-md p-lg rounded-cards bg-surface-card border border-border">
      <Text className="text-text-primary text-body font-semibold mb-xs">
        Configure Frequency Threshold
      </Text>
      <Text className="text-text-muted text-caption mb-md">
        Trigger when notifications exceed a count within a time window.
      </Text>

      <View className="flex-row gap-md">
        <View className="flex-1">
          <Input
            label="Notification Count"
            placeholder="5"
            value={config.count ?? ''}
            onChangeText={handleCountChange}
            leftIcon={Repeat}
            keyboardType="number-pad"
            helperText="Threshold count"
          />
        </View>
        <View className="flex-1">
          <Input
            label="Time Window (min)"
            placeholder="60"
            value={config.windowMinutes ?? ''}
            onChangeText={handleWindowChange}
            keyboardType="number-pad"
            helperText="Window in minutes"
          />
        </View>
      </View>

      <Text className="text-text-muted text-xs mt-sm">
        e.g. Trigger when more than 5 notifications arrive within 60 minutes
      </Text>
    </View>
  );
}
