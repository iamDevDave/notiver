/**
 * ActiveSessionDisplay - Shows the active focus session with timer,
 * controls (pause/resume/end), and blocked notification count.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Pause, Play, Square, ShieldOff } from 'lucide-react-native';
import type { FocusSession } from '../engine/types';
import { PRESET_META } from '../store/focus-store';

export interface ActiveSessionDisplayProps {
  session: FocusSession;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

export function ActiveSessionDisplay({
  session,
  onPause,
  onResume,
  onEnd,
}: ActiveSessionDisplayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = session.plannedDurationMin * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const progress = Math.min(1, elapsedSeconds / totalSeconds);
  const isPaused = session.status === 'paused';
  const meta = PRESET_META[session.preset];

  useEffect(() => {
    // Calculate initial elapsed time from session start
    const now = new Date();
    const elapsed = Math.floor(
      (now.getTime() - session.startedAt.getTime()) / 1000
    );
    setElapsedSeconds(Math.max(0, elapsed));

    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session.startedAt, isPaused]);

  useEffect(() => {
    if (isPaused && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (!isPaused && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 items-center justify-center px-lg">
      {/* Preset label */}
      <View
        className="px-md py-xs rounded-full mb-lg"
        style={{ backgroundColor: `${meta.color}20` }}
      >
        <Text style={{ color: meta.color }} className="text-caption font-semibold">
          {meta.label} Mode
        </Text>
      </View>

      {/* Timer display */}
      <View className="items-center mb-xxl">
        <Text className="text-text-primary font-bold" style={{ fontSize: 56, lineHeight: 64 }}>
          {formatTime(remainingSeconds)}
        </Text>
        <Text className="text-text-muted text-caption mt-sm">
          {isPaused ? 'Paused' : 'Remaining'}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="w-full h-2 bg-surface-elevated rounded-full mb-xxl overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: meta.color,
          }}
        />
      </View>

      {/* Blocked count */}
      <View className="flex-row items-center mb-xxxl">
        <ShieldOff size={16} color="#A1A1AA" />
        <Text className="text-text-secondary text-caption ml-sm">
          {session.blockedCount} notification{session.blockedCount !== 1 ? 's' : ''} blocked
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row items-center gap-lg">
        {/* Pause / Resume */}
        <Pressable
          onPress={isPaused ? onResume : onPause}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
          className="w-16 h-16 rounded-full bg-surface-elevated items-center justify-center border border-border"
        >
          {isPaused ? (
            <Play size={28} color="#10B981" />
          ) : (
            <Pause size={28} color="#F59E0B" />
          )}
        </Pressable>

        {/* End session */}
        <Pressable
          onPress={onEnd}
          accessibilityRole="button"
          accessibilityLabel="End session"
          className="w-16 h-16 rounded-full bg-accent-danger/20 items-center justify-center border border-accent-danger/40"
        >
          <Square size={24} color="#EF4444" />
        </Pressable>
      </View>

      {/* Control labels */}
      <View className="flex-row items-center gap-lg mt-sm">
        <Text className="text-text-muted text-caption w-16 text-center">
          {isPaused ? 'Resume' : 'Pause'}
        </Text>
        <Text className="text-text-muted text-caption w-16 text-center">
          End
        </Text>
      </View>
    </View>
  );
}
