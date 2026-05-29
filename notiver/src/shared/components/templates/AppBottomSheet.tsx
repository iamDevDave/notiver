import React, { useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';

export interface AppBottomSheetProps
  extends Omit<BottomSheetProps, 'children' | 'snapPoints'> {
  /** Title displayed at the top of the sheet */
  title?: string;
  /** Snap points for the bottom sheet (e.g. ['25%', '50%']) */
  snapPoints?: (string | number)[];
  /** Additional NativeWind classes for the content container */
  className?: string;
  /** Sheet content */
  children?: React.ReactNode;
}

export function AppBottomSheet({
  title,
  snapPoints: snapPointsProp,
  className = '',
  children,
  ...sheetProps
}: AppBottomSheetProps) {
  const snapPoints = useMemo(
    () => snapPointsProp ?? ['25%', '50%', '75%'],
    [snapPointsProp],
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  return (
    <BottomSheet
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#18181B', borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#71717A', width: 40 }}
      {...sheetProps}
    >
      <BottomSheetView className={`flex-1 px-lg pt-sm pb-lg ${className}`}>
        {title ? (
          <Text className="text-text-primary text-md font-semibold mb-md text-center">
            {title}
          </Text>
        ) : null}
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}
