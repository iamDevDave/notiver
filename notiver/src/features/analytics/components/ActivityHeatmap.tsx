import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';

export interface HeatmapDataPoint {
  day: number;  // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23
  value: number;
}

export interface ActivityHeatmapProps {
  /** Heatmap data points (day × hour → value) */
  data: HeatmapDataPoint[];
  /** Chart height in pixels */
  height?: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

/**
 * Interpolates between two hex colors based on a ratio (0-1).
 */
function interpolateColor(ratio: number): string {
  if (ratio === 0) return colors.surface.elevated;

  // Gradient from dark blue to bright blue
  const r = Math.round(20 + ratio * (59 - 20));
  const g = Math.round(20 + ratio * (130 - 20));
  const b = Math.round(36 + ratio * (246 - 36));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * A heatmap chart showing activity patterns across hours and days of the week.
 * Uses react-native-svg to render a grid of colored cells.
 *
 * Validates: Requirement 12.3
 */
export function ActivityHeatmap({ data, height = 200 }: ActivityHeatmapProps) {
  const chartWidth = 300;
  const labelWidth = 30;
  const labelHeight = 20;
  const gridWidth = chartWidth - labelWidth;
  const gridHeight = height - labelHeight;

  const cellWidth = gridWidth / 24;
  const cellHeight = gridHeight / 7;
  const cellPadding = 1;

  // Find max value for normalization
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Build lookup map for quick access
  const valueMap = new Map<string, number>();
  for (const point of data) {
    const key = `${point.day}-${point.hour}`;
    valueMap.set(key, (valueMap.get(key) ?? 0) + point.value);
  }

  return (
    <View
      style={{ height: height + 30 }}
      accessibilityRole="image"
      accessibilityLabel="Activity heatmap showing notification patterns by hour and day"
    >
      <View className="flex-row">
        {/* Day labels */}
        <View style={{ width: labelWidth, height: gridHeight, justifyContent: 'space-around' }}>
          {DAY_LABELS.map((label) => (
            <Text key={label} className="text-text-muted text-[9px] text-right pr-1">
              {label}
            </Text>
          ))}
        </View>

        {/* Heatmap grid */}
        <Svg width={gridWidth} height={gridHeight} viewBox={`0 0 ${gridWidth} ${gridHeight}`}>
          {Array.from({ length: 7 }, (_, day) =>
            Array.from({ length: 24 }, (_, hour) => {
              const key = `${day}-${hour}`;
              const value = valueMap.get(key) ?? 0;
              const ratio = value / maxValue;
              const fillColor = interpolateColor(ratio);

              return (
                <Rect
                  key={key}
                  x={hour * cellWidth + cellPadding}
                  y={day * cellHeight + cellPadding}
                  width={cellWidth - cellPadding * 2}
                  height={cellHeight - cellPadding * 2}
                  rx={2}
                  ry={2}
                  fill={fillColor}
                />
              );
            })
          )}
        </Svg>
      </View>

      {/* Hour labels */}
      <View className="flex-row" style={{ marginLeft: labelWidth }}>
        {HOUR_LABELS.map((label, i) => (
          <Text
            key={label}
            className="text-text-muted text-[9px]"
            style={{ position: 'absolute', left: i * 3 * cellWidth }}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-end mt-3 pr-2">
        <Text className="text-text-muted text-[9px] mr-1">Less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <View
            key={ratio}
            className="w-3 h-3 rounded-sm mx-0.5"
            style={{ backgroundColor: interpolateColor(ratio) }}
          />
        ))}
        <Text className="text-text-muted text-[9px] ml-1">More</Text>
      </View>
    </View>
  );
}
