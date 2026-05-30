import { NativeModules, Platform } from 'react-native';

import type { SystemInfo } from './types';

const { OSInfoModule: NativeModule } = NativeModules;

class NativeOSInfoModule {
  async getSystemInfo(): Promise<SystemInfo | null> {
    if (Platform.OS !== 'android' || !NativeModule) {
      return null;
    }

    return NativeModule.getSystemInfo();
  }
}

class MockOSInfoModule {
  async getSystemInfo(): Promise<SystemInfo | null> {
    return null;
  }
}

export const osInfoModule =
  Platform.OS === 'android' && NativeModule ? new NativeOSInfoModule() : new MockOSInfoModule();
