import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  /** Button label text */
  label: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Icon component from lucide-react-native to render before label */
  leftIcon?: LucideIcon;
  /** Icon component from lucide-react-native to render after label */
  rightIcon?: LucideIcon;
  /** Additional NativeWind classes for the container */
  className?: string;
  /** Additional NativeWind classes for the label text */
  labelClassName?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent-primary',
  secondary: 'bg-surface-elevated border border-border',
  danger: 'bg-accent-danger',
  ghost: 'bg-transparent',
};

const variantPressedStyles: Record<ButtonVariant, string> = {
  primary: 'opacity-80',
  secondary: 'opacity-80',
  danger: 'opacity-80',
  ghost: 'bg-surface-elevated/50',
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-text-primary',
  danger: 'text-white',
  ghost: 'text-text-secondary',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2.5',
  lg: 'px-6 py-3.5',
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const sizeIconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 18,
  lg: 22,
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled,
  className = '',
  labelClassName = '',
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-buttons ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? '#A1A1AA' : '#FFFFFF'}
          className="mr-2"
        />
      ) : LeftIcon ? (
        <LeftIcon
          size={sizeIconSizes[size]}
          color={variant === 'secondary' ? '#FFFFFF' : variant === 'ghost' ? '#A1A1AA' : '#FFFFFF'}
          className="mr-2"
        />
      ) : null}

      <Text
        className={`font-semibold ${variantTextStyles[variant]} ${sizeTextStyles[size]} ${labelClassName}`}
      >
        {label}
      </Text>

      {RightIcon && !loading ? (
        <RightIcon
          size={sizeIconSizes[size]}
          color={variant === 'secondary' ? '#FFFFFF' : variant === 'ghost' ? '#A1A1AA' : '#FFFFFF'}
          className="ml-2"
        />
      ) : null}
    </Pressable>
  );
}
