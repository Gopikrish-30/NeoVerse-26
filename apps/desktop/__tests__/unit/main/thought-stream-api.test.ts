import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import { startThoughtStreamServer, initThoughtStreamApi } from '../../../src/main/thought-stream-api';
import type { BrowserWindow } from 'electron';

const THOUGHT_STREAM_PORT = 9228;
const BASE_URL = `http://127.0.0.1:${THOUGHT_STREAM_PORT}`;

// Mock BrowserWindow
const mockMainWindow = {
  webContents: {
    send: vi.fn(),
  },
} as unknown as BrowserWindow;

describe('Thought Stream API Security', () => {
  let server: http.Server;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set auth token for tests
    process.env.LOCAL_API_AUTH_TOKEN = 'test-token-12345';
    server = startThoughtStreamServer();
    initThoughtStreamApi(mockMainWindow);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    delete process.env.LOCAL_API_AUTH_TOKEN;
  });

  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'test-task', content: 'test' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with wrong auth token', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'wrong-token',
        },
        body: JSON.stringify({ taskId: 'test-task', content: 'test' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept requests with correct auth token', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'test-token-12345',
        },
        body: JSON.stringify({ taskId: 'test-task', content: 'test' }),
      });

      // Will return 400 for unknown task, but that means auth passed
      expect(response.status).not.toBe(401);
    });
  });

  describe('Task Validation', () => {
    it('should reject requests with missing taskId', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'test-token-12345',
        },
        body: JSON.stringify({ content: 'test without taskId' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing taskId');
    });

    it('should reject requests for unknown tasks', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'test-token-12345',
        },
        body: JSON.stringify({ taskId: 'unknown-task', content: 'test' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Unknown or inactive task');
      expect(data.taskId).toBe('unknown-task');
    });

    it('should reject requests for inactive tasks', async () => {
      const response = await fetch(`${BASE_URL}/checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'test-token-12345',
        },
        body: JSON.stringify({ taskId: 'inactive-task', status: 'complete' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Unknown or inactive task');
      expect(data.taskId).toBe('inactive-task');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid JSON', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'test-token-12345',
        },
        body: 'invalid json {{{',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON');
    });

    it('should reject non-POST requests', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'GET',
        headers: {
          'X-Navigator-Auth': 'test-token-12345',
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not found');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    });
  });

  describe('Endpoint Routing', () => {
    it('should reject requests to unknown endpoints', async () => {
      const response = await fetch(`${BASE_URL}/unknown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Navigator-Auth': 'test-token-12345',
        },
        body: JSON.stringify({ taskId: 'test-task' }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not found');
    });
  });

  describe('Security Headers', () => {
    it('should set CORS headers for preflight', async () => {
      const response = await fetch(`${BASE_URL}/thought`, {
        method: 'OPTIONS',
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Navigator-Auth');
    });
  });
});
