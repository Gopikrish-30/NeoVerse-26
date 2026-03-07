import { BrowserWindow } from 'electron';
import type { TaskConfig, TaskMessage, TaskResult, TaskStatus, TodoItem } from '@navigator_ai/agent-core';
import { createTaskId, createMessageId, validateTaskConfig, mapResultToStatus } from '@navigator_ai/agent-core';
import { getTaskManager } from '../opencode';
import { getStorage } from '../store/storage';
import { resolvePermission } from '../permission-api';
import type { TelegramBot } from './telegram-bot';
import {
  formatTaskStarted,
  formatTaskProgress,
  formatTaskComplete,
  formatTaskError,
  formatMessages,
  formatTodos,
  formatPermissionRequest,
  formatTaskList,
} from './telegram-formatter';

interface ActiveTelegramTask {
  taskId: string;
  chatId: number;
  statusMessageId?: number;
  lastUpdateTime: number;
}

const UPDATE_THROTTLE_MS = 2000; // Don't send Telegram updates more often than every 2s

export class TelegramBridge {
  private activeTasks = new Map<string, ActiveTelegramTask>();
  private bot: TelegramBot | null = null;

  setBot(bot: TelegramBot): void {
    this.bot = bot;
  }

  async startTask(chatId: number, prompt: string): Promise<string> {
    const storage = getStorage();
    const taskManager = getTaskManager();

    if (!storage.hasReadyProvider()) {
      throw new Error('No AI provider is configured. Please set up a provider in Navigator settings first.');
    }

    const config: TaskConfig = { prompt };
    const validatedConfig = validateTaskConfig(config);

    const activeModel = storage.getActiveProviderModel();
    const selectedModel = activeModel || storage.getSelectedModel();
    if (selectedModel?.model) {
      validatedConfig.modelId = selectedModel.model;
    }

    const taskId = createTaskId();

    const telegramTask: ActiveTelegramTask = {
      taskId,
      chatId,
      lastUpdateTime: 0,
    };
    this.activeTasks.set(taskId, telegramTask);

    // Send initial message to Telegram
    const startMsg = formatTaskStarted(taskId, prompt);
    const sentMessage = await this.bot?.sendHtml(chatId, startMsg);