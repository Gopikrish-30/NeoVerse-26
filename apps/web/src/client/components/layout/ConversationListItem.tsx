import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Task } from '@navigator_ai/agent-core/common';
import { cn } from '@/lib/utils';
import { X, SpinnerGap, Check } from '@phosphor-icons/react';
import { useTaskStore } from '@/stores/taskStore';
import { STATUS_COLORS, extractDomains } from '@/lib/task-utils';

interface ConversationListItemProps {
  task: Task;
}

export function ConversationListItem({ task }: ConversationListItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('sidebar');
  const isActive = location.pathname === `/execution/${task.id}`;
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const domains = useMemo(() => extractDomains(task), [task]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (confirmingDelete) {
      setConfirmingDelete(false);
      return;
    }
    navigate(`/execution/${task.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(true);
    // Auto-cancel after 3 seconds
    confirmTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(false);

    await deleteTask(task.id);

    if (isActive) {
      navigate('/');
    }
  };

  const statusColor = STATUS_COLORS[task.status] || 'bg-muted-foreground';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      title={task.summary || task.prompt}
      className={cn(
        'w-full text-left p-2 rounded-lg text-xs font-medium transition-all duration-200',
        'text-foreground hover:bg-primary/5 hover:text-foreground',
        'flex items-center gap-3 group relative cursor-pointer',
        isActive && 'bg-primary/8 text-foreground border-l-2 border-primary',
      )}
    >
      <span className="flex items-center justify-center shrink-0 w-3 h-3">
        {task.status === 'running' || task.status === 'waiting_permission' ? (
          <SpinnerGap className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : (
          <span className={cn('w-2 h-2 rounded-full', statusColor)} />
        )}
      </span>
      <span className="block truncate flex-1 tracking-[0.18px]">{task.summary || task.prompt}</span>
      <span className="relative flex items-center shrink-0 h-5">
        {domains.length > 0 && (
          <span className="flex items-center group-hover:opacity-0 transition-opacity duration-200">
            {domains.map((domain, i) => (
              <span
                key={domain}
                className={cn(
                  'flex items-center p-0.5 rounded-full bg-card shrink-0 relative',
                  i > 0 && '-ml-1',
                  i === 0 && 'z-30',
                  i === 1 && 'z-20',
                  i === 2 && 'z-10',
                )}
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                  alt={domain}
                  className="w-3 h-3 rounded-full"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </span>
            ))}
          </span>
        )}
        {confirmingDelete ? (
          <button
            onClick={handleConfirmDelete}
            title={t('confirmDelete')}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2',
              'opacity-100 pointer-events-auto',
              'p-1 rounded bg-red-100 dark:bg-red-900/30',
              'text-red-600 dark:text-red-400',
              'animate-pulse',
            )}
            aria-label={t('confirmDelete')}
          >
            <Check className="h-3 w-3" weight="bold" />
          </button>
        ) : (
          <button
            onClick={handleDeleteClick}
            title={t('deleteTask')}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2',
              'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto',
              'transition-opacity duration-200',
              'p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20',
              'text-zinc-400 hover:text-red-600 dark:hover:text-red-400',
            )}
            aria-label={t('deleteTask')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    </div>
  );
}

export default ConversationListItem;
