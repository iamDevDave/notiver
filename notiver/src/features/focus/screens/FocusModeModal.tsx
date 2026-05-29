/**
 * FocusModeModal - Main focus mode screen.
 *
 * Displays either:
 * 1. Preset selection view (when no active session)
 * 2. Active session view with timer and controls
 * 3. App management view (whitelist/blacklist)
 * 4. Schedule configuration view
 *
 * Requirements: 11.1, 11.4, 11.5
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { X, ListFilter, Calendar } from 'lucide-react-native';

import { Screen } from '../../../shared/components/templates/Screen';
import { Header } from '../../../shared/components/templates/Header';
import { Button } from '../../../shared/components/atoms/Button';
import { PresetCard } from '../components/PresetCard';
import { ActiveSessionDisplay } from '../components/ActiveSessionDisplay';
import { AppManagement } from '../components/AppManagement';
import { ScheduleConfig } from '../components/ScheduleConfig';
import { focusEngine } from '../engine';
import type { FocusPreset, FocusSession } from '../engine/types';
import {
  useFocusStore,
  PRESET_DURATIONS,
  type FocusView,
} from '../store/focus-store';

const PRESETS: FocusPreset[] = ['study', 'work', 'sleep', 'meeting', 'custom'];

export function FocusModeModal() {
  const router = useRouter();
  const store = useFocusStore();
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Hydrate active session on mount
  useEffect(() => {
    const session = focusEngine.getCurrentSession();
    if (session) {
      setActiveSession(session);
      store.setView('active-session');
    }
  }, []);

  const handleClose = () => {
    store.reset();
    router.back();
  };

  const handlePresetSelect = (preset: FocusPreset) => {
    store.selectPreset(preset);
  };

  const handleStartSession = async () => {
    if (!store.selectedPreset) return;

    setIsStarting(true);
    try {
      const session = await focusEngine.startSession(store.selectedPreset, {
        durationMin: store.durationMin,
        blockedApps: store.blockedApps,
        allowedApps: store.allowedApps,
      });
      setActiveSession(session);
      store.setView('active-session');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start session';
      Alert.alert('Error', message);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    try {
      await focusEngine.pauseSession(activeSession.id);
      setActiveSession({ ...activeSession, status: 'paused' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to pause session';
      Alert.alert('Error', message);
    }
  };

  const handleResume = async () => {
    if (!activeSession) return;
    try {
      await focusEngine.resumeSession(activeSession.id);
      setActiveSession({ ...activeSession, status: 'active' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to resume session';
      Alert.alert('Error', message);
    }
  };

  const handleEnd = async () => {
    if (!activeSession) return;

    Alert.alert(
      'End Session',
      'Are you sure you want to end this focus session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await focusEngine.endSession(activeSession.id);
              setActiveSession(null);
              store.setView('presets');
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Failed to end session';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleDurationChange = (delta: number) => {
    const newDuration = Math.max(5, Math.min(480, store.durationMin + delta));
    store.setDuration(newDuration);
  };

  const renderPresetSelection = () => (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Presets */}
        <View className="px-lg mb-lg">
          <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
            Choose a Preset
          </Text>
          <View className="gap-sm">
            {PRESETS.map((preset) => (
              <PresetCard
                key={preset}
                preset={preset}
                isSelected={store.selectedPreset === preset}
                onPress={handlePresetSelect}
              />
            ))}
          </View>
        </View>

        {/* Duration adjustment (shown when preset is selected) */}
        {store.selectedPreset && (
          <View className="px-lg mb-lg">
            <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
              Duration
            </Text>
            <View className="flex-row items-center bg-surface-card rounded-cards border border-border p-lg">
              <Button
                label="−5"
                variant="secondary"
                size="sm"
                onPress={() => handleDurationChange(-5)}
                disabled={store.durationMin <= 5}
              />
              <View className="flex-1 items-center">
                <Text className="text-text-primary text-md font-bold">
                  {store.durationMin >= 60
                    ? `${Math.floor(store.durationMin / 60)}h ${store.durationMin % 60 > 0 ? `${store.durationMin % 60}m` : ''}`
                    : `${store.durationMin}m`}
                </Text>
              </View>
              <Button
                label="+5"
                variant="secondary"
                size="sm"
                onPress={() => handleDurationChange(5)}
                disabled={store.durationMin >= 480}
              />
            </View>
          </View>
        )}

        {/* Quick actions */}
        {store.selectedPreset && (
          <View className="px-lg mb-lg">
            <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
              Options
            </Text>
            <View className="gap-sm">
              <Button
                label="Manage Apps"
                variant="secondary"
                size="md"
                leftIcon={ListFilter}
                onPress={() => store.setView('app-management')}
                className="justify-start"
              />
              <Button
                label="Schedule"
                variant="secondary"
                size="md"
                leftIcon={Calendar}
                onPress={() => store.setView('schedule')}
                className="justify-start"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start button */}
      {store.selectedPreset && (
        <View className="px-lg py-md border-t border-border bg-background-primary">
          <Button
            label={isStarting ? 'Starting...' : 'Start Focus Session'}
            variant="primary"
            size="lg"
            onPress={handleStartSession}
            loading={isStarting}
            disabled={isStarting}
          />
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    switch (store.currentView) {
      case 'active-session':
        if (!activeSession) {
          store.setView('presets');
          return renderPresetSelection();
        }
        return (
          <ActiveSessionDisplay
            session={activeSession}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
          />
        );

      case 'app-management':
        return (
          <AppManagement
            blockedApps={store.blockedApps}
            allowedApps={store.allowedApps}
            onAddBlocked={store.addBlockedApp}
            onRemoveBlocked={store.removeBlockedApp}
            onAddAllowed={store.addAllowedApp}
            onRemoveAllowed={store.removeAllowedApp}
            onBack={() => store.setView('presets')}
          />
        );

      case 'schedule':
        return (
          <ScheduleConfig
            schedule={store.schedule}
            onUpdate={store.setSchedule}
            onBack={() => store.setView('presets')}
          />
        );

      case 'presets':
      default:
        return renderPresetSelection();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Only show the main header for presets and active session views */}
      {(store.currentView === 'presets' || store.currentView === 'active-session') && (
        <Header
          title="Focus Mode"
          showBack={false}
          actions={[
            {
              icon: X,
              onPress: handleClose,
              accessibilityLabel: 'Close focus mode',
            },
          ]}
        />
      )}

      {renderContent()}
    </Screen>
  );
}
