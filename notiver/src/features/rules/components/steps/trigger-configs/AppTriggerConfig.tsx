import React from 'react';
import { View, Text } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { Input } from '../../../../../shared/components/atoms/Input';
import { useRuleBuilderStore } from '../../../store/rule-builder-store';

export function AppTriggerConfig() {
  const { form, setTriggerConfig } = useRuleBuilderStore();
  const config = form.triggerConfig as { packageNames?: string };

  const handleChange = (value: string) => {
    setTriggerConfig({ packageNames: value });
  };

  return (
    <View className="mt-md p-lg rounded-cards bg-surface-card border border-border">
      <Text className="text-text-primary text-body font-semibold mb-xs">
        Configure App Trigger
      </Text>
      <Text className="text-text-muted text-caption mb-md">
        Enter the package names of apps to monitor. Separate multiple apps with
        commas.
      </Text>

      <Input
        label="App Package Names"
        placeholder="com.whatsapp, com.slack, com.gmail"
        value={config.packageNames ?? ''}
        onChangeText={handleChange}
        leftIcon={Smartphone}
        helperText="e.g. com.whatsapp, com.google.android.gm"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
