import React from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';

export function LocationTriggerConfig() {
  return (
    <View className="mt-md p-lg rounded-cards bg-surface-card border border-border">
      <View className="flex-row items-center mb-sm">
        <View className="w-8 h-8 rounded-full bg-accent-warning/20 items-center justify-center mr-sm">
          <MapPin size={16} color="#F59E0B" />
        </View>
        <Text className="text-text-primary text-body font-semibold">
          Location Trigger
        </Text>
      </View>

      <Text className="text-text-muted text-caption">
        Location-based triggers are coming soon. This feature will allow you to
        activate rules based on your geographic location.
      </Text>

      <View className="mt-md p-sm rounded-inputs bg-accent-warning/10 border border-accent-warning/30">
        <Text className="text-accent-warning text-xs text-center">
          Coming Soon
        </Text>
      </View>
    </View>
  );
}
