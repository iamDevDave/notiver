import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

import { Screen } from '../../../shared/components/templates/Screen';
import { Header } from '../../../shared/components/templates/Header';
import { Button } from '../../../shared/components/atoms/Button';
import { WizardProgressIndicator } from '../components/WizardProgressIndicator';
import { TriggerStep, ConditionsStep, ActionsStep, ReviewStep } from '../components/steps';
import {
  useRuleBuilderStore,
  WIZARD_STEPS,
  WIZARD_STEP_META,
  type WizardStep,
} from '../store/rule-builder-store';
import { persistRule } from '../utils/rule-persistence';
import { validateRuleForm } from '../utils/rule-validation';

/**
 * RuleBuilderModal - A 4-step wizard for creating automation rules.
 *
 * Steps:
 * 1. Select Trigger - Choose what event activates the rule
 * 2. Add Conditions - Optionally narrow when the rule fires
 * 3. Add Actions - Define what happens when the rule triggers
 * 4. Review - Name the rule and review configuration before saving
 */
export function RuleBuilderModal() {
  const router = useRouter();
  const { currentStep, form, nextStep, prevStep, setStep, reset } =
    useRuleBuilderStore();
  const [isSaving, setIsSaving] = useState(false);

  const currentIndex = WIZARD_STEP_META[currentStep].index;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === WIZARD_STEPS.length - 1;

  /** Whether the current step has enough data to proceed */
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'trigger':
        return form.triggerType !== null;
      case 'conditions':
        // Conditions are optional, always allow proceeding
        return true;
      case 'actions':
        return form.actions.length > 0;
      case 'review':
        return validateRuleForm(form).isValid;
      default:
        return false;
    }
  };

  const handleClose = () => {
    reset();
    router.back();
  };

  const handleSaveRule = async () => {
    setIsSaving(true);
    try {
      const result = await persistRule(form);
      if (result.success) {
        reset();
        router.back();
      } else {
        // Validation failed — show alert with errors
        const errorMessages = result.validation.errors.map((e) => e.message).join('\n');
        Alert.alert('Validation Error', errorMessages);
      }
    } catch (error) {
      Alert.alert(
        'Save Failed',
        'An error occurred while saving the rule. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleSaveRule();
    } else {
      nextStep();
    }
  };

  const handleStepPress = (step: WizardStep) => {
    setStep(step);
  };

  /** Render the current step content */
  const renderStepContent = () => {
    switch (currentStep) {
      case 'trigger':
        return <TriggerStep />;
      case 'conditions':
        return <ConditionsStep />;
      case 'actions':
        return <ActionsStep />;
      case 'review':
        return <ReviewStep />;
      default:
        return null;
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        className="flex-1"
      >
        {/* Header with close button */}
        <Header
          title="Create Rule"
          showBack={false}
          actions={[
            {
              icon: X,
              onPress: handleClose,
              accessibilityLabel: 'Close rule builder',
            },
          ]}
        />

        {/* Progress indicator */}
        <WizardProgressIndicator
          currentStep={currentStep}
          onStepPress={handleStepPress}
        />

        {/* Step content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Bottom navigation buttons */}
        <View className="flex-row items-center px-lg py-md gap-sm border-t border-border bg-background-primary">
          {!isFirstStep ? (
            <Button
              label="Back"
              variant="secondary"
              size="md"
              onPress={prevStep}
              className="flex-1"
            />
          ) : (
            <Button
              label="Cancel"
              variant="ghost"
              size="md"
              onPress={handleClose}
              className="flex-1"
            />
          )}

          <Button
            label={isLastStep ? (isSaving ? 'Saving...' : 'Save Rule') : 'Next'}
            variant="primary"
            size="md"
            onPress={handleNext}
            disabled={!canProceed() || isSaving}
            className="flex-1"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
