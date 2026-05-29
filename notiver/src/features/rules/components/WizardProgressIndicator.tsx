import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import {
  WIZARD_STEPS,
  WIZARD_STEP_META,
  type WizardStep,
} from '../store/rule-builder-store';

export interface WizardProgressIndicatorProps {
  /** Current active step */
  currentStep: WizardStep;
  /** Callback when a step dot is pressed (for navigating back to completed steps) */
  onStepPress?: (step: WizardStep) => void;
}

export function WizardProgressIndicator({
  currentStep,
  onStepPress,
}: WizardProgressIndicatorProps) {
  const currentIndex = WIZARD_STEP_META[currentStep].index;

  return (
    <View className="px-lg py-md">
      {/* Step dots and connecting lines */}
      <View className="flex-row items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={step}>
              {/* Step dot */}
              <Pressable
                onPress={() => {
                  if (isCompleted && onStepPress) {
                    onStepPress(step);
                  }
                }}
                disabled={!isCompleted}
                accessibilityRole="button"
                accessibilityLabel={`Step ${index + 1}: ${WIZARD_STEP_META[step].label}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                accessibilityState={{ selected: isActive }}
                className="items-center"
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    isCompleted
                      ? 'bg-accent-success'
                      : isActive
                        ? 'bg-accent-primary'
                        : 'bg-surface-elevated border border-border'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} color="#FFFFFF" />
                  ) : (
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? 'text-white' : 'text-text-muted'
                      }`}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
              </Pressable>

              {/* Connecting line (not after last step) */}
              {index < WIZARD_STEPS.length - 1 ? (
                <View
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentIndex ? 'bg-accent-success' : 'bg-border'
                  }`}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Step labels */}
      <View className="flex-row justify-between mt-sm">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          return (
            <Text
              key={step}
              className={`text-caption text-center ${
                isActive ? 'text-text-primary font-semibold' : 'text-text-muted'
              }`}
              style={{ width: 70 }}
              numberOfLines={1}
            >
              {WIZARD_STEP_META[step].label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
