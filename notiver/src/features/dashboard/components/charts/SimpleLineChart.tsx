import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';

export interface LineChartDataPoint {
  label: string;
  value: number;
}

export interface SimpleLineChartProps {
  /** Data points to render */
  data: LineChartDataPoint[];
  /** Chart height in pixels */
  height?: number;
  /** Line color */
  color?: string;
  /** Whether to show data point dots */
  showDots?: boolean;
  /** Whether to show x-axis labels */
  showLabels?: boolean;
}

/**
 * A lightweight line chart component using react-native-svg.
 * Renders a smooth line connecting data points with optional dots and labels.
 */
export function SimpleLineChart({
  data,
  height = 160,
  color = colors.accent.primary,
  showDots = true,
  showLabels = true,
}: SimpleLineChartProps) {
  if (data.length === 0) return null;

  const chartWidth = 300;
  const chartHeight = height - (showLabels ? 30 : 10);
  const paddingX = 20;
  const paddingY = 10;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) =>
    paddingX + (index / Math.max(data.length - 1, 1)) * (chartWidth - paddingX * 2);

  const getY = (value: number) =>
    paddingY + (1 - (value - minValue) / valueRange) * (chartHeight - paddingY * 2);

  // Build SVG path
  const pathPoints = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
  }));

  let pathD = '';
  if (pathPoints.length > 0) {
    pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      // Smooth curve using quadratic bezier
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      const cpX = (prev.x + curr.x) / 2;
      pathD += ` Q ${cpX} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
      pathD += ` Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
    }
  }

  return (
    <View style={{ height }} accessibilityRole="image" accessibilityLabel="Line chart">
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <SvgLine
            key={ratio}
            x1={paddingX}
            y1={paddingY + ratio * (chartHeight - paddingY * 2)}
            x2={chartWidth - paddingX}
            y2={paddingY + ratio * (chartHeight - paddingY * 2)}
            stroke={colors.border.subtle}
            strokeWidth={0.5}
            strokeDasharray="4,4"
          />
        ))}

        {/* Line path */}
        <Path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />

        {/* Data point dots */}
        {showDots &&
          pathPoints.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill={color}
              stroke={colors.background.primary}
              strokeWidth={1.5}
            />
          ))}

        {/* X-axis labels */}
        {showLabels &&
          data.map((d, i) => {
            // Show max 7 labels to avoid crowding
            if (data.length > 7 && i % Math.ceil(data.length / 7) !== 0 && i !== data.length - 1) {
              return null;
            }
            return (
              <SvgText
                key={i}
                x={getX(i)}
                y={height - 5}
                fontSize={10}
                fill={colors.text.muted}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
}
