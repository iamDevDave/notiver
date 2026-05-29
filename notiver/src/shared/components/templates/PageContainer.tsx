import React from 'react';
import { View, type ViewProps } from 'react-native';

export interface PageContainerProps extends Omit<ViewProps, 'className'> {
  /** Additional NativeWind classes */
  className?: string;
  /** Page content */
  children?: React.ReactNode;
}

export function PageContainer({
  className = '',
  children,
  ...viewProps
}: PageContainerProps) {
  return (
    <View
      className={`flex-1 px-lg py-md max-w-screen-lg self-center w-full ${className}`}
      {...viewProps}
    >
      {children}
    </View>
  );
}
