import React, { useState } from 'react';
import { View, TextInput, Text, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface InputProps extends Omit<TextInputProps, 'className'> {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input (hidden when error is present) */
  helperText?: string;
  /** Icon component rendered on the left side of the input */
  leftIcon?: LucideIcon;
  /** Icon component rendered on the right side of the input */
  rightIcon?: LucideIcon;
  /** Additional NativeWind classes for the outer container */
  className?: string;
  /** Additional NativeWind classes for the TextInput */
  inputClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  inputClassName = '',
  onFocus,
  onBlur,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? 'border-accent-danger'
    : isFocused
      ? 'border-accent-primary'
      : 'border-border';

  return (
    <View className={`w-full ${className}`}>
      {label ? (
        <Text className="text-text-secondary text-sm mb-1.5 font-medium">
          {label}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center rounded-inputs bg-surface-card border ${borderColor} px-3`}
      >
        {LeftIcon ? (
          <LeftIcon
            size={18}
            color={error ? '#EF4444' : isFocused ? '#3B82F6' : '#71717A'}
            className="mr-2"
          />
        ) : null}

        <TextInput
          className={`flex-1 text-text-primary text-body py-3 ${inputClassName}`}
          placeholderTextColor="#71717A"
          selectionColor="#3B82F6"
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityState={{ disabled: textInputProps.editable === false }}
          {...textInputProps}
        />

        {RightIcon ? (
          <RightIcon
            size={18}
            color={error ? '#EF4444' : '#71717A'}
            className="ml-2"
          />
        ) : null}
      </View>

      {error ? (
        <Text className="text-accent-danger text-xs mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-text-muted text-xs mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
}
