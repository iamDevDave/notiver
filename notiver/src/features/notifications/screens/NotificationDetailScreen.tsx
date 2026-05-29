import React, { useCallback, useMemo } from 'react';
import { View, Text, Alert, Share as RNShare } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Trash2,
  Archive,
  RotateCcw,
  Share2,
  Download,
  Brain,
  Zap,
  Clock,
  Tag,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Screen } from '@/src/shared/components/templates/Screen';
import { Header } from '@/src/shared/components/templates/Header';
import { LoadingState } from '@/src/shared/components/templates/LoadingState';
import { ErrorState } from '@/src/shared/components/templates/ErrorState';
import { Badge, type BadgeVariant } from '@/src/shared/components/atoms/Badge';
import { Button } from '@/src/shared/components/atoms/Button';
import { Card } from '@/src/shared/components/molecules/Card';
import { notificationRepository } from '@/src/database/repositories';
import { useNotificationDetail } from '../hooks/use-notification-detail';
import { RuleExecutionItem } from '../components/RuleExecutionItem';
import type { NotificationCategory } from '@/src/database/schema/notifications';

interface NotificationDetailScreenProps {
  notificationId: string;
}

export function NotificationDetailScreen({ notificationId }: NotificationDetailScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notification, prediction, executions, isLoading, isError, refetch } =
    useNotificationDetail(notificationId);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await notificationRepository.delete(notificationId);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            router.back();
          },
        },
      ]
    );
  }, [notificationId, queryClient, router]);

  const handleArchive = useCallback(async () => {
    await notificationRepository.update(notificationId, { isArchived: true } as any);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notification', notificationId] });
    refetch();
  }, [notificationId, queryClient, refetch]);

  const handleRestore = useCallback(async () => {
    await notificationRepository.update(notificationId, { isArchived: false } as any);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notification', notificationId] });
    refetch();
  }, [notificationId, queryClient, refetch]);

  const handleShare = useCallback(async () => {
    if (!notification) return;
    const message = [
      notification.title && `${notification.title}`,
      notification.content,
      `From: ${notification.appName}`,
      notification.sender && `Sender: ${notification.sender}`,
      `Received: ${formatFullDate(notification.receivedAt as unknown as Date)}`,
    ]
      .filter(Boolean)
      .join('\n');

    await RNShare.share({ message, title: notification.title ?? 'Notification' });
  }, [notification]);

  const handleExport = useCallback(async () => {
    if (!notification) return;
    const exportData = {
      notification,
      prediction,
      executions,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(exportData, null, 2);
    await RNShare.share({
      message: json,
      title: `notification-${notificationId}.json`,
    });
  }, [notification, prediction, executions, notificationId]);

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <Header title="Notification" showBack onBack={handleBack} />
        <LoadingState message="Loading notification..." />
      </Screen>
    );
  }

  if (isError || !notification) {
    return (
      <Screen edges={['top']}>
        <Header title="Notification" showBack onBack={handleBack} />
        <ErrorState
          message="This notification may have been deleted or is no longer available."
          onRetry={refetch}
        />
      </Screen>
    );
  }

  const isArchived = notification.isArchived;

  return (
    <Screen edges={['top']} scrollable>
      <Header title="Notification" showBack onBack={handleBack} />

      <View className="px-lg pb-xl gap-md">
        {/* Metadata Section */}
        <MetadataSection
          appName={notification.appName}
          packageName={notification.packageName}
          receivedAt={notification.receivedAt as unknown as Date}
          priority={notification.priority ?? 0}
          category={notification.category as NotificationCategory | null}
          isArchived={isArchived ?? false}
        />

        {/* Content Section */}
        <ContentSection
          title={notification.title}
          content={notification.content}
          sender={notification.sender}
        />

        {/* AI Classification Section */}
        {prediction && (
          <AIClassificationSection
            predictedCategory={prediction.predictedCategory as NotificationCategory}
            confidence={prediction.confidence as number}
            matchedKeywords={prediction.matchedKeywords}
          />
        )}

        {/* Rule Executions Section */}
        {executions.length > 0 && (
          <RuleExecutionsSection executions={executions} />
        )}

        {/* Actions Section */}
        <ActionsSection
          isArchived={isArchived ?? false}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onShare={handleShare}
          onExport={handleExport}
        />
      </View>
    </Screen>
  );
}

// --- Sub-components ---

function MetadataSection({
  appName,
  packageName,
  receivedAt,
  priority,
  category,
  isArchived,
}: {
  appName: string;
  packageName: string;
  receivedAt: Date;
  priority: number;
  category: NotificationCategory | null;
  isArchived: boolean;
}) {
  return (
    <Card header={{ title: 'Metadata', subtitle: 'Notification details' }}>
      <View className="gap-sm">
        <MetadataRow label="App" value={appName} />
        <MetadataRow label="Package" value={packageName} />
        <MetadataRow label="Received" value={formatFullDate(receivedAt)} />
        <MetadataRow label="Priority" value={<PriorityBadge priority={priority} />} />
        <MetadataRow
          label="Category"
          value={
            category ? (
              <Badge
                label={category.charAt(0).toUpperCase() + category.slice(1)}
                variant={category as BadgeVariant}
              />
            ) : (
              <Text className="text-text-muted text-caption">Uncategorized</Text>
            )
          }
        />
        {isArchived && (
          <MetadataRow
            label="Status"
            value={<Badge label="Archived" variant="default" />}
          />
        )}
      </View>
    </Card>
  );
}

function ContentSection({
  title,
  content,
  sender,
}: {
  title: string | null;
  content: string | null;
  sender: string | null;
}) {
  return (
    <Card header={{ title: 'Content', subtitle: 'Full notification content' }}>
      <View className="gap-sm">
        {title && (
          <View>
            <Text className="text-text-muted text-caption mb-xs">Title</Text>
            <Text className="text-text-primary text-body font-semibold">{title}</Text>
          </View>
        )}
        {content && (
          <View>
            <Text className="text-text-muted text-caption mb-xs">Body</Text>
            <Text className="text-text-secondary text-body">{content}</Text>
          </View>
        )}
        {sender && (
          <View>
            <Text className="text-text-muted text-caption mb-xs">Sender</Text>
            <Text className="text-text-secondary text-body">{sender}</Text>
          </View>
        )}
        {!title && !content && !sender && (
          <Text className="text-text-muted text-caption italic">No content available</Text>
        )}
      </View>
    </Card>
  );
}

function AIClassificationSection({
  predictedCategory,
  confidence,
  matchedKeywords,
}: {
  predictedCategory: NotificationCategory;
  confidence: number;
  matchedKeywords: string | null;
}) {
  const keywords: string[] = useMemo(() => {
    if (!matchedKeywords) return [];
    try {
      return JSON.parse(matchedKeywords);
    } catch {
      return [];
    }
  }, [matchedKeywords]);

  const confidencePercent = Math.round(confidence * 100);

  return (
    <Card
      header={{
        title: 'AI Classification',
        subtitle: 'Keyword-based prediction',
      }}
    >
      <View className="gap-sm">
        <View className="flex-row items-center gap-sm">
          <Brain size={16} color="#8B5CF6" />
          <Text className="text-text-secondary text-body">Predicted Category</Text>
        </View>
        <Badge
          label={predictedCategory.charAt(0).toUpperCase() + predictedCategory.slice(1)}
          variant={predictedCategory as BadgeVariant}
        />

        <View className="flex-row items-center gap-sm mt-sm">
          <Zap size={16} color="#F59E0B" />
          <Text className="text-text-secondary text-body">Confidence</Text>
        </View>
        <View className="flex-row items-center gap-sm">
          <View className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
            <View
              className="h-full bg-accent-ai rounded-full"
              style={{ width: `${confidencePercent}%` }}
            />
          </View>
          <Text className="text-text-primary text-caption font-medium">
            {confidencePercent}%
          </Text>
        </View>

        {keywords.length > 0 && (
          <>
            <View className="flex-row items-center gap-sm mt-sm">
              <Tag size={16} color="#3B82F6" />
              <Text className="text-text-secondary text-body">Matched Keywords</Text>
            </View>
            <View className="flex-row flex-wrap gap-xs">
              {keywords.map((keyword, index) => (
                <Badge key={index} label={keyword} variant="default" />
              ))}
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

function RuleExecutionsSection({
  executions,
}: {
  executions: Array<Record<string, unknown>>;
}) {
  return (
    <Card
      header={{
        title: 'Rule Executions',
        subtitle: `${executions.length} rule${executions.length !== 1 ? 's' : ''} matched`,
      }}
    >
      <View className="gap-sm">
        {executions.map((execution) => (
          <RuleExecutionItem
            key={execution.id as string}
            execution={execution}
          />
        ))}
      </View>
    </Card>
  );
}

function ActionsSection({
  isArchived,
  onDelete,
  onArchive,
  onRestore,
  onShare,
  onExport,
}: {
  isArchived: boolean;
  onDelete: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onShare: () => void;
  onExport: () => void;
}) {
  return (
    <Card header={{ title: 'Actions' }}>
      <View className="gap-sm">
        <View className="flex-row gap-sm">
          <View className="flex-1">
            <Button
              label="Share"
              variant="secondary"
              size="sm"
              leftIcon={Share2}
              onPress={onShare}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Export"
              variant="secondary"
              size="sm"
              leftIcon={Download}
              onPress={onExport}
            />
          </View>
        </View>
        <View className="flex-row gap-sm">
          {isArchived ? (
            <View className="flex-1">
              <Button
                label="Restore"
                variant="secondary"
                size="sm"
                leftIcon={RotateCcw}
                onPress={onRestore}
              />
            </View>
          ) : (
            <View className="flex-1">
              <Button
                label="Archive"
                variant="secondary"
                size="sm"
                leftIcon={Archive}
                onPress={onArchive}
              />
            </View>
          )}
          <View className="flex-1">
            <Button
              label="Delete"
              variant="danger"
              size="sm"
              leftIcon={Trash2}
              onPress={onDelete}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

// --- Helper components ---

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between py-xs">
      <Text className="text-text-muted text-caption">{label}</Text>
      {typeof value === 'string' ? (
        <Text className="text-text-primary text-caption font-medium flex-shrink" numberOfLines={1}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const getPriorityLabel = (p: number) => {
    if (p >= 4) return 'Critical';
    if (p >= 3) return 'High';
    if (p >= 2) return 'Medium';
    if (p >= 1) return 'Low';
    return 'None';
  };

  const getPriorityVariant = (p: number): BadgeVariant => {
    if (p >= 4) return 'emergency';
    if (p >= 3) return 'important';
    if (p >= 2) return 'work';
    return 'default';
  };

  return <Badge label={getPriorityLabel(priority)} variant={getPriorityVariant(priority)} />;
}

// --- Utility functions ---

function formatFullDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
