import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TaskInputBar } from '@/components/landing/TaskInputBar';
import { SettingsDialog } from '@/components/layout/SettingsDialog';
import { useTaskStore } from '@/stores/taskStore';
import { getNavigatorApp } from '@/lib/navigator-app';
import { springs } from '@/lib/animations';
import { ArrowUpLeft } from '@phosphor-icons/react';
import { hasAnyReadyProvider } from '@navigator_ai/agent-core/common';
import { PlusMenu } from '@/components/landing/PlusMenu';
import { IntegrationIcon } from '@/components/landing/IntegrationIcons';
import { useImageAttachments } from '@/hooks/useImageAttachments';
import { buildPromptWithImages } from '@/lib/image-prompt';

const USE_CASE_KEYS = [
  { key: 'calendarPrepNotes', icons: ['calendar.google.com', 'docs.google.com'] },
  { key: 'inboxPromoCleanup', icons: ['mail.google.com'] },
  { key: 'competitorPricingDeck', icons: ['slides.google.com', 'sheets.google.com'] },
  { key: 'notionApiAudit', icons: ['notion.so'] },
  { key: 'stagingVsProdVisual', icons: ['google.com'] },
  { key: 'prodBrokenLinks', icons: ['google.com'] },
  { key: 'portfolioMonitoring', icons: ['finance.yahoo.com'] },
  { key: 'jobApplicationAutomation', icons: ['linkedin.com'] },
  { key: 'eventCalendarBuilder', icons: ['eventbrite.com', 'calendar.google.com'] },
] as const;

export function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [speechConfigChanged, setSpeechConfigChanged] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'providers' | 'voice' | 'skills' | 'connectors'
  >('providers');
  const { startTask, interruptTask, isLoading, addTaskUpdate, setPermissionRequest } =
    useTaskStore();
  const navigate = useNavigate();
  const navigatorApp = useMemo(() => getNavigatorApp(), []);
  const { t } = useTranslation('home');

  const imageAttachments = useImageAttachments();

  const useCaseExamples = useMemo(() => {
    return USE_CASE_KEYS.map(({ key, icons }) => ({
      title: t(`useCases.${key}.title`),
      description: t(`useCases.${key}.description`),
      prompt: t(`useCases.${key}.prompt`),
      icons,
    }));
  }, [t]);

  useEffect(() => {
    const unsubscribeTask = navigatorApp.onTaskUpdate((event) => {
      addTaskUpdate(event);
    });

    const unsubscribePermission = navigatorApp.onPermissionRequest((request) => {
      setPermissionRequest(request);
    });

    return () => {
      unsubscribeTask();
      unsubscribePermission();
    };
  }, [addTaskUpdate, setPermissionRequest, navigatorApp]);

  const executeTask = useCallback(async () => {
    if ((!prompt.trim() && imageAttachments.attachedImages.length === 0) || isLoading) return;

    // Build the prompt, embedding image file paths if any images are attached
    const finalPrompt = await buildPromptWithImages(prompt.trim(), imageAttachments.attachedImages);

    const taskId = `task_${Date.now()}`;
    const task = await startTask({ prompt: finalPrompt, taskId });
    if (task) {
      imageAttachments.clearAll();
      navigate(`/execution/${task.id}`);
    }
  }, [prompt, imageAttachments, isLoading, startTask, navigate]);

  const handleSubmit = async () => {
    if (isLoading) {
      void interruptTask();
      return;
    }
    if (!prompt.trim() && imageAttachments.attachedImages.length === 0) return;

    const isE2EMode = await navigatorApp.isE2EMode();
    if (!isE2EMode) {
      const settings = await navigatorApp.getProviderSettings();
      if (!hasAnyReadyProvider(settings)) {
        setSettingsInitialTab('providers');
        setShowSettingsDialog(true);
        return;
      }
    }

    await executeTask();
  };

  const handleSettingsDialogChange = (open: boolean) => {
    setShowSettingsDialog(open);
    if (!open) {
      setSettingsInitialTab('providers');
      setSpeechConfigChanged((prev) => !prev);
    }
  };

  const handleOpenSpeechSettings = useCallback(() => {
    setSettingsInitialTab('voice');
    setShowSettingsDialog(true);
  }, []);

  const handleOpenModelSettings = useCallback(() => {
    setSettingsInitialTab('providers');
    setShowSettingsDialog(true);
  }, []);

  const handleApiKeySaved = async () => {
    setShowSettingsDialog(false);
    if (prompt.trim() || imageAttachments.attachedImages.length > 0) {
      await executeTask();
    }
  };

  const focusPromptTextarea = () => {
    setTimeout(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="task-input-textarea"]',
      );
      textarea?.focus();
    }, 0);
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    focusPromptTextarea();
  };

  const handleSkillSelect = (command: string) => {
    setPrompt((prev) => `${command} ${prev}`.trim());
    focusPromptTextarea();
  };

  return (
    <>
      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={handleSettingsDialogChange}
        onApiKeySaved={handleApiKeySaved}
        initialTab={settingsInitialTab}
      />

      <div className="h-full flex flex-col bg-accent relative overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[720px] mx-auto flex flex-col items-center px-6 min-h-full justify-center py-8">
            <div className="flex flex-col items-center gap-3 w-full mb-8">
              <motion.h1
                data-testid="home-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.gentle}
                className="font-apparat text-[32px] tracking-[-0.015em] text-foreground w-full text-center"
              >
                {t('title')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...springs.gentle, delay: 0.05 }}
                className="text-sm text-muted-foreground text-center max-w-md"
              >
                {t('inputPlaceholder')}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springs.gentle, delay: 0.1 }}
              className="w-full"
            >
              <TaskInputBar
                value={prompt}
                onChange={setPrompt}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                placeholder={t('inputPlaceholder')}
                typingPlaceholder={true}
                large={true}
                autoFocus={true}
                onOpenSpeechSettings={handleOpenSpeechSettings}
                onOpenModelSettings={handleOpenModelSettings}
                onSpeechConfigChanged={speechConfigChanged}
                hideModelWhenNoModel={true}
                attachedImages={imageAttachments.attachedImages}
                onRemoveImage={imageAttachments.removeImage}
                onImagePaste={imageAttachments.handlePaste}
                onImageDrop={imageAttachments.handleDrop}
                onOpenImagePicker={imageAttachments.openFilePicker}
                canAddMoreImages={imageAttachments.canAddMore}
                imageInputRef={imageAttachments.fileInputRef}
                onImageFileChange={imageAttachments.handleFileInputChange}
                toolbarLeft={
                  <PlusMenu
                    onSkillSelect={handleSkillSelect}
                    onOpenSettings={(tab) => {
                      setSettingsInitialTab(tab);
                      setShowSettingsDialog(true);
                    }}
                    disabled={isLoading}
                  />
                }
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springs.gentle, delay: 0.2 }}
              className="w-full mt-10"
            >
              <h2 className="font-apparat text-[18px] font-light tracking-[-0.36px] text-muted-foreground text-center mb-4">
                {t('examplePrompts')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {useCaseExamples.map((example, index) => (
                  <motion.button
                    key={index}
                    data-testid={`home-example-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.25 + index * 0.04 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleExampleClick(example.prompt)}
                    className="group flex flex-col justify-between rounded-xl border border-border hover:border-primary/30 active:border-primary/40 bg-card hover:shadow-card-hover p-3 text-left h-[140px] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="font-sans text-[13px] leading-[17px] tracking-[-0.2px] text-foreground whitespace-pre-line flex-1 pr-2">
                        {example.title}
                      </span>
                      <span className="shrink-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 group-active:translate-y-0 -scale-y-100 rotate-180">
                        <ArrowUpLeft className="w-3.5 h-3.5 text-primary" weight="bold" />
                      </span>
                    </div>

                    <p className="text-[12px] leading-[14px] tracking-[-0.1px] text-muted-foreground line-clamp-2">
                      {example.description}
                    </p>

                    <div className="flex items-center gap-[2px]">
                      {example.icons.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center rounded-md bg-muted/60 p-[3px] shrink-0"
                        >
                          <IntegrationIcon domain={domain} className="w-[18px] h-[18px]" />
                        </div>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-accent to-transparent" />
      </div>
    </>
  );
}
