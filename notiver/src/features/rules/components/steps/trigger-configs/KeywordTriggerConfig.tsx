import React from 'react';
import { View, Text } from 'react-native';
import { Search } from 'lucide-react-native';
import { Input } from '../../../../../shared/components/atoms/Input';
import { useRuleBuilderStore } from '../../../store/rule-builder-store';

export function KeywordTriggerConfig() {
  const { form, setTriggerConfig } = useRuleBuilderStore();
  const config = form.triggerConfig as { keywords?: string };

  const handleChange = (value: string) => {
    setTriggerConfig({ keywords: value });
  };

  return (
    <View className="mt-md p-lg rounded-cards bg-surface-card border border-border">
      <Text className="text-text-primary text-body font-semibold mb-xs">
        Configure Keyword Trigger
      </Text>
      <Text className="text-text-muted text-caption mb-md">
        Enter keywords to match in notification content. Separate multiple
        keywords with commas.
      </Text>

      <Input
        label="Keywords"
        placeholder="urgent, payment, delivery"
        value={config.keywords ?? ''}
        onChangeText={handleChange}
        leftIcon={Search}
        helperText="Matches if any keyword is found in the notification title or content"
        autoCapitalize="none"
      />
    </View>
  );
}
