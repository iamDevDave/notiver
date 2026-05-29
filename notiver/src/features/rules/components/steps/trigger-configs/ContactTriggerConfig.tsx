import React from 'react';
import { View, Text } from 'react-native';
import { User } from 'lucide-react-native';
import { Input } from '../../../../../shared/components/atoms/Input';
import { useRuleBuilderStore } from '../../../store/rule-builder-store';

export function ContactTriggerConfig() {
  const { form, setTriggerConfig } = useRuleBuilderStore();
  const config = form.triggerConfig as { contacts?: string };

  const handleChange = (value: string) => {
    setTriggerConfig({ contacts: value });
  };

  return (
    <View className="mt-md p-lg rounded-cards bg-surface-card border border-border">
      <Text className="text-text-primary text-body font-semibold mb-xs">
        Configure Contact Trigger
      </Text>
      <Text className="text-text-muted text-caption mb-md">
        Enter sender names to match. Separate multiple contacts with commas.
      </Text>

      <Input
        label="Sender Names"
        placeholder="John Doe, Jane Smith, Boss"
        value={config.contacts ?? ''}
        onChangeText={handleChange}
        leftIcon={User}
        helperText="Matches if the notification sender matches any listed name"
      />
    </View>
  );
}
