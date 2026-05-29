import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface SimpleBarChartProps {
  /** Data points to render as bars */
  data: BarChartDataPoint[];
  /** Chart height in pixels */
  height?: number;
  /** Default bar color */
  color?: string;
  /** Whether to show value labels on top of bars */
  showValues?: boolean;
  /** Whether to show x-axis labels */
  showLabels?: boolean;
}

/**
 * A lightweight bar chart component using react-native-svg.
 * Renders vertical bars with optional value labels and x-axis labels.
 */
export function SimpleBarChart({
  data,
  height = 160,
  color = colors.accent.primary,
  showValues = true,
  showLabels = true,
}: SimpleBarChartProps) {
  if (data.length === 0) return null;

  const chartWidth = 300;
  const chartHeight = height - (showLabels ? 30 : 10);
  const paddingX = 20;
  const paddingY = 20;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const barWidth = Math.min(
    30,
    (chartWidth - paddingX * 2) / data.length - 8
  );

  const getX = (index: number) =>
    paddingX + (index + 0.5) * ((chartWidth - paddingX * 2) / data.length);

  const getBarHeight = (value: number) =>
    (value / maxValue) * (chartHeight - paddingY * 2);

  return (
    <View style={{ height }} accessibilityRole="image" accessibilityLabel="Bar chart">
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        {/* Bars */}
        {data.map((d, i) => {
          const barH = getBarHeight(d.value);
          const x = getX(i) - barWidth / 2;
          const y = chartHeight - paddingY - barH;

          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                ry={4}
                fill={d.color ?? color}
                opacity={0.85}
              />
              {showValues && d.value > 0 && (
                <SvgText
                  x={getX(i)}
                  y={y - 6}
                  fontSize={10}
                  fill={colors.text.secondary}
                  textAnchor="middle"
                >
                  {d.value}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {showLabels &&
          data.map((d, i) => (
            <SvgText
              key={`label-${i}`}
              x={getX(i)}
              y={height - 5}
              fontSize={10}
              fill={colors.text.muted}
              textAnchor="middle"
            >
              {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
            </SvgText>
          ))}
      </Svg>
    </View>
  );
}
