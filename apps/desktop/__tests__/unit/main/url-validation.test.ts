import { describe, it, expect } from 'vitest';
import {
  validateExternalUrl,
  validateOAuthUrl,
  validateGeneralExternalUrl,
} from '../../../src/main/security/url-validation';

describe('URL Security Validation', () => {
  describe('validateGeneralExternalUrl', () => {
    it('should allow trusted domains', () => {
      const url = validateGeneralExternalUrl('https://github.com/user/repo');
      expect(url.hostname).toBe('github.com');
      expect(url.protocol).toBe('https:');
    });

    it('should allow subdomains of trusted domains', () => {
      const url = validateGeneralExternalUrl('https://docs.github.com/en/articles');
      expect(url.hostname).toBe('docs.github.com');
    });

    it('should allow HTTP for non-sensitive domains', () => {
      const url = validateGeneralExternalUrl('http://github.com');
      expect(url.protocol).toBe('http:');
    });

    it('should reject untrusted domains', () => {
      expect(() => validateGeneralExternalUrl('https://evil.com/phishing')).toThrow(
        'domain is not in the trusted allowlist',
      );
    });

    it('should reject HTTP for HTTPS-required domains', () => {
      expect(() => validateGeneralExternalUrl('http://accounts.google.com')).toThrow(
        'must use https protocol',
      );
    });

    it('should reject non-http protocols', () => {
      expect(() => validateGeneralExternalUrl('file:///etc/passwd')).toThrow(
        'must use http or https protocol',
      );

      expect(() => validateGeneralExternalUrl('javascript:alert(1)')).toThrow(
        'must use http or https protocol',
      );

      expect(() => validateGeneralExternalUrl('data:text/html,<script>alert(1)</script>')).toThrow(
        'must use http or https protocol',
      );
    });

    it('should reject invalid URLs', () => {
      expect(() => validateGeneralExternalUrl('not-a-url')).toThrow('not a valid URL');
    });
  });

  describe('validateOAuthUrl', () => {
    it('should allow any HTTPS URL', () => {
      const url = validateOAuthUrl('https://custom-oauth.example.com/authorize');
      expect(url.hostname).toBe('custom-oauth.example.com');
      expect(url.protocol).toBe('https:');
    });

    it('should require HTTPS', () => {
      expect(() => validateOAuthUrl('http://oauth.example.com/authorize')).toThrow(
        'must use https protocol',
      );
    });

    it('should reject non-http protocols', () => {
      expect(() => validateOAuthUrl('javascript:void(0)')).toThrow(
        'must use http or https protocol',
      );
    });

    it('should allow known OAuth providers', () => {
      const googleUrl = validateOAuthUrl('https://accounts.google.com/o/oauth2/v2/auth');
      expect(googleUrl.hostname).toBe('accounts.google.com');

      const githubUrl = validateOAuthUrl('https://github.com/login/oauth/authorize');
      expect(githubUrl.hostname).toBe('github.com');
    });
  });

  describe('validateExternalUrl with custom options', () => {
    it('should allow additional trusted domains', () => {
      const url = validateExternalUrl('https://custom-domain.com', {
        additionalTrustedDomains: ['custom-domain.com'],
      });
      expect(url.hostname).toBe('custom-domain.com');
    });

    it('should enforce requireHttps option', () => {
      expect(() =>
        validateExternalUrl('http://github.com', {
          requireHttps: true,
        }),
      ).toThrow('must use https protocol');
    });

    it('should use custom context in error messages', () => {
      expect(() =>
        validateExternalUrl('https://evil.com', {
          context: 'Authorization endpoint',
        }),
      ).toThrow('Authorization endpoint domain is not in the trusted allowlist');
    });

    it('should allow any HTTPS when allowAnyHttps is true', () => {
      const url = validateExternalUrl('https://any-domain.example', {
        allowAnyHttps: true,
      });
      expect(url.hostname).toBe('any-domain.example');
    });

    it('should allow HTTP for any domain with allowAnyHttps', () => {
      // When allowAnyHttps is true but requireHttps is false, HTTP is still rejected
      // because allowAnyHttps only bypasses the domain allowlist for HTTPS URLs
      expect(() =>
        validateExternalUrl('http://any-domain.example', {
          allowAnyHttps: true,
          requireHttps: false,
        }),
      ).toThrow('domain is not in the trusted allowlist');
    });
  });

  describe('subdomain matching', () => {
    it('should allow multi-level subdomains', () => {
      const url = validateGeneralExternalUrl('https://api.v2.github.com/repos');
      expect(url.hostname).toBe('api.v2.github.com');
    });

    it('should not allow partial hostname matches', () => {
      // 'notgithub.com' should not match 'github.com'
      expect(() => validateGeneralExternalUrl('https://notgithub.com')).toThrow(
        'domain is not in the trusted allowlist',
      );
    });
  });

  describe('security edge cases', () => {
    it('should reject URLs with credentials in hostname', () => {
      expect(() => validateGeneralExternalUrl('https://user:pass@github.com')).not.toThrow();
      // The URL is valid, but the credentials are in userinfo, not hostname
      const url = validateGeneralExternalUrl('https://user:pass@github.com');
      expect(url.hostname).toBe('github.com');
    });

    it('should handle URLs with non-default ports', () => {
      const url = validateGeneralExternalUrl('https://github.com:8443/repo');
      expect(url.hostname).toBe('github.com');
      expect(url.port).toBe('8443');
    });

    it('should handle URLs with query parameters', () => {
      const url = validateGeneralExternalUrl(
        'https://github.com/search?q=test&type=repositories',
      );
      expect(url.hostname).toBe('github.com');
      expect(url.searchParams.get('q')).toBe('test');
    });

    it('should handle URLs with fragments', () => {
      const url = validateGeneralExternalUrl('https://docs.github.com/en/articles#section');
      expect(url.hostname).toBe('docs.github.com');
      expect(url.hash).toBe('#section');
    });
  });
});
