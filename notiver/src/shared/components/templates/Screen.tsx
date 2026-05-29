import React from 'react';
import { View, ScrollView, StatusBar, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps extends Omit<ViewProps, 'className'> {
  /** Whether the content should be scrollable */
  scrollable?: boolean;
  /** Additional NativeWind classes for the outer SafeAreaView */
  className?: string;
  /** Additional NativeWind classes for the content container */
  contentClassName?: string;
  /** SafeAreaView edges to apply insets to */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Screen content */
  children?: React.ReactNode;
}

export function Screen({
  scrollable = false,
  className = '',
  contentClassName = '',
  edges = ['top', 'bottom'],
  children,
  ...viewProps
}: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges}
      className={`flex-1 bg-background-primary ${className}`}
      {...viewProps}
    >
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />
      {scrollable ? (
        <ScrollView
          className={`flex-1 ${contentClassName}`}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${contentClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
