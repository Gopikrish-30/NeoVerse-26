import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '@/stores/taskStore';
import { getNavigatorApp } from '@/lib/navigator-app';
import { staggerContainer } from '@/lib/animations';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConversationListItem from './ConversationListItem';
import SettingsDialog from './SettingsDialog';
import { Gear, ChatText, MagnifyingGlass } from '@phosphor-icons/react';

export default function Sidebar() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const { tasks, loadTasks, updateTaskStatus, addTaskUpdate, openLauncher } = useTaskStore();
  const navigatorApp = getNavigatorApp();
  const { t } = useTranslation('sidebar');

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Subscribe to task status changes (queued -> running) and task updates (complete/error)
  // This ensures sidebar always reflects current task status
  useEffect(() => {
    const unsubscribeStatusChange = navigatorApp.onTaskStatusChange?.((data) => {
      updateTaskStatus(data.taskId, data.status);
    });

    const unsubscribeTaskUpdate = navigatorApp.onTaskUpdate((event) => {
      addTaskUpdate(event);
    });

    return () => {
      unsubscribeStatusChange?.();
      unsubscribeTaskUpdate();
    };
  }, [updateTaskStatus, addTaskUpdate, navigatorApp]);

  const handleNewConversation = () => {
    navigate('/');
  };

  return (
    <>
      <div className="flex h-screen w-[260px] flex-col border-r border-border bg-card/60 backdrop-blur-sm pt-12">
        {/* Action Buttons */}
        <div className="px-3 py-3 border-b border-border flex gap-2">
          <Button
            data-testid="sidebar-new-task-button"
            onClick={handleNewConversation}
            variant="default"
            size="sm"
            className="flex-1 justify-center gap-2"
            title={t('newTask')}
          >
            <ChatText className="h-4 w-4" />
            {t('newTask')}
          </Button>
          <Button
            onClick={openLauncher}
            variant="outline"
            size="sm"
            className="px-2"
            title={t('searchTasks')}
          >
            <MagnifyingGlass className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <AnimatePresence mode="wait">
              {tasks.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  {t('noConversations')}
                </motion.div>
              ) : (
                <motion.div
                  key="task-list"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-1"
                >
                  {tasks.map((task) => (
                    <ConversationListItem key={task.id} task={task} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Bottom Section - Logo and Settings */}
        <div className="px-3 py-4 border-t border-border flex items-center justify-between">
          {/* App Name - Bottom Left */}
          <div className="flex items-center">
            <span className="text-sm font-semibold text-primary pl-1.5 tracking-tight">
              Navigator
            </span>
          </div>

          {/* Settings Button - Bottom Right */}
          <Button
            data-testid="sidebar-settings-button"
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            title={t('settings')}
          >
            <Gear className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
