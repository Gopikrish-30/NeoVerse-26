import { describe, it, expect } from 'vitest';
import { maskPii } from '../../../src/utils/mask-pii.js';

describe('maskPii', () => {
  describe('email addresses', () => {
    it('should mask standard email addresses', () => {
      expect(maskPii('Contact me at john.doe@example.com please')).toBe(
        'Contact me at [EMAIL] please',
      );
    });

    it('should mask multiple emails', () => {
      expect(maskPii('Send to alice@foo.org and bob@bar.co.uk')).toBe(
        'Send to [EMAIL] and [EMAIL]',
      );
    });

    it('should mask emails with plus addressing', () => {
      expect(maskPii('user+tag@gmail.com')).toBe('[EMAIL]');
    });

    it('should mask emails with dots and dashes', () => {
      expect(maskPii('first.last-name@sub.domain.com')).toBe('[EMAIL]');
    });
  });

  describe('phone numbers', () => {
    it('should mask US phone numbers with dashes', () => {
      expect(maskPii('Call me at 234-567-8901')).toBe('Call me at [PHONE]');
    });

    it('should mask international phone numbers', () => {
      expect(maskPii('My number is +1-234-567-8901')).toBe('My number is [PHONE]');
    });

    it('should mask phone numbers with parentheses', () => {
      expect(maskPii('Phone: (234) 567-8901')).toBe('Phone: [PHONE]');
    });

    it('should mask phone numbers with spaces', () => {
      expect(maskPii('Reach me at +91 98765 43210')).toBe('Reach me at [PHONE]');
    });

    it('should mask UK mobile numbers', () => {
      expect(maskPii('UK mobile: +44 7911 123456')).toBe('UK mobile: [PHONE]');
    });

    it('should not mask short number sequences', () => {
      const text = 'Error code 404';
      expect(maskPii(text)).toBe(text);
    });

    it('should not mask 5-digit numbers (e.g., counts)', () => {
      const text = 'Found 12345 results';
      expect(maskPii(text)).toBe(text);
    });
  });

  describe('keyword-context phone numbers', () => {
    it('should mask short numbers when preceded by phone keyword', () => {
      expect(maskPii('phone number is 123567')).toBe('phone number is [PHONE]');
    });

    it('should mask digits followed by phone keyword', () => {
      expect(maskPii('123567 is phone number')).toBe('[PHONE] is phone number');
    });

    it('should mask with mobile keyword', () => {
      expect(maskPii('my mobile number 987654')).toBe('my mobile number [PHONE]');
    });

    it('should mask with call keyword', () => {
      expect(maskPii('call me at 555123')).toBe('call me at [PHONE]');
    });

    it('should mask with contact keyword', () => {
      expect(maskPii('contact: 9876543')).toBe('contact: [PHONE]');
    });

    it('should mask with whatsapp keyword', () => {
      expect(maskPii('whatsapp 9876543210')).toBe('whatsapp [PHONE]');
    });

    it('should mask digits after colon with phone keyword', () => {
      expect(maskPii('phone: 123456')).toBe('phone: [PHONE]');
    });

    it('should mask number described as my number', () => {
      expect(maskPii('123456 is my phone number')).toBe('[PHONE] is my phone number');
    });

    it('should not mask random numbers without keywords', () => {
      const text = 'order 123456 confirmed';
      expect(maskPii(text)).toBe(text);
    });
  });

  describe('OTP / verification codes', () => {
    it('should mask OTP codes', () => {
      expect(maskPii('Your OTP: 847293')).toBe('Your OTP: [OTP]');
    });

    it('should mask verification codes', () => {
      expect(maskPii('Verification code: 1234')).toBe('Verification code: [OTP]');
    });

    it('should mask PIN codes', () => {
      expect(maskPii('Your pin code 5678')).toBe('Your pin code [OTP]');
    });

    it('should mask one-time passwords', () => {
      expect(maskPii('one-time code: 99887766')).toBe('one-time code: [OTP]');
    });

    it('should mask MFA codes', () => {
      expect(maskPii('MFA code: 123456')).toBe('MFA code: [OTP]');
    });

    it('should mask 2FA codes', () => {
      expect(maskPii('2FA code 654321')).toBe('2FA code [OTP]');
    });

    it('should mask authentication codes', () => {
      expect(maskPii('authentication code: 456789')).toBe('authentication code: [OTP]');
    });

    it('should not mask standalone digit sequences without keywords', () => {
      const text = 'The answer is 123456';
      expect(maskPii(text)).toBe(text);
    });
  });

  describe('credit card numbers', () => {
    it('should mask valid Visa card numbers', () => {
      // 4111111111111111 passes Luhn check
      expect(maskPii('Card: 4111111111111111')).toBe('Card: [CARD]');
    });

    it('should mask card numbers with spaces', () => {
      expect(maskPii('Card: 4111 1111 1111 1111')).toBe('Card: [CARD]');
    });

    it('should mask card numbers with dashes', () => {
      expect(maskPii('Card: 4111-1111-1111-1111')).toBe('Card: [CARD]');
    });

    it('should not mask numbers that fail Luhn check', () => {
      // 1234567890123456 does not pass Luhn
      const text = 'ID: 1234567890123456';
      expect(maskPii(text)).toBe(text);
    });
  });

  describe('SSN / national IDs', () => {
    it('should mask US SSN format', () => {
      expect(maskPii('SSN: 123-45-6789')).toBe('SSN: [SSN]');
    });

    it('should mask Aadhaar numbers', () => {
      expect(maskPii('Aadhaar: 1234 5678 9012')).toBe('Aadhaar: [SSN]');
    });
  });

  describe('street addresses', () => {
    it('should mask US street addresses', () => {
      expect(maskPii('I live at 123 Main Street')).toBe('I live at [ADDRESS]');
    });

    it('should mask addresses with abbreviations', () => {
      expect(maskPii('Office: 456 Oak Ave')).toBe('Office: [ADDRESS]');
    });

    it('should mask boulevard addresses', () => {
      expect(maskPii('Located at 789 Sunset Blvd')).toBe('Located at [ADDRESS]');
    });

    it('should mask drive addresses', () => {
      expect(maskPii('Send to 10 Elm Drive')).toBe('Send to [ADDRESS]');
    });
  });

  describe('UK postcodes', () => {
    it('should mask standard UK postcodes', () => {
      expect(maskPii('Postcode: SW1A 1AA')).toBe('Postcode: [ADDRESS]');
    });

    it('should mask compact UK postcodes', () => {
      expect(maskPii('Code: EC1A1BB')).toBe('Code: [ADDRESS]');
    });
  });

  describe('mixed content', () => {
    it('should mask multiple PII types in one string', () => {
      const input = 'Email: user@test.com, Phone: +1-555-123-4567, SSN: 123-45-6789';
      const result = maskPii(input);
      expect(result).toContain('[EMAIL]');
      expect(result).toContain('[PHONE]');
      expect(result).toContain('[SSN]');
      expect(result).not.toContain('user@test.com');
      expect(result).not.toContain('555-123-4567');
      expect(result).not.toContain('123-45-6789');
    });

    it('should handle text with no PII', () => {
      const text = 'Hello, this is a regular message about coding.';
      expect(maskPii(text)).toBe(text);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(maskPii('')).toBe('');
    });

    it('should handle null-ish input gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(maskPii(null as any)).toBe(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(maskPii(undefined as any)).toBe(undefined);
    });

    it('should not corrupt normal code content', () => {
      const code = 'function add(a: number, b: number) { return a + b; }';
      expect(maskPii(code)).toBe(code);
    });

    it('should not mask file paths', () => {
      const path = '/usr/local/bin/node';
      expect(maskPii(path)).toBe(path);
    });

    it('should not mask UUIDs', () => {
      const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(maskPii(uuid)).toBe(uuid);
    });

    it('should not mask ISO timestamps', () => {
      const ts = '2026-03-07T10:30:00.000Z';
      expect(maskPii(ts)).toBe(ts);
    });

    it('should preserve surrounding whitespace and formatting', () => {
      const input = '  Contact: user@example.com  \n  Done.  ';
      expect(maskPii(input)).toBe('  Contact: [EMAIL]  \n  Done.  ');
    });
  });
});
