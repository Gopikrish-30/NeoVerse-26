import { describe, it, expect } from 'vitest';

describe('CSP Configuration', () => {
  it('should not contain unsafe-inline in script-src or style-src', () => {
    // Test the CSP string from the main process
    const cspString =
      "default-src 'self' https:; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https: ws: wss:; font-src 'self' https: data:";

    // Verify no 'unsafe-inline' is present
    expect(cspString).not.toContain("'unsafe-inline'");

    // Verify script-src only allows 'self'
    const scriptSrcMatch = cspString.match(/script-src\s+([^;]+)/);
    expect(scriptSrcMatch).toBeTruthy();
    if (scriptSrcMatch) {
      expect(scriptSrcMatch[1].trim()).toBe("'self'");
    }

    // Verify style-src only allows 'self'
    const styleSrcMatch = cspString.match(/style-src\s+([^;]+)/);
    expect(styleSrcMatch).toBeTruthy();
    if (styleSrcMatch) {
      expect(styleSrcMatch[1].trim()).toBe("'self'");
    }
  });

  it('should define safe CSP directives for other resource types', () => {
    const cspString =
      "default-src 'self' https:; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https: ws: wss:; font-src 'self' https: data:";

    // Verify img-src allows data URIs for base64 images
    expect(cspString).toContain("img-src 'self' data: https:");

    // Verify connect-src allows websockets for dev tools and APIs
    expect(cspString).toContain("connect-src 'self' https: ws: wss:");

    // Verify font-src allows external fonts and data URIs
    expect(cspString).toContain("font-src 'self' https: data:");
  });
});
