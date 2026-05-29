import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  /** The lucide-react-native icon component to render */
  icon: LucideIcon;
  /** Icon size in pixels */
  size?: number;
  /** Icon color (hex or named color) */
  color?: string;
  /** Additional NativeWind classes */
  className?: string;
}

export function Icon({
  icon: IconComponent,
  size = 24,
  color = '#FFFFFF',
  className = '',
  ...props
}: IconProps) {
  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
      accessibilityRole="image"
      {...props}
    />
  );
}
