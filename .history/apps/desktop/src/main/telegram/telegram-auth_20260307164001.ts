import crypto from 'crypto';

export interface TelegramPairing {
  chatId: number;
  username?: string;
  pairedAt: string;
}

export interface TelegramConfig {
  botToken: string;
  pairing: TelegramPairing | null;
  enabled: boolean;
}

let currentPin: string | null = null;
let pinExpiresAt: number = 0;

const PIN_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a 6-digit PIN for pairing a Telegram account.
 * PIN expires after 5 minutes.
 */
export function generatePairingPin(): string {
  currentPin = crypto.randomInt(100000, 999999).toString();
  pinExpiresAt = Date.now() + PIN_VALIDITY_MS;
  return currentPin;
}

/**
 * Validate a PIN sent from Telegram. Returns true if valid and not expired.
 * Consumes the PIN on success (single-use).
 */
export function validatePairingPin(pin: string): boolean {
  if (!currentPin || Date.now() > pinExpiresAt) {
    currentPin = null;
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const isValid =
    pin.length === currentPin.length &&
    crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(currentPin));

  if (isValid) {
    currentPin = null;
    pinExpiresAt = 0;
  }

  return isValid;
}

/**
 * Get the current active PIN (for display in UI), or null if expired/not generated.
 */
export function getCurrentPin(): string | null {
  if (!currentPin || Date.now() > pinExpiresAt) {
    currentPin = null;
    return null;
  }
  return currentPin;
}

/**
 * Clear any active PIN.
 */
export function clearPin(): void {
  currentPin = null;
  pinExpiresAt = 0;
}
