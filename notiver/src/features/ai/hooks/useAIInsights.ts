import { sql } from 'drizzle-orm';
import { db } from '@/src/database';
import { aiPredictions } from '@/src/database/schema/ai-predictions';
import { notifications } from '@/src/database/schema/notifications';
import type { NotificationCategory } from '@/src/database/schema/notifications';
import { AIClassifier } from '../engine/classifier';

/**
 * Category distribution entry showing how many notifications
 * were classified into each category.
 */
export interface CategoryDistributionItem {
  category: NotificationCategory;
  count: number;
  percentage: number;
  avgConfidence: number;
}

/**
 * A pattern recommendation based on keyword match analysis.
 */
export interface PatternRecommendation {
  title: string;
  description: string;
  type: 'keyword' | 'trend';
  matchCount: number;
}

/**
 * An automation suggestion based on frequent notification patterns.
 */
export interface AutomationSuggestion {
  title: string;
  reason: string;
  suggestedAction: string;
  frequency: number;
}

/**
 * Complete AI insights data for the screen.
 */
export interface AIInsightsData {
  totalClassified: number;
  categoryDistribution: CategoryDistributionItem[];
  patternRecommendations: PatternRecommendation[];
  automationSuggestions: AutomationSuggestion[];
}

/**
 * Fetches AI insights data by querying the ai_predictions table
 * and analyzing classification patterns.
 */
export async function fetchAIInsights(): Promise<AIInsightsData> {
  // Get category distribution from ai_predictions
  const categoryStats = await db
    .select({
      category: aiPredictions.predictedCategory,
      count: sql<number>`count(*)`,
      avgConfidence: sql<number>`avg(${aiPredictions.confidence})`,
    })
    .from(aiPredictions)
    .groupBy(aiPredictions.predictedCategory)
    .orderBy(sql`count(*) DESC`);

  const totalClassified = categoryStats.reduce((sum, row) => sum + row.count, 0);

  const categoryDistribution: CategoryDistributionItem[] = categoryStats.map((row) => ({
    category: row.category,
    count: row.count,
    percentage: totalClassified > 0 ? Math.round((row.count / totalClassified) * 100) : 0,
    avgConfidence: row.avgConfidence ?? 0,
  }));

  // Get pattern recommendations based on keyword matches
  const patternRecommendations = await buildPatternRecommendations();

  // Get automation suggestions based on frequent patterns
  const automationSuggestions = await buildAutomationSuggestions();

  return {
    totalClassified,
    categoryDistribution,
    patternRecommendations,
    automationSuggestions,
  };
}

/**
 * Analyze keyword matches across predictions to generate pattern recommendations.
 * Looks at which keywords are most frequently matched and suggests patterns.
 */
async function buildPatternRecommendations(): Promise<PatternRecommendation[]> {
  // Get recent predictions with matched keywords
  const recentPredictions = await db
    .select({
      matchedKeywords: aiPredictions.matchedKeywords,
      category: aiPredictions.predictedCategory,
    })
    .from(aiPredictions)
    .where(sql`${aiPredictions.matchedKeywords} IS NOT NULL AND ${aiPredictions.matchedKeywords} != '[]'`)
    .orderBy(sql`${aiPredictions.createdAt} DESC`)
    .limit(200);

  // Count keyword frequency across all predictions
  const keywordCounts: Record<string, { count: number; category: NotificationCategory }> = {};

  for (const prediction of recentPredictions) {
    if (!prediction.matchedKeywords) continue;
    try {
      const keywords: string[] = JSON.parse(prediction.matchedKeywords);
      for (const keyword of keywords) {
        if (!keywordCounts[keyword]) {
          keywordCounts[keyword] = { count: 0, category: prediction.category };
        }
        keywordCounts[keyword].count++;
      }
    } catch {
      // Skip malformed JSON
    }
  }

  // Sort by frequency and take top patterns
  const sortedKeywords = Object.entries(keywordCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  return sortedKeywords.map(([keyword, data]) => ({
    title: `"${keyword}" → ${data.category}`,
    description: `This keyword frequently matches notifications classified as ${data.category}`,
    type: 'keyword' as const,
    matchCount: data.count,
  }));
}

/**
 * Analyze notification patterns to suggest automation rules.
 * Looks at frequently occurring app + category combinations.
 */
async function buildAutomationSuggestions(): Promise<AutomationSuggestion[]> {
  // Find apps that frequently send notifications in specific categories
  const appCategoryPatterns = await db
    .select({
      appName: notifications.appName,
      category: notifications.category,
      count: sql<number>`count(*)`,
    })
    .from(notifications)
    .where(sql`${notifications.category} IS NOT NULL`)
    .groupBy(notifications.appName, notifications.category)
    .having(sql`count(*) >= 3`)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  const suggestions: AutomationSuggestion[] = [];

  for (const pattern of appCategoryPatterns) {
    if (!pattern.category) continue;

    const suggestion = generateSuggestion(
      pattern.appName,
      pattern.category as NotificationCategory,
      pattern.count
    );

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

/**
 * Generate a human-readable automation suggestion based on an app + category pattern.
 */
function generateSuggestion(
  appName: string,
  category: NotificationCategory,
  frequency: number
): AutomationSuggestion | null {
  const actionMap: Record<NotificationCategory, string> = {
    spam: `Auto-dismiss notifications from ${appName}`,
    promotion: `Batch and delay promotional notifications from ${appName}`,
    social: `Group social notifications from ${appName}`,
    work: `Prioritize and alert for work notifications from ${appName}`,
    important: `Sound alarm for important notifications from ${appName}`,
    emergency: `Immediately alert for emergency notifications from ${appName}`,
  };

  const reasonMap: Record<NotificationCategory, string> = {
    spam: `${appName} frequently sends spam notifications`,
    promotion: `${appName} sends many promotional notifications`,
    social: `${appName} sends frequent social notifications`,
    work: `${appName} regularly sends work-related notifications`,
    important: `${appName} often sends important notifications`,
    emergency: `${appName} sends emergency notifications`,
  };

  return {
    title: `${appName} — ${category}`,
    reason: reasonMap[category],
    suggestedAction: actionMap[category],
    frequency,
  };
}
