import { AppEvents, eventBus } from '../../../services/event-bus';
import { classificationService } from './classification-service';

// Mock the repositories
jest.mock('../../../database/repositories', () => ({
  settingsRepository: {
    get: jest.fn(),
    set: jest.fn(),
  },
  aiPredictionRepository: {
    create: jest.fn(),
  },
  notificationRepository: {
    update: jest.fn(),
  },
}));

import {
    aiPredictionRepository,
    notificationRepository,
    settingsRepository,
} from '../../../database/repositories';

const mockedSettingsGet = settingsRepository.get as jest.MockedFunction<
  typeof settingsRepository.get
>;
const mockedAiCreate = aiPredictionRepository.create as jest.MockedFunction<
  typeof aiPredictionRepository.create
>;
const mockedNotifUpdate = notificationRepository.update as jest.MockedFunction<
  typeof notificationRepository.update
>;

const KEYWORD_DICTIONARY = {
  important: ['urgent', 'critical'],
  work: ['meeting', 'deadline'],
  social: ['party', 'friend'],
  spam: ['win', 'prize'],
  promotion: ['sale', 'discount'],
  emergency: ['alert', 'danger'],
};

describe('ClassificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSettingsGet.mockResolvedValue(JSON.stringify(KEYWORD_DICTIONARY));
    mockedAiCreate.mockResolvedValue({
      id: 'pred-1',
      notificationId: 'notif-1',
      predictedCategory: 'work',
      confidence: 0.5,
      matchedKeywords: '["meeting"]',
      createdAt: new Date(),
    });
    mockedNotifUpdate.mockResolvedValue({} as any);
    // Ensure service is stopped before each test
    classificationService.stop();
  });

  afterEach(() => {
    classificationService.stop();
  });

  it('should subscribe to notification:parsed event on start', () => {
    classificationService.start();

    // Verify the event bus has a listener for the parsed event
    expect(eventBus.listenerCount(AppEvents.NOTIFICATION_PARSED)).toBe(1);
  });

  it('should unsubscribe from events on stop', () => {
    classificationService.start();
    classificationService.stop();

    expect(eventBus.listenerCount(AppEvents.NOTIFICATION_PARSED)).toBe(0);
  });

  it('should not add duplicate subscriptions if start is called twice', () => {
    classificationService.start();
    classificationService.start();

    expect(eventBus.listenerCount(AppEvents.NOTIFICATION_PARSED)).toBe(1);
  });

  it('should classify notification and store prediction when event is received', async () => {
    classificationService.start();

    const payload = {
      id: 'notif-1',
      title: 'Team meeting at 3pm',
      content: null,
      sender: null,
    };

    eventBus.emit(AppEvents.NOTIFICATION_PARSED, payload);

    // Wait for async handler to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockedAiCreate).toHaveBeenCalledWith({
      notificationId: 'notif-1',
      predictedCategory: 'work',
      confidence: expect.any(Number),
      matchedKeywords: expect.any(String),
    });
  });

  it('should update notification category after classification', async () => {
    classificationService.start();

    const payload = {
      id: 'notif-2',
      title: 'Urgent: server down',
      content: null,
      sender: null,
    };

    eventBus.emit(AppEvents.NOTIFICATION_PARSED, payload);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockedNotifUpdate).toHaveBeenCalledWith('notif-2', {
      category: 'important',
    });
  });

  it('should emit notification:classified event after processing', async () => {
    classificationService.start();

    const classifiedHandler = jest.fn();
    const unsub = eventBus.on(AppEvents.NOTIFICATION_CLASSIFIED, classifiedHandler);

    const payload = {
      id: 'notif-3',
      title: 'Big sale this weekend',
      content: null,
      sender: null,
    };

    eventBus.emit(AppEvents.NOTIFICATION_PARSED, payload);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(classifiedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'notif-3',
        notificationId: 'notif-3',
        category: 'promotion',
        confidence: expect.any(Number),
        matchedKeywords: expect.arrayContaining(['sale']),
      })
    );

    unsub();
  });

  it('should handle errors gracefully without crashing', async () => {
    mockedAiCreate.mockRejectedValue(new Error('DB error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    classificationService.start();

    const payload = {
      id: 'notif-4',
      title: 'Urgent message',
      content: null,
      sender: null,
    };

    eventBus.emit(AppEvents.NOTIFICATION_PARSED, payload);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ClassificationService] Failed to classify notification:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should not process events after stop is called', async () => {
    classificationService.start();
    classificationService.stop();

    const payload = {
      id: 'notif-5',
      title: 'Meeting tomorrow',
      content: null,
      sender: null,
    };

    eventBus.emit(AppEvents.NOTIFICATION_PARSED, payload);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockedAiCreate).not.toHaveBeenCalled();
  });
});
