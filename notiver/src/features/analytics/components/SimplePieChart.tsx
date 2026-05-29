import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';

export interface PieChartDataPoint {
  label: string;
  value: number;
  color: string;
}

export interface SimplePieChartProps {
  /** Data points to render as pie slices */
  data: PieChartDataPoint[];
  /** Chart size (width and height) in pixels */
  size?: number;
  /** Whether to show a legend below the chart */
  showLegend?: boolean;
}

/**
 * Converts polar coordinates to cartesian for SVG path drawing.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Creates an SVG arc path for a pie slice.
 */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

/**
 * A lightweight pie chart component using react-native-svg.
 * Renders colored slices with an optional legend.
 */
export function SimplePieChart({
  data,
  size = 180,
  showLegend = true,
}: SimplePieChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;

  let currentAngle = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sliceAngle = (d.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;
      return { ...d, startAngle, endAngle, percentage: Math.round((d.value / total) * 100) };
    });

  return (
    <View accessibilityRole="image" accessibilityLabel="Pie chart showing category distribution">
      <View className="items-center">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, i) => {
            // Handle full circle case (single slice)
            if (slice.endAngle - slice.startAngle >= 359.99) {
              return (
                <Path
                  key={i}
                  d={`M ${cx} ${cy} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`}
                  fill={slice.color}
                  opacity={0.85}
                />
              );
            }
            return (
              <Path
                key={i}
                d={describeArc(cx, cy, radius, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                opacity={0.85}
              />
            );
          })}
        </Svg>
      </View>

      {showLegend && (
        <View className="mt-md flex-row flex-wrap justify-center gap-x-4 gap-y-2">
          {slices.map((slice, i) => (
            <View key={i} className="flex-row items-center">
              <View
                className="w-3 h-3 rounded-full mr-1.5"
                style={{ backgroundColor: slice.color }}
              />
              <Text className="text-text-secondary text-caption">
                {slice.label} ({slice.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
