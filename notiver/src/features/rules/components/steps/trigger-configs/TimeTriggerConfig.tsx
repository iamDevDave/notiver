import React from 'react';
import { View, Text } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Input } from '../../../../../shared/components/atoms/Input';
import { useRuleBuilderStore } from '../../../store/rule-builder-store';

export function TimeTriggerConfig() {
  const { form, setTriggerConfig } = useRuleBuilderStore();
  const config = form.triggerConfig as {
    startTime?: string;
    endTime?: string;
  };

  const handleStartChange = (value: string) => {
    setTriggerConfig({ ...config, startTime: value });
  };

  const handleEndChange = (value: string) => {
    setTriggerConfig({ ...config, endTime: value });
  };

  return (
    <View className="mt-md p-lg rounded-cards bg-surface-card border border-border">
      <Text className="text-text-primary text-body font-semibold mb-xs">
        Configure Time Window
      </Text>
      <Text className="text-text-muted text-caption mb-md">
        Set the time window during which this trigger is active. Use 24-hour
        format (HH:MM).
      </Text>

      <View className="flex-row gap-md">
        <View className="flex-1">
          <Input
            label="Start Time"
            placeholder="09:00"
            value={config.startTime ?? ''}
            onChangeText={handleStartChange}
            leftIcon={Clock}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View className="flex-1">
          <Input
            label="End Time"
            placeholder="17:00"
            value={config.endTime ?? ''}
            onChangeText={handleEndChange}
            leftIcon={Clock}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <Text className="text-text-muted text-xs mt-sm">
        Trigger activates for notifications received between start and end time
      </Text>
    </View>
  );
}
