import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePBSubscription } from '@/hooks/usePBSubscription';
import { pb } from '@/lib/pocketbase';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '@/store/toastStore';
import { Card } from '@/components/ui/card';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { LoadMoreButton } from '@/components/ui/LoadMoreButton';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  created: string;
}

import { useNavigate } from 'react-router-dom';

export const NotificationsTab = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PER_PAGE = 20;

  const fetchNotifications = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (!user) return;
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoading(true);
    
    try {
      const result = await pb.collection('WORKFLOW_notifications').getList(pageNum, PER_PAGE, {
        filter: `user = '${sanitizeForFilter(user.id)}'`,
        sort: '-created',
        requestKey: null
      });
      
      if (isLoadMore) {
        setNotifications(prev => {
          // Avoid duplicates when fetching more
          const newItems = result.items.filter(item => !prev.some(p => p.id === item.id));
          return [...prev, ...(newItems as unknown as NotificationRecord[])];
        });
      } else {
        setNotifications(result.items as unknown as NotificationRecord[]);
      }
      
      setHasMore(pageNum < result.totalPages);
      setPage(pageNum);
    } catch (err: unknown) {
      console.error('Error fetching notifications:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, t]);

  const handleNotificationRealtime = useCallback((e: import('pocketbase').RecordSubscription<NotificationRecord>) => {
    if (e.action === 'create') {
      setNotifications(prev => [e.record, ...prev]);
      useToastStore.getState().showToast(t('notifications.newNotification') || 'New notification', 'info');
    } else if (e.action === 'update') {
      setNotifications(prev => prev.map(n => n.id === e.record.id ? e.record : n));
    } else if (e.action === 'delete') {
      setNotifications(prev => prev.filter(n => n.id !== e.record.id));
    }
  }, [t]);

  const userId = user?.id;
  const notificationOptions = useMemo(() => ({ filter: userId ? `user = "${userId}"` : '' }), [userId]);
  usePBSubscription<NotificationRecord>('WORKFLOW_notifications', '*', handleNotificationRealtime, !!user, notificationOptions);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await pb.collection('WORKFLOW_notifications').update(id, { isRead: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      // Refresh nav badge count
      useAuthStore.getState().fetchUnreadNotificationsCount();
    } catch (err) {
      console.error('Error marking as read:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadRecords = await pb.collection('WORKFLOW_notifications').getFullList({
        filter: `user = '${sanitizeForFilter(user.id)}' && isRead = false`,
        fields: 'id',
        requestKey: null
      });
      const unreadIds = unreadRecords.map(n => n.id);
      
      // Batch updates in chunks of 10 to avoid N+1 API pressure
      const CHUNK_SIZE = 10;
      for (let i = 0; i < unreadIds.length; i += CHUNK_SIZE) {
        const chunk = unreadIds.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(id => pb.collection('WORKFLOW_notifications').update(id, { isRead: true })));
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Refresh nav badge count
      useAuthStore.getState().fetchUnreadNotificationsCount();
      useToastStore.getState().showToast(t('common.success'), 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('WORKFLOW_notifications').delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="text-orange-500" size={24} />;
      case 'error': return <XCircle className="text-red-500" size={24} />;
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  const handleCardClick = (link?: string) => {
    if (link) {
      navigate(link);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardPageLayout maxWidth="max-w-[1000px]">
      <DashboardHeader 
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        icon={Bell}
        actions={
          unreadCount > 0 && (
            <Button 
              onClick={handleMarkAllAsRead}
              size="pill"
              variant="outline"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Check size={18} />
              {t('notifications.markAllAsRead')}
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <GryfSpinner size={36} label={t('common.loading')} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.length === 0 ? (
            <EmptyState 
              icon={Bell}
              title={t('notifications.noNotifications')}
            />
          ) : (
                notifications.map((n) => (
                  <Card 
                    key={n.id} 
                    className={`p-5 flex items-start gap-4 transition-all duration-300 ${!n.isRead ? 'border-brand-gold/50 shadow-md shadow-brand-gold/5 bg-brand-gold/5' : 'border-border/50 bg-secondary/10 opacity-70 hover:opacity-100'} ${n.link ? 'hover:border-brand-gold/80' : ''}`}
                  >
                    <div className="mt-1 shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div 
                      className={`flex-1 min-w-0 ${n.link ? 'cursor-pointer' : ''}`}
                      onClick={() => handleCardClick(n.link)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <h3 className={`font-semibold text-lg ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'} ${n.link ? 'hover:text-brand-gold transition-colors' : ''}`}>
                          {parseBilingualText(n.title, i18n.language)}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(n.created).toLocaleString()}
                        </span>
                      </div>
                      <p 
                        className={`text-sm ${!n.isRead ? 'text-foreground/80' : 'text-muted-foreground/80'}`}
                        dangerouslySetInnerHTML={{ __html: parseBilingualText(n.message, i18n.language) }}
                      />
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 ml-4">
                      {!n.isRead && (
                        <SimpleTooltip content={t('notifications.markAsRead')}>
                          <button 
                            onClick={() => handleMarkAsRead(n.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-background transition-colors"
                          >
                            <Check size={16} />
                          </button>
                        </SimpleTooltip>
                      )}
                      <SimpleTooltip content={t('notifications.delete')}>
                        <button 
                          onClick={() => handleDelete(n.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </SimpleTooltip>
                    </div>
                  </Card>
                ))
              )}
              
              {hasMore && notifications.length > 0 && (
                <div className="flex justify-center mt-6 mb-8">
                  <LoadMoreButton 
                    onClick={() => fetchNotifications(page + 1, true)}
                    isLoading={isLoadingMore}
                    label={t('common.loadMore')}
                  />
                </div>
              )}
            </div>
          )}
    </DashboardPageLayout>
  );
};

/** Parse bilingual text format "PL / EN" based on current language */
function parseBilingualText(text: string, currentLang: string): string {
  if (!text) return '';
  // Only split if the separator exists and produces exactly 2 non-empty parts
  const separatorIdx = text.indexOf(' / ');
  if (separatorIdx === -1) return text;
  const plPart = text.substring(0, separatorIdx).trim();
  const enPart = text.substring(separatorIdx + 3).trim();
  if (!plPart || !enPart) return text; // Malformed — return original
  return currentLang.startsWith('pl') ? plPart : enPart;
}
