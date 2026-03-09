import { describe, expect, it } from 'vitest';

import { redactSensitiveText } from '../../../src/utils/log-redaction.js';

describe('redactSensitiveText', () => {
  it('redacts bearer authorization header values', () => {
    const input = 'Authorization: Bearer abc.def.ghi';
    const output = redactSensitiveText(input);

    expect(output).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts token-like assignment values', () => {
    const input = 'client_secret=super-secret-value refresh_token: xyz123';
    const output = redactSensitiveText(input);

    expect(output).toContain('client_secret=[REDACTED]');
    expect(output).toContain('refresh_token: [REDACTED]');
  });

  it('redacts provider environment variable values', () => {
    const input = 'OPENAI_API_KEY=sk-live-secret ANTHROPIC_API_KEY=sk-ant-secret';
    const output = redactSensitiveText(input);

    expect(output).toBe('OPENAI_API_KEY=[REDACTED] ANTHROPIC_API_KEY=[REDACTED]');
  });

  it('redacts sk-prefixed secret tokens', () => {
    const input = 'received token sk-proj-abcdefghijklmnopqrstuvwxyz1234';
    const output = redactSensitiveText(input);

    expect(output).toBe('received token [REDACTED]');
  });
});
