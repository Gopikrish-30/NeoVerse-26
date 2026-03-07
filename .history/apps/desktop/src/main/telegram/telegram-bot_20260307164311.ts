import { Bot, InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import type { TelegramBridge } from './telegram-bridge';
import { validatePairingPin } from './telegram-auth';
import { formatWelcome, formatHelp } from './telegram-formatter';
import type { TelegramPairing } from './telegram-auth';

export class TelegramBot {
  private bot: Bot;
  private bridge: TelegramBridge;
  private pairing: TelegramPairing | null;
  private onPairingChange: (pairing: TelegramPairing | null) => void;
  private isRunning = false;

  constructor(
    token: string,
    bridge: TelegramBridge,
    pairing: TelegramPairing | null,
    onPairingChange: (pairing: TelegramPairing | null) => void,
  ) {
    this.bot = new Bot(token);
    this.bridge = bridge;
    this.pairing = pairing;
    this.onPairingChange = onPairingChange;

    bridge.setBot(this);
    this.registerHandlers();
  }

  private isAuthorized(ctx: Context): boolean {
    if (!this.pairing) {
      return false;
    }
    return ctx.chat?.id === this.pairing.chatId;
  }

  private registerHandlers(): void {
    // /start — welcome or pairing
    this.bot.command('start', async (ctx) => {
      const args = ctx.match?.trim();

      // If already paired to this chat, show welcome
      if (this.isAuthorized(ctx)) {
        await ctx.reply(formatWelcome(), { parse_mode: 'HTML' });
        return;
      }

      // Try pairing with PIN
      if (args && validatePairingPin(args)) {
        const newPairing: TelegramPairing = {
          chatId: ctx.chat.id,
          username: ctx.from?.username,
          pairedAt: new Date().toISOString(),
        };
        this.pairing = newPairing;
        this.onPairingChange(newPairing);
        await ctx.reply(
          '✅ <b>Successfully paired!</b>\n\nThis Telegram account is now linked to your Navigator instance.\n\n' +
            formatWelcome(),
          { parse_mode: 'HTML' },
        );
        return;
      }
