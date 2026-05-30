export interface SystemInfo {
  osName: string;
  osVersion: string;
  sdkInt: number;
  manufacturer: string;
  brand: string;
  model: string;
  fingerprint: string;
  buildId: string;
  supportedAbis: string[];
  uptimeMs: number;
  bootTimeMs: number;
}
