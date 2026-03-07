/**
 * Unit tests for Navigator API library
 *
 * Tests the Electron detection and shell utilities:
 * - isRunningInElectron() detection
 * - getShellVersion() retrieval
 * - getShellPlatform() retrieval
 * - getNavigatorApp() and useNavigatorApp() API access
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original window
const originalWindow = globalThis.window;

describe('Navigator API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    (globalThis as unknown as { window: Record<string, unknown> }).window = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { window: typeof window }).window = originalWindow;
  });

  describe('isRunningInElectron', () => {
    it('should return true when navigatorAppShell.isElectron is true', async () => {
      (globalThis as unknown as { window: { navigatorAppShell: { isElectron: boolean } } }).window = {
        navigatorAppShell: { isElectron: true },
      };

      const { isRunningInElectron } = await import('@/lib/navigator-app');
      expect(isRunningInElectron()).toBe(true);
    });

    it('should return false when navigatorAppShell.isElectron is false', async () => {
      (globalThis as unknown as { window: { navigatorAppShell: { isElectron: boolean } } }).window = {
        navigatorAppShell: { isElectron: false },
      };

      const { isRunningInElectron } = await import('@/lib/navigator-app');
      expect(isRunningInElectron()).toBe(false);
    });

    it('should return false when navigatorAppShell is unavailable', async () => {
      // Test undefined, null, missing property, and empty object
      const unavailableScenarios = [
        { navigatorAppShell: undefined },
        { navigatorAppShell: null },
        { navigatorAppShell: { version: '1.0.0' } }, // missing isElectron
        {}, // no navigatorAppShell at all
      ];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { isRunningInElectron } = await import('@/lib/navigator-app');
        expect(isRunningInElectron()).toBe(false);
      }
    });

    it('should use strict equality for isElectron check', async () => {
      // Truthy but not true should return false
      (globalThis as unknown as { window: { navigatorAppShell: { isElectron: number } } }).window = {
        navigatorAppShell: { isElectron: 1 },
      };

      const { isRunningInElectron } = await import('@/lib/navigator-app');
      expect(isRunningInElectron()).toBe(false);
    });
  });

  describe('getShellVersion', () => {
    it('should return version when available', async () => {
      (globalThis as unknown as { window: { navigatorAppShell: { version: string } } }).window = {
        navigatorAppShell: { version: '1.2.3' },
      };

      const { getShellVersion } = await import('@/lib/navigator-app');
      expect(getShellVersion()).toBe('1.2.3');
    });

    it('should return null when version is unavailable', async () => {
      const unavailableScenarios = [
        { navigatorAppShell: undefined },
        { navigatorAppShell: { isElectron: true } }, // no version property
        {},
      ];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { getShellVersion } = await import('@/lib/navigator-app');
        expect(getShellVersion()).toBeNull();
      }
    });

    it('should handle various version formats', async () => {
      const versions = ['0.0.1', '1.0.0', '2.5.10', '1.0.0-beta.1', '1.0.0-rc.2'];

      for (const version of versions) {
        vi.resetModules();
        (globalThis as unknown as { window: { navigatorAppShell: { version: string } } }).window = {
          navigatorAppShell: { version },
        };
        const { getShellVersion } = await import('@/lib/navigator-app');
        expect(getShellVersion()).toBe(version);
      }
    });
  });

  describe('getShellPlatform', () => {
    it('should return platform when available', async () => {
      const platforms = ['darwin', 'linux', 'win32'];

      for (const platform of platforms) {
        vi.resetModules();
        (globalThis as unknown as { window: { navigatorAppShell: { platform: string } } }).window = {
          navigatorAppShell: { platform },
        };
        const { getShellPlatform } = await import('@/lib/navigator-app');
        expect(getShellPlatform()).toBe(platform);
      }
    });

    it('should return null when platform is unavailable', async () => {
      const unavailableScenarios = [
        { navigatorAppShell: undefined },
        { navigatorAppShell: { isElectron: true } }, // no platform property
        {},
      ];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { getShellPlatform } = await import('@/lib/navigator-app');
        expect(getShellPlatform()).toBeNull();
      }
    });
  });

  describe('getNavigatorApp', () => {
    it('should return navigatorApp API when available', async () => {
      const mockApi = {
        getVersion: vi.fn(),
        startTask: vi.fn(),
        validateBedrockCredentials: vi.fn(),
        saveBedrockCredentials: vi.fn(),
        getBedrockCredentials: vi.fn(),
      };
      (globalThis as unknown as { window: { navigatorApp: typeof mockApi } }).window = {
        navigatorApp: mockApi,
      };

      const { getNavigatorApp } = await import('@/lib/navigator-app');
      const result = getNavigatorApp();
      // getNavigatorApp returns a wrapper object with spread methods + Bedrock wrappers
      expect(result.getVersion).toBeDefined();
      expect(result.startTask).toBeDefined();
      expect(result.validateBedrockCredentials).toBeDefined();
      expect(result.saveBedrockCredentials).toBeDefined();
      expect(result.getBedrockCredentials).toBeDefined();
    });

    it('should throw when navigatorApp API is not available', async () => {
      const unavailableScenarios = [{ navigatorApp: undefined }, {}];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { getNavigatorApp } = await import('@/lib/navigator-app');
        expect(() => getNavigatorApp()).toThrow(
          'Navigator API not available - not running in Electron',
        );
      }
    });
  });

  describe('useNavigatorApp', () => {
    it('should return navigatorApp API when available', async () => {
      const mockApi = { getVersion: vi.fn(), startTask: vi.fn() };
      (globalThis as unknown as { window: { navigatorApp: typeof mockApi } }).window = {
        navigatorApp: mockApi,
      };

      const { useNavigatorApp } = await import('@/lib/navigator-app');
      expect(useNavigatorApp()).toBe(mockApi);
    });

    it('should throw when navigatorApp API is not available', async () => {
      (globalThis as unknown as { window: { navigatorApp?: unknown } }).window = {
        navigatorApp: undefined,
      };

      const { useNavigatorApp } = await import('@/lib/navigator-app');
      expect(() => useNavigatorApp()).toThrow(
        'Navigator API not available - not running in Electron',
      );
    });
  });

  describe('Complete Shell Object', () => {
    it('should recognize complete shell object with all properties', async () => {
      const completeShell = {
        version: '1.0.0',
        platform: 'darwin',
        isElectron: true as const,
      };
      (globalThis as unknown as { window: { navigatorAppShell: typeof completeShell } }).window = {
        navigatorAppShell: completeShell,
      };

      const { isRunningInElectron, getShellVersion, getShellPlatform } =
        await import('@/lib/navigator-app');

      expect(isRunningInElectron()).toBe(true);
      expect(getShellVersion()).toBe('1.0.0');
      expect(getShellPlatform()).toBe('darwin');
    });

    it('should handle partial shell object gracefully', async () => {
      const partialShell = { version: '1.0.0', isElectron: true as const };
      (globalThis as unknown as { window: { navigatorAppShell: typeof partialShell } }).window = {
        navigatorAppShell: partialShell,
      };

      const { isRunningInElectron, getShellVersion, getShellPlatform } =
        await import('@/lib/navigator-app');

      expect(isRunningInElectron()).toBe(true);
      expect(getShellVersion()).toBe('1.0.0');
      expect(getShellPlatform()).toBeNull();
    });
  });
});
