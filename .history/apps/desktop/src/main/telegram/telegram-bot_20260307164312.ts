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

      // Not paired — show instructions
      await ctx.reply(
        '🔑 <b>Pairing Required</b>\n\n' +
          'To link this bot to your Navigator app:\n' +
          '1. Open Navigator Settings → Telegram\n' +
          '2. Click "Generate Pairing PIN"\n' +
          '3. Send: <code>/start YOUR_PIN</code>',
        { parse_mode: 'HTML' },
      );
    });

    // /help
    this.bot.command('help', async (ctx) => {
      if (!this.isAuthorized(ctx)) {
        await ctx.reply('🔑 Please pair first. Send /start for instructions.');
        return;
      }
      await ctx.reply(formatHelp(), { parse_mode: 'HTML' });
    });

    // /task <prompt>
    this.bot.command('task', async (ctx) => {
      if (!this.isAuthorized(ctx)) {
        await ctx.reply('🔑 Please pair first. Send /start for instructions.');
        return;
      }

      const prompt = ctx.match?.trim();
      if (!prompt) {
        await ctx.reply(
          '❌ Please provide a prompt. Example: <code>/task Build a REST API</code>',
          {
            parse_mode: 'HTML',
          },
        );
        return;
      }

      try {
        await this.bridge.startTask(ctx.chat.id, prompt);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await ctx.reply(`❌ Failed to start task: ${message}`);
      }
    });

    // /status [taskId]
    this.bot.command('status', async (ctx) => {
      if (!this.isAuthorized(ctx)) {
        await ctx.reply('🔑 Please pair first. Send /start for instructions.');
        return;
      }

      const shortId = ctx.match?.trim();
      if (shortId) {
        const fullId = this.bridge.resolveTaskId(shortId);
        if (!fullId) {
          await ctx.reply(`❌ Task not found: <code>${shortId}</code>`, { parse_mode: 'HTML' });
          return;
        }
        const status = await this.bridge.getTaskStatus(fullId);
        await ctx.reply(status, { parse_mode: 'HTML' });
      } else {
        const status = await this.bridge.getRecentTasks();
        await ctx.reply(status, { parse_mode: 'HTML' });
      }
    });

    // /cancel <taskId>
    this.bot.command('cancel', async (ctx) => {
      if (!this.isAuthorized(ctx)) {
        await ctx.reply('🔑 Please pair first. Send /start for instructions.');
        return;
      }

      const shortId = ctx.match?.trim();
      if (!shortId) {
        await ctx.reply('❌ Please provide a task ID. Example: <code>/cancel abc12345</code>', {
          parse_mode: 'HTML',
        });
        return;
      }

      const fullId = this.bridge.resolveTaskId(shortId);
      if (!fullId) {
        await ctx.reply(`❌ Task not found: <code>${shortId}</code>`, { parse_mode: 'HTML' });
        return;
      }

      const cancelled = await this.bridge.cancelTask(fullId);
      if (cancelled) {
        await ctx.reply(`✅ Task <code>${shortId}</code> cancelled.`, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(`⚠️ Task <code>${shortId}</code> is not running or queued.`, {
          parse_mode: 'HTML',
        });
      }
    });

    // /unpair — disconnect this Telegram account
    this.bot.command('unpair', async (ctx) => {
      if (!this.isAuthorized(ctx)) {
        await ctx.reply('🔑 Not paired to any Navigator instance.');
        return;
      }

      this.pairing = null;
      this.onPairingChange(null);
      await ctx.reply('🔓 <b>Unpaired.</b> This chat is no longer linked to Navigator.', {
        parse_mode: 'HTML',
      });
    });

    // Handle callback queries for permission inline buttons
    this.bot.on('callback_query:data', async (ctx) => {
      if (!this.pairing || ctx.chat?.id !== this.pairing.chatId) {
        await ctx.answerCallbackQuery({ text: 'Not authorized.' });
        return;
      }

      const data = ctx.callbackQuery.data;

      if (data.startsWith('perm_allow:') || data.startsWith('perm_deny:')) {
        const allowed = data.startsWith('perm_allow:');
        const requestId = data.split(':')[1];

        try {
          await this.bridge.respondToPermission(requestId, allowed);
          await ctx.answerCallbackQuery({
            text: allowed ? '✅ Permission granted' : '❌ Permission denied',
          });
          await ctx.editMessageReplyMarkup({ reply_markup: undefined });
          const statusText = allowed
            ? '✅ Permission <b>granted</b>'
            : '❌ Permission <b>denied</b>';
          await ctx.editMessageText((ctx.callbackQuery.message?.text || '') + `\n\n${statusText}`, {
            parse_mode: 'HTML',
          });
        } catch (error) {
          await ctx.answerCallbackQuery({ text: 'Failed to respond to permission.' });
        }
      }
    });

    // Plain text messages — treat as task prompts
    this.bot.on('message:text', async (ctx) => {
      if (!this.isAuthorized(ctx)) {
        await ctx.reply('🔑 Please pair first. Send /start for instructions.');
        return;
      }

      const prompt = ctx.message.text.trim();
      if (!prompt) {
        return;
      }

      try {
        await this.bridge.startTask(ctx.chat.id, prompt);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await ctx.reply(`❌ Failed to start task: ${message}`);
      }
    });
  }

  async sendHtml(chatId: number, text: string) {
    return this.bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  async sendPermissionRequest(chatId: number, text: string, requestId: string) {
    const keyboard = new InlineKeyboard()
      .text('✅ Allow', `perm_allow:${requestId}`)
      .text('❌ Deny', `perm_deny:${requestId}`);

    return this.bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('[TelegramBot] Starting long polling...');
    this.isRunning = true;

    // Set bot commands for menu
    await this.bot.api.setMyCommands([
      { command: 'task', description: 'Start a new task with a prompt' },
      { command: 'status', description: 'View recent tasks' },
      { command: 'cancel', description: 'Cancel a running task' },
      { command: 'help', description: 'Show help' },
      { command: 'unpair', description: 'Disconnect from Navigator' },
    ]);

    // Use long polling (no webhook needed, works behind NAT)
    this.bot.start({
      onStart: () => {
        console.log('[TelegramBot] Bot is running');
      },
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    console.log('[TelegramBot] Stopping...');
    this.isRunning = false;
    await this.bot.stop();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  updatePairing(pairing: TelegramPairing | null): void {
    this.pairing = pairing;
  }

  async getBotInfo(): Promise<{ username: string; firstName: string } | null> {
    try {
      const me = await this.bot.api.getMe();
      return { username: me.username, firstName: me.first_name };
    } catch {
      return null;
    }
  }
}
