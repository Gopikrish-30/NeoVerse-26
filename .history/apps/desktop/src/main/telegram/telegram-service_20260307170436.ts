import QRCode from 'qrcode';
import { Bot } from 'grammy';
import { getStorage } from '../store/storage';
import { TelegramBot } from './telegram-bot';
import { TelegramBridge } from './telegram-bridge';
import { generatePairingPin, getCurrentPin, clearPin } from './telegram-auth';
import type { TelegramPairing } from './telegram-auth';

const TELEGRAM_TOKEN_STORAGE_KEY = 'telegram:bot-token';
const TELEGRAM_PAIRING_STORAGE_KEY = 'telegram:pairing';
const TELEGRAM_ENABLED_STORAGE_KEY = 'telegram:enabled';

export interface TelegramStatus {
  enabled: boolean;
  running: boolean;
  paired: boolean;
  botUsername?: string;
  pairedUsername?: string;
  pairedAt?: string;
}

let instance: TelegramService | null = null;

export class TelegramService {
  private bot: TelegramBot | null = null;
  private bridge: TelegramBridge;
  private botToken: string | null = null;
  private pairing: TelegramPairing | null = null;
  private enabled = false;

  constructor() {
    this.bridge = new TelegramBridge();
  }

  /**
   * Initialize from stored config. Called on app start.
   */
  async initialize(): Promise<void> {
    const storage = getStorage();

    // Load stored config
    this.botToken = storage.getApiKey(TELEGRAM_TOKEN_STORAGE_KEY);
    this.enabled = storage.getApiKey(TELEGRAM_ENABLED_STORAGE_KEY) === 'true';

    const pairingJson = storage.getApiKey(TELEGRAM_PAIRING_STORAGE_KEY);
    if (pairingJson) {
      try {
        this.pairing = JSON.parse(pairingJson) as TelegramPairing;
      } catch {
        this.pairing = null;
      }
    }

    // Auto-start if configured
    if (this.enabled && this.botToken) {
      try {
        await this.startBot();
      } catch (error) {
        console.warn('[TelegramService] Failed to auto-start bot:', error);
      }
    }
  }

  /**
   * Set the bot token. Stores encrypted, restarts bot if running.
   */
  async setBotToken(token: string): Promise<{ username: string; firstName: string }> {
    // Validate token format (numeric_id:alphanumeric_secret)
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token.trim())) {
      throw new Error('Invalid token format. A bot token looks like 123456:ABC-DEF1234...');
    }

    const trimmedToken = token.trim();

    // Validate by calling Telegram API directly (lightweight, no handlers registered)
    let me: { username: string; first_name: string };
    try {
      const tempBot = new Bot(trimmedToken);
      me = await tempBot.api.getMe();
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('[TelegramService] Token validation failed:', detail);

      if (detail.includes('401') || detail.includes('Unauthorized')) {
        throw new Error('Invalid bot token. Please check the token from @BotFather.');
      }
      if (detail.includes('ENOTFOUND') || detail.includes('ETIMEDOUT') || detail.includes('fetch failed')) {
        throw new Error('Cannot reach Telegram API (api.telegram.org). Check your internet connection or firewall.');
      }
      throw new Error(`Could not validate bot token: ${detail}`);
    }

    // Store token encrypted
    const storage = getStorage();
    storage.storeApiKey(TELEGRAM_TOKEN_STORAGE_KEY, trimmedToken);
    this.botToken = trimmedToken;

    // Restart bot if it was running
    if (this.bot?.getIsRunning()) {
      await this.stopBot();
      await this.startBot();
    }

    return { username: me.username, firstName: me.first_name };
  }

  /**
   * Remove the bot token and stop the bot.
   */
  async removeBotToken(): Promise<void> {
    await this.stopBot();
    const storage = getStorage();
    storage.deleteApiKey(TELEGRAM_TOKEN_STORAGE_KEY);
    this.botToken = null;
    this.pairing = null;
    storage.deleteApiKey(TELEGRAM_PAIRING_STORAGE_KEY);
    storage.deleteApiKey(TELEGRAM_ENABLED_STORAGE_KEY);
    this.enabled = false;
  }

  /**
   * Enable/disable the Telegram bot.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    const storage = getStorage();
    storage.storeApiKey(TELEGRAM_ENABLED_STORAGE_KEY, String(enabled));
    this.enabled = enabled;

    if (enabled && this.botToken && !this.bot?.getIsRunning()) {
      await this.startBot();
    } else if (!enabled && this.bot?.getIsRunning()) {
      await this.stopBot();
    }
  }

  /**
   * Generate a pairing PIN and return it along with a QR code data URL.
   * The QR code encodes a deep link: https://t.me/BOT_USERNAME?start=PIN
   */
  async generatePairingPinAndQR(): Promise<{
    pin: string;
    qrCodeDataUrl: string;
    botLink: string;
  }> {
    if (!this.bot) {
      throw new Error('Bot is not running. Enable the bot first.');
    }

    const info = await this.bot.getBotInfo();
    if (!info) {
      throw new Error('Could not get bot info.');
    }

    const pin = generatePairingPin();
    const botLink = `https://t.me/${info.username}?start=${pin}`;

    const qrCodeDataUrl = await QRCode.toDataURL(botLink, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return { pin, qrCodeDataUrl, botLink };
  }

  /**
   * Get the current pairing PIN if one is active.
   */
  getCurrentPin(): string | null {
    return getCurrentPin();
  }

  /**
   * Unpair the currently connected Telegram account.
   */
  unpair(): void {
    this.pairing = null;
    const storage = getStorage();
    storage.deleteApiKey(TELEGRAM_PAIRING_STORAGE_KEY);
    clearPin();

    if (this.bot) {
      this.bot.updatePairing(null);
    }
  }

  /**
   * Get the current status.
   */
  async getStatus(): Promise<TelegramStatus> {
    const status: TelegramStatus = {
      enabled: this.enabled,
      running: this.bot?.getIsRunning() ?? false,
      paired: this.pairing !== null,
    };

    if (this.bot?.getIsRunning()) {
      const info = await this.bot.getBotInfo();
      if (info) {
        status.botUsername = info.username;
      }
    }

    if (this.pairing) {
      status.pairedUsername = this.pairing.username;
      status.pairedAt = this.pairing.pairedAt;
    }

    return status;
  }

  /**
   * Check if a bot token is configured (without revealing it).
   */
  hasToken(): boolean {
    return this.botToken !== null;
  }

  private async startBot(): Promise<void> {
    if (!this.botToken) {
      throw new Error('No bot token configured.');
    }

    if (this.bot?.getIsRunning()) {
      return;
    }

    this.bot = new TelegramBot(this.botToken, this.bridge, this.pairing, (newPairing) =>
      this.handlePairingChange(newPairing),
    );

    await this.bot.start();
  }

  private async stopBot(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.bot = null;
    }
  }

  private handlePairingChange(pairing: TelegramPairing | null): void {
    this.pairing = pairing;
    const storage = getStorage();

    if (pairing) {
      storage.storeApiKey(TELEGRAM_PAIRING_STORAGE_KEY, JSON.stringify(pairing));
    } else {
      storage.deleteApiKey(TELEGRAM_PAIRING_STORAGE_KEY);
    }
  }

  dispose(): void {
    void this.stopBot();
  }
}

export function getTelegramService(): TelegramService {
  if (!instance) {
    instance = new TelegramService();
  }
  return instance;
}

export function disposeTelegramService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
