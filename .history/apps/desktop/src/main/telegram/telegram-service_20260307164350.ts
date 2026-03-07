import QRCode from 'qrcode';
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