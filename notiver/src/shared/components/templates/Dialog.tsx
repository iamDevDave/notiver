import React from 'react';
import { View, Text, Modal, Pressable, type ModalProps } from 'react-native';

export interface DialogAction {
  /** Button label */
  label: string;
  /** Callback when pressed */
  onPress: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface DialogProps extends Omit<ModalProps, 'children'> {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Dialog title */
  title: string;
  /** Optional description text below the title */
  description?: string;
  /** Action buttons rendered at the bottom */
  actions?: DialogAction[];
  /** Callback when the overlay is pressed (dismiss) */
  onDismiss?: () => void;
  /** Additional NativeWind classes for the dialog container */
  className?: string;
  /** Dialog body content */
  children?: React.ReactNode;
}

const actionVariantStyles: Record<string, string> = {
  primary: 'bg-accent-primary',
  secondary: 'bg-surface-elevated border border-border',
  danger: 'bg-accent-danger',
};

const actionTextStyles: Record<string, string> = {
  primary: 'text-white',
  secondary: 'text-text-primary',
  danger: 'text-white',
};

export function Dialog({
  visible,
  title,
  description,
  actions = [],
  onDismiss,
  className = '',
  children,
  ...modalProps
}: DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      {...modalProps}
    >
      <Pressable
        className="flex-1 bg-black/60 justify-center items-center px-lg"
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close dialog"
      >
        <Pressable
          className={`bg-surface-card rounded-modals w-full max-w-sm p-xl ${className}`}
          onPress={() => {}}
          accessibilityRole="alert"
        >
          <Text className="text-text-primary text-md font-bold text-center">
            {title}
          </Text>

          {description ? (
            <Text className="text-text-secondary text-body mt-sm text-center">
              {description}
            </Text>
          ) : null}

          {children ? <View className="mt-lg">{children}</View> : null}

          {actions.length > 0 ? (
            <View className="flex-row justify-end gap-sm mt-xl">
              {actions.map((action, index) => (
                <Pressable
                  key={index}
                  onPress={action.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  className={`px-4 py-2.5 rounded-buttons ${actionVariantStyles[action.variant ?? 'primary']}`}
                >
                  <Text
                    className={`font-semibold text-sm ${actionTextStyles[action.variant ?? 'primary']}`}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
