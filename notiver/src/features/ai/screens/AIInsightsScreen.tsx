import React from 'react';
import { View, Text } from 'react-native';
import {
  Brain,
  Sparkles,
  Zap,
  PieChart,
  TrendingUp,
  Lightbulb,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { Screen } from '@/src/shared/components/templates/Screen';
import { Header } from '@/src/shared/components/templates/Header';
import { PageContainer } from '@/src/shared/components/templates/PageContainer';
import { Section } from '@/src/shared/components/templates/Section';
import { LoadingState } from '@/src/shared/components/templates/LoadingState';
import { EmptyState } from '@/src/shared/components/templates/EmptyState';
import { Card } from '@/src/shared/components/molecules/Card';
import { Badge } from '@/src/shared/components/atoms/Badge';
import { ListItem } from '@/src/shared/components/molecules/ListItem';

import { fetchAIInsights, type AIInsightsData } from '../hooks/useAIInsights';

/**
 * AI Insights Screen
 *
 * Displays:
 * - Classification accuracy summary (category distribution)
 * - Pattern recommendations based on keyword matches
 * - Automation suggestions based on frequent patterns
 *
 * Validates: Requirements 13.3
 */
export function AIInsightsScreen() {
  const {
    data: insights,
    isLoading,
    error,
  } = useQuery<AIInsightsData>({
    queryKey: ['ai-insights'],
    queryFn: fetchAIInsights,
  });

  if (isLoading) {
    return (
      <Screen>
        <Header title="AI Insights" showBack />
        <LoadingState message="Analyzing classification data..." />
      </Screen>
    );
  }

  if (error || !insights) {
    return (
      <Screen>
        <Header title="AI Insights" showBack />
        <EmptyState
          icon={Brain}
          title="No Insights Available"
          description="AI insights will appear once notifications have been classified."
        />
      </Screen>
    );
  }

  const { categoryDistribution, patternRecommendations, automationSuggestions, totalClassified } = insights;

  if (totalClassified === 0) {
    return (
      <Screen>
        <Header title="AI Insights" showBack />
        <EmptyState
          icon={Brain}
          title="No Classifications Yet"
          description="Start receiving notifications to see AI classification insights and pattern recommendations."
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <Header title="AI Insights" showBack />
      <PageContainer>
        {/* Classification Accuracy Summary */}
        <Section
          title="Classification Summary"
          subtitle={`${totalClassified} notifications classified`}
        >
          <Card
            header={{
              title: 'Category Distribution',
              subtitle: 'How your notifications are categorized',
            }}
          >
            <View className="gap-sm">
              {categoryDistribution.map((item) => (
                <CategoryDistributionRow
                  key={item.category}
                  category={item.category}
                  count={item.count}
                  percentage={item.percentage}
                  avgConfidence={item.avgConfidence}
                />
              ))}
            </View>
          </Card>
        </Section>

        {/* Pattern Recommendations */}
        <Section
          title="Pattern Recommendations"
          subtitle="Insights based on keyword matches"
        >
          {patternRecommendations.length > 0 ? (
            <Card>
              <View className="gap-xs">
                {patternRecommendations.map((rec, index) => (
                  <ListItem
                    key={index}
                    title={rec.title}
                    subtitle={rec.description}
                    leftIcon={rec.type === 'keyword' ? Sparkles : TrendingUp}
                    leftIconColor="#8B5CF6"
                    trailingElement={
                      <Badge
                        label={`${rec.matchCount} matches`}
                        variant="work"
                      />
                    }
                  />
                ))}
              </View>
            </Card>
          ) : (
            <Card>
              <View className="items-center py-md">
                <Lightbulb size={24} color="#71717A" />
                <Text className="text-text-muted text-caption mt-sm text-center">
                  More data needed for pattern recommendations
                </Text>
              </View>
            </Card>
          )}
        </Section>

        {/* Automation Suggestions */}
        <Section
          title="Automation Suggestions"
          subtitle="Rules you could create based on frequent patterns"
        >
          {automationSuggestions.length > 0 ? (
            <View className="gap-md">
              {automationSuggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  header={{
                    title: suggestion.title,
                    subtitle: suggestion.reason,
                  }}
                >
                  <View className="flex-row items-center gap-sm">
                    <Zap size={16} color="#F59E0B" />
                    <Text className="text-text-secondary text-caption flex-1">
                      {suggestion.suggestedAction}
                    </Text>
                    <Badge
                      label={`${suggestion.frequency}x`}
                      variant="promotion"
                    />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Card>
              <View className="items-center py-md">
                <Zap size={24} color="#71717A" />
                <Text className="text-text-muted text-caption mt-sm text-center">
                  More data needed for automation suggestions
                </Text>
              </View>
            </Card>
          )}
        </Section>
      </PageContainer>
    </Screen>
  );
}

/**
 * Row component showing a single category's distribution with a progress bar.
 */
function CategoryDistributionRow({
  category,
  count,
  percentage,
  avgConfidence,
}: {
  category: string;
  count: number;
  percentage: number;
  avgConfidence: number;
}) {
  const categoryColors: Record<string, string> = {
    important: '#3B82F6',
    work: '#8B5CF6',
    social: '#10B981',
    spam: '#71717A',
    promotion: '#F59E0B',
    emergency: '#EF4444',
  };

  const barColor = categoryColors[category] ?? '#71717A';

  return (
    <View className="mb-sm" accessibilityLabel={`${category}: ${count} notifications, ${percentage}%`}>
      <View className="flex-row items-center justify-between mb-xs">
        <View className="flex-row items-center gap-sm">
          <Badge
            label={category.charAt(0).toUpperCase() + category.slice(1)}
            variant={category as any}
          />
          <Text className="text-text-secondary text-caption">
            {count} ({percentage}%)
          </Text>
        </View>
        <Text className="text-text-muted text-caption">
          {Math.round(avgConfidence * 100)}% conf.
        </Text>
      </View>
      <View className="h-2 bg-surface-elevated rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </View>
    </View>
  );
}
