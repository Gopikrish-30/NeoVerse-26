import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SecureStorage } from '../../src/internal/classes/SecureStorage.js';

describe('SecureStorage - OS Credential Vault Integration', () => {
  let tempDir: string;
  let storage: SecureStorage;
  let storageFilePath: string;

  // Mock OS encryption/decryption (simulating Electron safeStorage)
  const mockOSEncrypt = vi.fn((plaintext: Buffer): Buffer => {
    // Simple XOR encryption for testing (NOT secure, just for simulation)
    const key = Buffer.from('test-os-key-12345');
    const encrypted = Buffer.alloc(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
      encrypted[i] = plaintext[i] ^ key[i % key.length];
    }
    return encrypted;
  });

  const mockOSDecrypt = vi.fn((ciphertext: Buffer): Buffer => {
    // XOR again to decrypt
    const key = Buffer.from('test-os-key-12345');
    const decrypted = Buffer.alloc(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      decrypted[i] = ciphertext[i] ^ key[i % key.length];
    }
    return decrypted;
  });

  beforeEach(() => {
    // Create temp directory for test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secure-storage-test-'));
    storageFilePath = path.join(tempDir, 'test-secure-storage.json');

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('OS-encrypted storage (keyVersion 2)', () => {
    beforeEach(() => {
      storage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        osEncrypt: mockOSEncrypt,
        osDecrypt: mockOSDecrypt,
      });
    });

    it('should store and retrieve API keys using OS encryption', () => {
      storage.storeApiKey('openai', 'sk-test-key-123');

      const retrieved = storage.getApiKey('openai');
      expect(retrieved).toBe('sk-test-key-123');
      
      // Verify OS encryption was used
      expect(mockOSEncrypt).toHaveBeenCalled();
    });

    it('should migrate from machine-derived key to OS encryption on first access', () => {
      // Create storage with legacy machine-derived key
      const legacyStorage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
      });
      
      legacyStorage.storeApiKey('anthropic', 'sk-ant-legacy-key');
      legacyStorage.storeApiKey('openai', 'sk-openai-legacy-key');
      
      // Read file to verify it's using legacy format
      const fileContent = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(fileContent.keyVersion).toBeUndefined();
      expect(fileContent.masterKeyEncrypted).toBeUndefined();
      
      // Now create storage with OS encryption - should trigger migration
      const migratedStorage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        osEncrypt: mockOSEncrypt,
        osDecrypt: mockOSDecrypt,
      });

      // Access keys to trigger migration
      const retrievedAnthropic = migratedStorage.getApiKey('anthropic');
      const retrievedOpenAI = migratedStorage.getApiKey('openai');

      expect(retrievedAnthropic).toBe('sk-ant-legacy-key');
      expect(retrievedOpenAI).toBe('sk-openai-legacy-key');
      
      // Verify migration happened
      const migratedContent = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(migratedContent.keyVersion).toBe(2);
      expect(migratedContent.masterKeyEncrypted).toBeDefined();
      expect(mockOSEncrypt).toHaveBeenCalled();
    });

    it('should handle multiple keys with OS encryption', () => {
      storage.storeApiKey('openai', 'sk-openai-test');
      storage.storeApiKey('anthropic', 'sk-ant-test');
      storage.storeApiKey('google', 'sk-google-test');
      
      expect(storage.getApiKey('openai')).toBe('sk-openai-test');
      expect(storage.getApiKey('anthropic')).toBe('sk-ant-test');
      expect(storage.getApiKey('google')).toBe('sk-google-test');
    });

    it('should delete keys correctly with OS encryption', () => {
      storage.storeApiKey('openai', 'sk-test-key');
      expect(storage.getApiKey('openai')).toBe('sk-test-key');
      
      const deleted = storage.deleteApiKey('openai');
      expect(deleted).toBe(true);
      expect(storage.getApiKey('openai')).toBeNull();
    });

    it('should clear all storage including OS-encrypted master key', () => {
      storage.storeApiKey('openai', 'sk-test-key');
      storage.set('custom-key', 'custom-value');
      
      storage.clearSecureStorage();
      
      expect(storage.getApiKey('openai')).toBeNull();
      expect(storage.get('custom-key')).toBeNull();
      
      // Verify file is cleared
      const content = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(Object.keys(content.values)).toHaveLength(0);
    });

    it('should store complex JSON data (Bedrock credentials)', () => {
      const bedrockCreds = {
        accessKeyId: 'AKIATEST123',
        secretAccessKey: 'secret-key-test',
        region: 'us-east-1',
      };
      
      storage.storeBedrockCredentials(JSON.stringify(bedrockCreds));
      
      const retrieved = storage.getBedrockCredentials();
      expect(retrieved).toEqual(bedrockCreds);
    });
  });

  describe('Backward compatibility (machine-derived key)', () => {
    beforeEach(() => {
      storage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        // No OS encryption callbacks - should use machine-derived key
      });
    });

    it('should work without OS encryption callbacks (legacy mode)', () => {
      storage.storeApiKey('openai', 'sk-legacy-key');
      
      const retrieved = storage.getApiKey('openai');
      expect(retrieved).toBe('sk-legacy-key');
      
      // Verify OS encryption was not called
      expect(mockOSEncrypt).not.toHaveBeenCalled();
      expect(mockOSDecrypt).not.toHaveBeenCalled();
    });

    it('should not migrate if OS encryption is not available', () => {
      storage.storeApiKey('anthropic', 'sk-ant-legacy');
      
      const content = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(content.keyVersion).toBeUndefined();
      expect(content.masterKeyEncrypted).toBeUndefined();
    });

    it('should persist across storage instances with same machine', () => {
      storage.storeApiKey('openai', 'sk-test-persist');
      
      // Create new instance
      const newStorage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
      });
      
      expect(newStorage.getApiKey('openai')).toBe('sk-test-persist');
    });
  });

  describe('Error handling', () => {
    it('should throw error if OS decryption fails', () => {
      const failingDecrypt = vi.fn(() => {
        throw new Error('OS decryption failed');
      });
      
      storage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        osEncrypt: mockOSEncrypt,
        osDecrypt: failingDecrypt,
      });
      
      storage.storeApiKey('openai', 'sk-test-key');
      
      // Create new instance that will fail to decrypt
      const failingStorage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        osEncrypt: mockOSEncrypt,
        osDecrypt: failingDecrypt,
      });
      
      expect(() => failingStorage.getApiKey('openai')).toThrow(
        'Failed to decrypt master key from OS credential vault',
      );
    });

    it('should handle corrupted storage file gracefully', () => {
      fs.writeFileSync(storageFilePath, 'invalid json content');
      
      storage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        osEncrypt: mockOSEncrypt,
        osDecrypt: mockOSDecrypt,
      });
      
      // Should create new empty storage
      expect(storage.getApiKey('openai')).toBeNull();
      
      // Should be able to store new keys
      storage.storeApiKey('openai', 'sk-recovered-key');
      expect(storage.getApiKey('openai')).toBe('sk-recovered-key');
    });
  });

  describe('File format validation', () => {
    it('should create keyVersion 2 format when OS encryption is available', () => {
      storage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
        osEncrypt: mockOSEncrypt,
        osDecrypt: mockOSDecrypt,
      });
      
      storage.storeApiKey('openai', 'sk-test-key');
      
      const content = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(content.keyVersion).toBe(2);
      expect(content.masterKeyEncrypted).toBeDefined();
      expect(typeof content.masterKeyEncrypted).toBe('string');
    });

    it('should not have keyVersion field in legacy format', () => {
      storage = new SecureStorage({
        storagePath: tempDir,
        appId: 'test-app',
        fileName: 'test-secure-storage.json',
      });
      
      storage.storeApiKey('openai', 'sk-test-key');
      
      const content = JSON.parse(fs.readFileSync(storageFilePath, 'utf-8'));
      expect(content.keyVersion).toBeUndefined();
      expect(content.masterKeyEncrypted).toBeUndefined();
      expect(content.salt).toBeDefined(); // Legacy format has salt
    });
  });
});
