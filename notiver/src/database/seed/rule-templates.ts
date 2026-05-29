import { db } from '../index';
import { rules, ruleConditions, ruleActions } from '../schema';

/**
 * Pre-built rule templates that users can activate out of the box.
 */
export async function seedRuleTemplates(): Promise<void> {
  const now = new Date();

  // Template 1: Silence Spam
  const silenceSpamId = 'template-silence-spam';
  await db.insert(rules).values({
    id: silenceSpamId,
    name: 'Silence Spam',
    description: 'Automatically dismiss notifications classified as spam',
    triggerType: 'keyword',
    triggerConfig: JSON.stringify({ keywords: ['win', 'prize', 'congratulations', 'claim', 'free'] }),
    isActive: false,
    priority: 10,
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(ruleConditions).values({
    id: 'template-silence-spam-cond-1',
    ruleId: silenceSpamId,
    type: 'category',
    config: JSON.stringify({ category: 'spam' }),
    logicOperator: 'AND',
    orderIndex: 0,
  });
  await db.insert(ruleActions).values({
    id: 'template-silence-spam-action-1',
    ruleId: silenceSpamId,
    type: 'dismiss',
    config: JSON.stringify({}),
    orderIndex: 0,
  });

  // Template 2: Alert on Urgent
  const alertUrgentId = 'template-alert-urgent';
  await db.insert(rules).values({
    id: alertUrgentId,
    name: 'Alert on Urgent',
    description: 'Sound an alarm when a notification contains the word "urgent"',
    triggerType: 'keyword',
    triggerConfig: JSON.stringify({ keywords: ['urgent'] }),
    isActive: false,
    priority: 20,
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(ruleActions).values({
    id: 'template-alert-urgent-action-1',
    ruleId: alertUrgentId,
    type: 'alarm',
    config: JSON.stringify({ sound: 'default' }),
    orderIndex: 0,
  });

  // Template 3: Mute at Night
  const muteNightId = 'template-mute-night';
  await db.insert(rules).values({
    id: muteNightId,
    name: 'Mute at Night',
    description: 'Dismiss all notifications between 10 PM and 7 AM',
    triggerType: 'time',
    triggerConfig: JSON.stringify({ startTime: '22:00', endTime: '07:00' }),
    isActive: false,
    priority: 5,
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(ruleActions).values({
    id: 'template-mute-night-action-1',
    ruleId: muteNightId,
    type: 'dismiss',
    config: JSON.stringify({}),
    orderIndex: 0,
  });

  // Template 4: Focus Work
  const focusWorkId = 'template-focus-work';
  await db.insert(rules).values({
    id: focusWorkId,
    name: 'Focus Work',
    description: 'Dismiss social app notifications during work hours (9 AM - 5 PM)',
    triggerType: 'app',
    triggerConfig: JSON.stringify({ apps: ['com.instagram.android', 'com.twitter.android', 'com.facebook.katana', 'com.snapchat.android'] }),
    isActive: false,
    priority: 15,
    executionCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(ruleConditions).values({
    id: 'template-focus-work-cond-1',
    ruleId: focusWorkId,
    type: 'time_window',
    config: JSON.stringify({ startTime: '09:00', endTime: '17:00' }),
    logicOperator: 'AND',
    orderIndex: 0,
  });
  await db.insert(ruleActions).values({
    id: 'template-focus-work-action-1',
    ruleId: focusWorkId,
    type: 'dismiss',
    config: JSON.stringify({}),
    orderIndex: 0,
  });
}
